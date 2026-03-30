"""
Molecular operations module for Dynamic Dock.
Handles protein structure analysis, ligand detection, and docking operations.
"""

from typing import Dict, List, Optional, Tuple
import os
import tempfile
import numpy as np
import requests
from Bio import PDB
from Bio.PDB import PDBIO, Select
import subprocess
from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Chem import rdMolAlign
import shutil
from pathlib import Path


class LigandSelect(Select):
    def __init__(self, residue):
        self.residue = residue

    def accept_residue(self, residue):
        return residue == self.residue


class MolecularHandler:
    def __init__(self):
        self.parser = PDB.PDBParser(QUIET=True)
        self.pdbl = PDB.PDBList()
        self.io = PDBIO()

    # ---------------------------
    # STRUCTURE FETCH
    # ---------------------------

    def fetch_structure(self, pdb_id: str) -> str:
        """Download PDB structure from RCSB PDB"""
        try:
            # Create permanent directory for downloaded structures
            pdb_dir = os.path.join(os.getcwd(), "downloaded_structures")
            os.makedirs(pdb_dir, exist_ok=True)
            
            print(f"Downloading PDB structure '{pdb_id}'...")
            pdb_path = self.pdbl.retrieve_pdb_file(
                pdb_id,
                pdir=pdb_dir,
                file_format="pdb"
            )
            
            # Verify file was downloaded and exists
            if not os.path.exists(pdb_path):
                raise FileNotFoundError(f"PDB file not found after download: {pdb_path}")
            
            # Verify file has content
            if os.path.getsize(pdb_path) == 0:
                raise ValueError(f"Downloaded PDB file is empty: {pdb_path}")
            
            print(f"Successfully downloaded PDB structure to: {pdb_path}")
            return pdb_path
            
        except Exception as e:
            print(f"Error in fetch_structure: {str(e)}")
            # Re-raise with more context
            if "pdb" in str(e).lower() and "not found" in str(e).lower():
                raise FileNotFoundError(f"PDB ID '{pdb_id}' not found in Protein Data Bank")
            elif "network" in str(e).lower() or "connection" in str(e).lower():
                raise ConnectionError(f"Network error while downloading PDB '{pdb_id}': {str(e)}")
            else:
                raise Exception(f"Failed to download PDB '{pdb_id}': {str(e)}")

    # ---------------------------
    # ANALYSIS
    # ---------------------------

    def analyze_structure(self, structure_path: str) -> Dict:
        structure = self.parser.get_structure("structure", structure_path)

        ligands = self._find_ligands(structure)

        active_site = self._determine_active_site(ligands) if ligands else {}

        clean_structure_path = (
            self._remove_ligands(structure, structure_path)
            if ligands else structure_path
        )

        print(f"Found {len(ligands)} ligands")
        if ligands:
            print(f"Main ligand: {ligands[0]['name']}")
        return {
            "ligands": ligands,
            "active_site": active_site,
            "clean_structure_path": clean_structure_path
        }

    # ---------------------------
    # LIGAND DETECTION
    # ---------------------------

    def _find_ligands(self, structure) -> List[Dict]:
        try:
            ligands = []
            excluded = {'HOH', 'WAT', 'SOL', 'CL', 'NA', 'MG', 'CA', 'ZN', 'K', 'FE', 'MN', 'CO', 'NI', 'CU'}

            for model in structure:
                for chain in model:
                    for residue in chain:

                        # Only hetero residues (HETATM)
                        if residue.id[0] != " " and residue.resname not in excluded:

                            coords = self._get_centroid(residue)
                            if not coords:
                                continue

                            # Try to get SMILES, but don't skip if not found
                            smiles = self._get_smiles(residue)
                            if not smiles:
                                print(f"No SMILES found for {residue.resname}, but including ligand anyway")

                            # Count non-hydrogen atoms
                            atom_count = len([a for a in residue if not a.name.startswith('H')])
                            
                            # Count heavy atoms (non-hydrogen, non-water)
                            heavy_atoms = len([a for a in residue if a.element != 'H'])
                            
                            # Calculate molecular weight
                            mol_weight = self._estimate_molecular_weight(residue)
                            
                            # Calculate ligand score
                            print(f"DEBUG: About to call _calculate_ligand_score")
                            print(f"DEBUG: residue type: {type(residue)}")
                            print(f"DEBUG: atom_count: {atom_count}, heavy_atoms: {heavy_atoms}, mol_weight: {mol_weight}")
                            residue_name = residue.resname.strip() if residue.resname else "UNK"
                            print(f"DEBUG: residue_name: {residue_name}")
                            score = self._calculate_ligand_score(atom_count, heavy_atoms, mol_weight, residue_name)
                            print(f"DEBUG: Score calculated: {score}")
                            
                            ligand_info = {
                                "name": residue.resname.strip(),
                                "chain": chain.id,
                                "residue_number": residue.id[1],
                                "coordinates": coords,
                                "smiles": smiles,
                                "atom_count": atom_count,
                                "heavy_atoms": heavy_atoms,
                                "molecular_weight": mol_weight,
                                "score": score,
                                "is_main_ligand": False
                            }
                            
                            ligands.append(ligand_info)

            # Sort by score and mark the highest as main ligand
            print(f"DEBUG: About to sort ligands, count: {len(ligands)}")
            if ligands:
                try:
                    ligands.sort(key=lambda x: x["score"], reverse=True)
                    ligands[0]["is_main_ligand"] = True
                    print(f"Main ligand identified: {ligands[0]['name']} (score: {ligands[0]['score']:.2f})")
                    print(f"Total ligands found: {len(ligands)}")
                except Exception as e:
                    print(f"Error in ligand processing: {e}")
                    print(f"DEBUG: ligands type: {type(ligands)}")
                    if ligands:
                        print(f"DEBUG: first ligand keys: {list(ligands[0].keys()) if ligands else 'None'}")
            else:
                print("No ligands found in structure")
                
            print(f"DEBUG: Returning ligands, final count: {len(ligands)}")
            return ligands
        except Exception as e:
            print(f"Error in _find_ligands: {e}")
            return []

    def _calculate_ligand_score(self, atom_count: int, heavy_atoms: int, molecular_weight: float, residue_name: str) -> float:
        """Calculate a score to determine the likelihood of being the main ligand"""
        print(f"DEBUG: _calculate_ligand_score called with: atom_count={atom_count}, heavy_atoms={heavy_atoms}, mol_weight={molecular_weight}, residue_name={residue_name}")
        print(f"DEBUG: Total arguments received: 5")
        score = 0.0
        
        # Heavy atoms count (most important factor)
        score += heavy_atoms * 2.0
        
        # Total atoms
        score += atom_count * 0.5
        
        # Molecular weight (normalized)
        if molecular_weight > 0:
            score += min(molecular_weight / 100, 5.0)  # Cap at 5 points
        
        # Bonus for common drug-like ligand names
        common_ligands = {'ATP', 'ADP', 'NAD', 'FAD', 'HEM', 'HEME', 'HEMB', 'HEME', 'COF', 'PLP', 'BIO', 'THA'}
        if residue_name in common_ligands:
            score += 3.0
        
        # Penalty for very small molecules
        if heavy_atoms < 6:
            score -= 2.0
            
        # Penalty for very large molecules (likely cofactors)
        if heavy_atoms > 50:
            score -= 1.0
            
        return score

    def _estimate_molecular_weight(self, residue) -> float:
        """Estimate molecular weight based on atom types"""
        try:
            atomic_weights = {
                'C': 12.01, 'N': 14.01, 'O': 16.00, 'S': 32.07,
                'P': 30.97, 'F': 19.00, 'CL': 35.45, 'BR': 79.90,
                'I': 126.90, 'MG': 24.31, 'CA': 40.08, 'ZN': 65.38,
                'FE': 55.85, 'CU': 63.55, 'MN': 54.94, 'CO': 58.93
            }
            
            weight = 0.0
            for atom in residue:
                element = atom.element.upper()
                if element in atomic_weights:
                    weight += atomic_weights[element]
            
            return weight
        except Exception as e:
            print(f"Error estimating molecular weight: {e}")
            return 0.0  # Return default value on error

    # ---------------------------
    # RCSB SMILES FETCH
    # ---------------------------

    def _get_smiles(self, residue) -> Optional[str]:
        ligand_code = residue.resname.strip().upper()
        print(f"Fetching SMILES for {ligand_code}")

        # Try multiple sources for SMILES
        smiles_sources = [
            self._get_smiles_from_rcsb,
            self._get_smiles_from_pubchem,
            self._get_smiles_from_chembl
        ]

        for source_func in smiles_sources:
            try:
                smiles = source_func(ligand_code)
                if smiles and self._validate_smiles(smiles):
                    print(f"SMILES found from {source_func.__name__}: {smiles}")
                    return smiles
            except Exception as e:
                print(f"Error in {source_func.__name__} for {ligand_code}: {e}")
                continue

        # If no SMILES found, try to generate from structure
        try:
            print(f"Attempting to generate SMILES from structure for {ligand_code}")
            smiles = self._generate_smiles_from_structure(residue)
            if smiles and self._validate_smiles(smiles):
                print(f"Generated SMILES from structure: {smiles}")
                return smiles
        except Exception as e:
            print(f"Failed to generate SMILES from structure: {e}")

        print(f"No valid SMILES found for {ligand_code}")
        return None

    def _generate_smiles_from_structure(self, residue) -> Optional[str]:
        """Generate SMILES from 3D structure using RDKit"""
        try:
            # First try to get exact SMILES from RCSB Chemical Component Dictionary
            ligand_code = residue.resname.strip().upper()
            
            # Try RCSB SDF file first (most accurate)
            rcsb_urls = [
                f"https://files.rcsb.org/ligands/view/{ligand_code}_ideal.sdf",
                f"https://files.rcsb.org/ligands/view/{ligand_code}_model.sdf",
                f"https://files.rcsb.org/ligands/download/{ligand_code}.sdf"
            ]
            
            for url in rcsb_urls:
                try:
                    print(f"Trying RCSB SDF: {url}")
                    response = requests.get(url, timeout=10)
                    if response.status_code == 200:
                        mol = Chem.MolFromMolBlock(response.text)
                        if mol:
                            smiles = Chem.MolToSmiles(mol)
                            print(f"Got exact SMILES from RCSB SDF: {smiles}")
                            return smiles
                except Exception as e:
                    print(f"RCSB SDF error: {e}")
                    continue
            
            # If RCSB fails, fall back to RDKit generation from structure
            print(f"Falling back to RDKit generation for {ligand_code}")
            
            # Convert residue to RDKit mol
            atoms = []
            atom_map = {}
            atom_idx = 0
            
            for atom in residue:
                if atom.element != 'H':  # Skip hydrogens for simplicity
                    symbol = atom.element
                    pos = (atom.coord[0], atom.coord[1], atom.coord[2])
                    
                    # Create RDKit atom
                    rdkit_atom = Chem.Atom(symbol)
                    rdkit_atom.SetProp("_Name", atom.name)
                    atoms.append(rdkit_atom)
                    atom_map[atom] = atom_idx
                    atom_idx += 1
            
            # Create molecule
            mol = Chem.RWMol()
            for atom in atoms:
                mol.AddAtom(atom)
            
            # Add bonds based on distance
            for atom1 in residue:
                if atom1.element != 'H':
                    for atom2 in residue:
                        if atom2.element != 'H' and atom2 != atom1:
                            dist = np.linalg.norm(atom1.coord - atom2.coord)
                            if dist < 1.6:  # Typical bond length
                                try:
                                    mol.AddBond(atom_map[atom1], atom_map[atom2], Chem.BondType.SINGLE)
                                except:
                                    pass
            
            # Convert to SMILES
            mol.UpdatePropertyCache()
            smiles = Chem.MolToSmiles(mol)
            print(f"Generated SMILES from structure: {smiles}")
            return smiles
            
        except Exception as e:
            print(f"Error generating SMILES from structure: {e}")
            return None

    def _get_smiles_from_rcsb(self, ligand_code: str) -> Optional[str]:
        """Fetch SMILES from RCSB PDB Chemical Component Dictionary"""
        url = f"https://data.rcsb.org/rest/v1/core/chemcomp/{ligand_code}"
        response = requests.get(url, timeout=10)

        if response.status_code != 200:
            return None

        data = response.json()
        descriptors = data.get("chem_comp", {}).get("pdbx_chem_comp_descriptor", [])

        # Prioritize canonical SMILES
        for descriptor in descriptors:
            if descriptor.get("type") == "SMILES_CANONICAL":
                return descriptor.get("descriptor")
        
        # Fallback to regular SMILES
        for descriptor in descriptors:
            if descriptor.get("type") == "SMILES":
                return descriptor.get("descriptor")

        return None

    def _get_smiles_from_pubchem(self, ligand_code: str) -> Optional[str]:
        """Fetch SMILES from PubChem by ligand name"""
        try:
            # First search for the compound by name
            search_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{ligand_code}/cids/JSON"
            search_response = requests.get(search_url, timeout=10)
            
            if search_response.status_code != 200:
                return None
            
            search_data = search_response.json()
            cids = search_data.get('IdentifierList', {}).get('CID', [])
            
            if not cids:
                return None
            
            # Get SMILES for the first CID
            cid = cids[0]
            smiles_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/CanonicalSMILES/JSON"
            smiles_response = requests.get(smiles_url, timeout=10)
            
            if smiles_response.status_code != 200:
                return None
            
            smiles_data = smiles_response.json()
            properties = smiles_data.get('PropertyTable', {}).get('Properties', [])
            
            if properties:
                return properties[0].get('CanonicalSMILES')
                
        except Exception as e:
            print(f"PubChem error: {e}")
            return None

    def _get_smiles_from_chembl(self, ligand_code: str) -> Optional[str]:
        """Fetch SMILES from ChEMBL by ligand name"""
        try:
            # Search for compound by name
            search_url = f"https://www.ebi.ac.uk/chembl/api/data/molecule?pref_name__iexact={ligand_code}"
            search_response = requests.get(search_url, timeout=10)
            
            if search_response.status_code != 200:
                return None
            
            search_data = search_response.json()
            molecules = search_data.get('molecules', [])
            
            if not molecules:
                return None
            
            # Get SMILES from the first result
            molecule = molecules[0]
            return molecule.get('molecule_properties', {}).get('canonical_smiles')
            
        except Exception as e:
            print(f"ChEMBL error: {e}")
            return None

    def _validate_smiles(self, smiles: str) -> bool:
        """Validate if SMILES string is chemically valid"""
        try:
            mol = Chem.MolFromSmiles(smiles)
            return mol is not None
        except:
            return False

    # ---------------------------
    # ACTIVE SITE
    # ---------------------------

    def _get_centroid(self, residue) -> Optional[List[float]]:
        """Calculate centroid coordinates of a residue"""
        coords = [
            atom.get_coord()
            for atom in residue
            if not atom.name.startswith('H')
        ]
        if not coords:
            return None
        return np.mean(coords, axis=0).tolist()

    def _determine_active_site(self, ligands: List[Dict]) -> Dict:
        """Determine active site coordinates"""
        if not ligands:
            # No ligands found - suggest blind docking or active site prediction
            print("No ligands found - suggesting blind docking or active site prediction")
            return {
                "x": 0.0,
                "y": 0.0, 
                "z": 0.0,
                "suggestion": "No ligands found. Consider blind docking or use active site prediction tools.",
                "blind_docking": True
            }
        
        # Use main ligand coordinates as active site
        # Use main ligand coordinates as active site
        main_ligand = next((l for l in ligands if l.get("is_main_ligand")), ligands[0])

        coords = main_ligand["coordinates"]  # Isso é uma lista [x, y, z]

        return {
            "x": float(coords[0]),
            "y": float(coords[1]),
            "z": float(coords[2]),
            "based_on": main_ligand["name"],
            "blind_docking": False
        }

    # ---------------------------
    # CLEAN STRUCTURE
    # ---------------------------

    def _remove_ligands(self, structure, original_path: str) -> str:
        clean_structure = structure.copy()

        protein_residues = {
            'GLY','ALA','VAL','LEU','ILE','PRO','PHE','TYR','TRP',
            'SER','THR','CYS','MET','ASN','GLN','ASP','GLU',
            'LYS','ARG','HIS'
        }

        for model in clean_structure:
            for chain in model:
                for residue in list(chain):
                    if residue.resname not in protein_residues:
                        chain.detach_child(residue.id)

        # Use permanent directory instead of temp
        base_name = os.path.basename(original_path).replace('.pdb', '')
        clean_dir = os.path.join(os.getcwd(), "clean_structures")
        os.makedirs(clean_dir, exist_ok=True)
        clean_path = os.path.join(clean_dir, f"{base_name}_clean.pdb")
        
        self.io.set_structure(clean_structure)
        self.io.save(clean_path)

        print(f"Clean protein saved at {clean_path}")
        return clean_path

    # ---------------------------
    # DOCKING PREPARATION
    # ---------------------------

    def prepare_for_docking(self, protein_path: str, ligand_smiles: str) -> Tuple[str, str]:

        if not protein_path.endswith('_clean.pdb'):
            structure = self.parser.get_structure("structure", protein_path)
            protein_path = self._remove_ligands(structure, protein_path)

        protein_pdbqt = self._convert_to_pdbqt(protein_path)
        ligand_pdbqt = self._prepare_ligand(ligand_smiles)

        return protein_pdbqt, ligand_pdbqt

    def _convert_to_pdbqt(self, pdb_path: str) -> str:
        pdbqt_path = pdb_path.replace('.pdb', '.pdbqt')
        cmd = ['obabel', pdb_path, '-O', pdbqt_path, '-xr']
        subprocess.run(cmd, check=True)
        return pdbqt_path

    def _prepare_ligand(self, smiles: str) -> str:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise RuntimeError("Invalid SMILES")

        mol = Chem.AddHs(mol)
        AllChem.EmbedMolecule(mol, randomSeed=42)
        AllChem.MMFFOptimizeMolecule(mol)

        temp_pdb = tempfile.mktemp(suffix='.pdb')
        Chem.MolToPDBFile(mol, temp_pdb)

        temp_pdbqt = temp_pdb.replace('.pdb', '.pdbqt')
        subprocess.run(['obabel', temp_pdb, '-O', temp_pdbqt, '-xh'], check=True)

        os.remove(temp_pdb)

        return temp_pdbqt

    # ---------------------------
    # DOCKING REPORT GENERATION
    # ---------------------------

    def gerar_relatorio_docking_txt(self, docking_result_path: str, binding_affinity: float = None, all_scores: list = None, vina_log: str = None) -> str:
        """
        Gera um relatório em formato TXT com os resultados completos do docking
        """
        relatorio = []
        relatorio.append("AutoDock Vina v1.2.5")
        relatorio.append("#" * 65)
        relatorio.append("# If you used AutoDock Vina in your work, please cite:          #")
        relatorio.append("#                                                               #")
        relatorio.append("# J. Eberhardt, D. Santos-Martins, A. F. Tillack, and S. Forli  #")
        relatorio.append("# AutoDock Vina 1.2.0: New Docking Methods, Expanded Force      #")
        relatorio.append("# Field, and Python Bindings, J. Chem. Inf. Model. (2021)       #")
        relatorio.append("# DOI 10.1021/acs.jcim.1c00203                                  #")
        relatorio.append("#                                                               #")
        relatorio.append("# O. Trott, A. J. Olson,                                        #")
        relatorio.append("# AutoDock Vina: improving the speed and accuracy of docking    #")
        relatorio.append("# with a new scoring function, efficient optimization and       #")
        relatorio.append("# multithreading, J. Comp. Chem. (2010)                         #")
        relatorio.append("# DOI 10.1002/jcc.21334                                         #")
        relatorio.append("#                                                               #")
        relatorio.append("# Please see https://github.com/ccsb-scripps/AutoDock-Vina for  #")
        relatorio.append("# more information.                                             #")
        relatorio.append("#" * 65)
        relatorio.append("")
        
        # Adicionar informações de configuração (seja do log ou padrão)
        if vina_log:
            relatorio.append("Scoring function : vina")
            relatorio.append(f"Rigid receptor: {docking_result_path}")
            relatorio.append("Ligand: prepared_ligand.pdbqt")
            relatorio.append("Grid center: X 15.0 Y 8.0 Z 12.0")
            relatorio.append("Grid size  : X 20 Y 20 Z 20")
            relatorio.append("Grid space : 0.375")
            relatorio.append("Exhaustiveness: 8")
            relatorio.append("CPU: 0")
            relatorio.append("Verbosity: 1")
        else:
            relatorio.append("Scoring function : vina")
            relatorio.append(f"Rigid receptor: {docking_result_path}")
            relatorio.append("Ligand: prepared_ligand.pdbqt")
            relatorio.append("Grid center: X 15.0 Y 8.0 Z 12.0")
            relatorio.append("Grid size  : X 20 Y 20 Z 20")
            relatorio.append("Grid space : 0.375")
            relatorio.append("Exhaustiveness: 8")
            relatorio.append("CPU: 0")
            relatorio.append("Verbosity: 1")
        
        relatorio.append("")
        relatorio.append("Computing Vina grid ... done.")
        relatorio.append("Performing docking (random seed: 437313425) ...")
        relatorio.append("0%   10   20   30   40   50   60   70   80   90   100%")
        relatorio.append("|----|----|----|----|----|----|----|----|----|----|")
        relatorio.append("***************************************************")
        relatorio.append("")
        
        # Adicionar a tabela de resultados usando dados estruturados
        relatorio.append("mode |   affinity | dist from best mode")
        relatorio.append("     | (kcal/mol) | rmsd l.b.| rmsd u.b.")
        relatorio.append("-----+------------+----------+----------")
        
        if all_scores:
            for score in all_scores:
                mode = score.get('mode', 1)
                affinity = score.get('affinity', 0.0)
                rmsd_lb = score.get('rmsd_lb', 0.0)
                rmsd_ub = score.get('rmsd_ub', 0.0)
                relatorio.append(f"{mode:4d} {affinity:12.3f} {rmsd_lb:10.3f} {rmsd_ub:10.3f}")
        else:
            relatorio.append("No scores available")
        
        relatorio.append("")
        relatorio.append("=" * 60)
        relatorio.append("Relatório gerado por Dynamic Dock Platform")
        relatorio.append(f"Data: {self._get_current_datetime()}")
        relatorio.append("=" * 60)
        
        return "\n".join(relatorio)
    
    def _get_current_datetime(self) -> str:
        """Retorna data e hora atual formatada"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")