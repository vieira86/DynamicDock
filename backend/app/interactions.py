"""
Protein-ligand interaction analysis for Dynamic Dock.

Detects likely hydrogen bonds, van der Waals / hydrophobic contacts,
pi-stacking and salt bridges between a docked ligand pose and the receptor,
using simple distance (and light element-based) geometric rules with
BioPython. This is intentionally lightweight - it is not a full
physics-based interaction fingerprint like PLIP - but it's enough to drive
a 2D interaction diagram similar to what Discovery Studio / LigPlot show.
"""

import os
import subprocess
import tempfile
from typing import Dict, List, Optional

from Bio.PDB import PDBParser, NeighborSearch

from . import paths

# Distance cutoffs (Angstroms) - generous, LigPlot/PLIP-style defaults
HBOND_CUTOFF = 3.6
SALT_BRIDGE_CUTOFF = 4.0
PI_STACKING_CUTOFF = 5.0
VDW_CUTOFF = 4.5

AROMATIC_RESIDUES = {"PHE", "TYR", "TRP", "HIS"}
POSITIVE_RESIDUES = {"LYS", "ARG", "HIS"}
NEGATIVE_RESIDUES = {"ASP", "GLU"}

INTERACTION_LABELS = {
    "hydrogen_bond": "Hydrogen Bond",
    "salt_bridge": "Salt Bridge",
    "pi_stacking": "Pi-Stacking",
    "van_der_waals": "Van der Waals / Hydrophobic",
}


def _extract_ligand_pose_pdb(poses_path: str, pose_index: int) -> str:
    """Extract a single pose from a multi-model Vina PDBQT and convert it to PDB."""
    obabel = paths.find_obabel_executable()
    if not obabel:
        raise RuntimeError(
            "Open Babel ('obabel') was not found on this system. Install it to "
            "enable interaction analysis - see the README for OS-specific instructions."
        )

    ligand_pdb = tempfile.mktemp(suffix="_pose.pdb")
    cmd = [
        obabel,
        poses_path,
        "-O", ligand_pdb,
        "-f", str(pose_index),
        "-l", str(pose_index),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(ligand_pdb):
        raise RuntimeError(f"Could not extract pose {pose_index} from docking results: {result.stderr}")
    return ligand_pdb


def _classify(ligand_atom, protein_atom, distance: float) -> Optional[str]:
    l_elem = ligand_atom.element
    p_elem = protein_atom.element
    residue = protein_atom.get_parent().resname

    if l_elem in ("N", "O") and p_elem in ("N", "O") and distance <= HBOND_CUTOFF:
        return "hydrogen_bond"
    if residue in POSITIVE_RESIDUES and l_elem == "O" and distance <= SALT_BRIDGE_CUTOFF:
        return "salt_bridge"
    if residue in NEGATIVE_RESIDUES and l_elem == "N" and distance <= SALT_BRIDGE_CUTOFF:
        return "salt_bridge"
    if residue in AROMATIC_RESIDUES and l_elem == "C" and distance <= PI_STACKING_CUTOFF:
        return "pi_stacking"
    if l_elem == "C" and p_elem == "C" and distance <= VDW_CUTOFF:
        return "van_der_waals"
    return None


def analyze_docking_interactions(
    receptor_path: str, poses_path: str, pose_index: int = 1
) -> Dict:
    """
    Analyze protein-ligand interactions for one docked pose.

    receptor_path: clean, ligand-free protein PDB (as used for docking)
    poses_path: PDBQT file with one or more docked poses (Vina output)
    pose_index: 1-based pose number to analyze (1 = best affinity)
    """
    ligand_pdb = _extract_ligand_pose_pdb(poses_path, pose_index)
    try:
        parser = PDBParser(QUIET=True)
        protein_structure = parser.get_structure("protein", receptor_path)
        ligand_structure = parser.get_structure("ligand", ligand_pdb)

        protein_atoms = [a for a in protein_structure.get_atoms() if a.element != "H"]
        ligand_atoms = [a for a in ligand_structure.get_atoms() if a.element != "H"]

        if not ligand_atoms:
            raise ValueError("Could not read any ligand atoms from the docked pose.")
        if not protein_atoms:
            raise ValueError("Could not read any protein atoms from the receptor.")

        ns = NeighborSearch(protein_atoms)
        best: Dict[tuple, Dict] = {}

        for latom in ligand_atoms:
            nearby = ns.search(latom.coord, VDW_CUTOFF)
            for patom in nearby:
                distance = latom - patom
                interaction_type = _classify(latom, patom, distance)
                if not interaction_type:
                    continue

                presidue = patom.get_parent()
                pchain = presidue.get_parent()
                key = (pchain.id, presidue.id[1], interaction_type)
                candidate = {
                    "type": interaction_type,
                    "label": INTERACTION_LABELS[interaction_type],
                    "chain": pchain.id,
                    "residue": presidue.resname,
                    "res_number": presidue.id[1],
                    "distance": round(float(distance), 2),
                    "ligand_atom": latom.get_name(),
                    "protein_atom": patom.get_name(),
                }
                if key not in best or candidate["distance"] < best[key]["distance"]:
                    best[key] = candidate

        interactions = sorted(best.values(), key=lambda x: x["distance"])
        summary = {}
        for it in interactions:
            summary[it["type"]] = summary.get(it["type"], 0) + 1

        return {
            "pose_index": pose_index,
            "interactions": interactions,
            "summary": summary,
        }
    finally:
        if os.path.exists(ligand_pdb):
            os.remove(ligand_pdb)


def generate_ligand_svg(smiles: str, width: int = 380, height: int = 320) -> Optional[str]:
    """Render a 2D depiction of the ligand from its SMILES using RDKit."""
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem
        from rdkit.Chem.Draw import rdMolDraw2D

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        AllChem.Compute2DCoords(mol)
        drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
        drawer.drawOptions().clearBackground = False
        drawer.DrawMolecule(mol)
        drawer.FinishDrawing()
        return drawer.GetDrawingText()
    except Exception as e:
        print(f"Could not render ligand SVG: {e}")
        return None
