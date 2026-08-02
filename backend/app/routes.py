"""
API routes for Dynamic Dock.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
import tempfile
import os
import platform
import subprocess
from typing import Optional
from pydantic import BaseModel
from .molecular import MolecularHandler
from .docking import DockingHandler
from . import paths
from . import interactions as interactions_module

router = APIRouter()
molecular_handler = MolecularHandler()

# Locate AutoDock Vina and Open Babel for the current OS. Neither of these
# raise at import time: a missing executable shouldn't crash the whole API,
# it should surface as a clear, actionable error only when docking is
# actually requested (see /health and /dock below).
VINA_EXECUTABLE = paths.find_vina_executable()
OBABEL_EXECUTABLE = paths.find_obabel_executable()

if VINA_EXECUTABLE:
    print(f"Using AutoDock Vina from: {VINA_EXECUTABLE}")
else:
    print(
        "WARNING: AutoDock Vina executable not found. Run 'python setup.py' "
        "from the project root, or set the VINA_EXECUTABLE environment variable."
    )

docking_handler = DockingHandler(vina_executable=VINA_EXECUTABLE or "vina")

class VinaSetupRequest(BaseModel):
    output_dir: str

class DockingRequest(BaseModel):
    receptor_path: str
    ligand_smiles: str
    center_x: float
    center_y: float
    center_z: float
    size_x: float
    size_y: float
    size_z: float
    output_dir: Optional[str] = None

class ConvertPosesRequest(BaseModel):
    pdbqt_path: str

class DockingResultsRequest(BaseModel):
    docking_result_path: str
    binding_affinity: float = None
    all_scores: list = None
    vina_log: str = None

class InteractionAnalysisRequest(BaseModel):
    receptor_path: str
    poses_path: str
    ligand_smiles: Optional[str] = None
    pose_index: int = 1


@router.get("/health")
async def health_check():
    """
    Report whether the external tools Dynamic Dock depends on (AutoDock Vina,
    Open Babel) are available on this machine/OS. The frontend uses this to
    show a clear setup banner instead of a confusing failure mid-docking.
    """
    return {
        "status": "ok",
        "platform": platform.system(),
        "vina": {
            "available": VINA_EXECUTABLE is not None,
            "path": VINA_EXECUTABLE,
        },
        "obabel": {
            "available": OBABEL_EXECUTABLE is not None,
            "path": OBABEL_EXECUTABLE,
        },
    }

@router.post("/setup-vina")
async def setup_vina(request: VinaSetupRequest):
    """Set up Vina in the selected directory."""
    try:
        # Create the output directory if it doesn't exist
        os.makedirs(request.output_dir, exist_ok=True)
        
        return {"success": True, "message": "Vina setup completed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set up Vina: {str(e)}")

@router.get("/fetch-pdb/{pdb_id}")
async def fetch_pdb(pdb_id: str):
    """Fetch and analyze a PDB structure."""
    try:
        # Validate PDB ID format
        if not pdb_id or len(pdb_id.strip()) < 1:
            raise HTTPException(status_code=400, detail="PDB ID cannot be empty")
        
        pdb_id = pdb_id.strip().upper()
        if not pdb_id.replace('-', '').replace('_', '').isalnum():
            raise HTTPException(status_code=400, detail="Invalid PDB ID format. Use alphanumeric characters only.")
        
        print(f"Fetching PDB structure '{pdb_id}'...")
        structure_path = molecular_handler.fetch_structure(pdb_id)
        print(f"Structure exists: '{structure_path}'")
        
        analysis = molecular_handler.analyze_structure(structure_path)
        
        # Get the main ligand information
        main_ligand = None
        if analysis["ligands"]:
            try:
                main_ligand = next((l for l in analysis["ligands"] if "is_main_ligand" in l), None)

            except StopIteration:
                main_ligand = analysis["ligands"][0] if analysis["ligands"] else None
                if main_ligand:
                    main_ligand["is_main_ligand"] = True
        
        # Read the PDB content for frontend visualization
        with open(structure_path, 'r') as f:
            pdb_content = f.read()
        
        return {
            "structure_id": pdb_id,
            "ligands": analysis["ligands"],
            "active_site_coords": analysis["active_site"],
            "main_ligand": main_ligand,
            "clean_structure_path": analysis["clean_structure_path"],
            "pdb_content": pdb_content
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching PDB {pdb_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch PDB structure: {str(e)}")

@router.post("/upload-pdb")
async def upload_pdb(file: UploadFile = File(...)):
    """Process an uploaded PDB file."""
    try:
        # Save file permanently in the OS-independent uploads directory
        file_path = os.path.join(paths.UPLOADED_STRUCTURES_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Read the uploaded file content for frontend visualization
        with open(file_path, 'r') as f:
            pdb_content = f.read()

        # Analyze structure
        analysis = molecular_handler.analyze_structure(file_path)

        # Get the main ligand information
        main_ligand = None
        if analysis["ligands"]:
            try:
                main_ligand = next((l for l in analysis["ligands"] if "is_main_ligand" in l), None)
            except StopIteration:
                main_ligand = analysis["ligands"][0] if analysis["ligands"] else None
                if main_ligand:
                    main_ligand["is_main_ligand"] = True

        return {
            "structure_id": "uploaded",
            "ligands": analysis["ligands"],
            "active_site_coords": analysis["active_site"],
            "main_ligand": main_ligand,
            "clean_structure_path": analysis["clean_structure_path"],
            "structure_path": file_path,
            "pdb_content": pdb_content  # <-- important!
        }
    except Exception as e:
        print(f"Upload error: {str(e)}")
        error_detail = str(e)
        
        # Specific error messages for common issues
        if "No such file" in error_detail or "does not exist" in error_detail:
            error_detail = "File not found or could not be accessed"
        elif "Permission denied" in error_detail:
            error_detail = "Permission denied accessing file"
        elif "File too large" in error_detail:
            error_detail = "File size exceeds maximum allowed limit"
        elif "Invalid PDB file" in error_detail:
            error_detail = "Invalid PDB file format or corrupted file"
        elif "structure" in error_detail.lower():
            error_detail = f"Error processing protein structure: {error_detail}"
        
        raise HTTPException(status_code=400, detail=error_detail)

@router.post("/dock")
async def dock_ligand(request: DockingRequest):
    """Perform molecular docking."""
    try:
        print("Received docking request:", request.dict())  # Debug print

        if not VINA_EXECUTABLE:
            raise HTTPException(
                status_code=503,
                detail=(
                    "AutoDock Vina executable was not found on this system. "
                    "Run 'python setup.py' from the project root (it downloads "
                    "the right binary for your OS), or set the VINA_EXECUTABLE "
                    "environment variable to its full path."
                ),
            )

        if not os.path.exists(request.receptor_path):
            raise HTTPException(
                status_code=400,
                detail="Protein structure file not found."
            )

        # Fall back to the default results directory (next to the bundled
        # Vina binary) when the client doesn't request a specific location.
        output_dir = request.output_dir or paths.RESULTS_DIR
        os.makedirs(output_dir, exist_ok=True)

        # Prepare receptor and ligand
        protein_pdbqt, ligand_pdbqt = molecular_handler.prepare_for_docking(
            request.receptor_path, request.ligand_smiles
        )
        
        print(f"Prepared PDBQT files: Protein: {protein_pdbqt}, Ligand: {ligand_pdbqt}")  # Debug print
        
        # Prepare docking configuration
        config_path = docking_handler.prepare_docking_config(
            request.center_x, request.center_y, request.center_z,
            request.size_x, request.size_y, request.size_z
        )
        
        # Set output paths
        docking_result_pdbqt = os.path.join(output_dir, "docking_result_all_poses.pdbqt")
        complex_pdbqt = os.path.join(output_dir, "docked_complex_all_poses.pdbqt")  # Complexo completo em PDBQT
        
        # Run docking
        result = docking_handler.run_docking(
            protein_pdbqt,
            ligand_pdbqt,
            config_path,
            docking_result_pdbqt
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Docking failed: {result['error']}"
            )
        
        # Get the best binding affinity (lowest energy)
        best_score = min(result["scores"], key=lambda x: x["affinity"]) if result["scores"] else None
        binding_affinity = best_score["affinity"] if best_score else None
        
        print(f"Best binding affinity: {binding_affinity} kcal/mol")  # Debug print
        
        # Save the docked complex as PDBQT (proteína + ligante completo)
        complex_path = docking_handler.save_docked_complex(
            request.receptor_path,  # Original receptor PDB
            docking_result_pdbqt,  # Docked ligand PDBQT
            complex_pdbqt  # Output path - agora em PDBQT
        )
        
        print(f"Saved docked complex to: {complex_path}")  # Debug print
        print(f"DEBUG: PDBQT file path: {docking_result_pdbqt}")  # Debug print
        print(f"DEBUG: PDBQT file exists: {os.path.exists(docking_result_pdbqt)}")  # Debug print
        
        return {
            "success": True,
            "binding_affinity": binding_affinity,
            "poses_path": docking_result_pdbqt,  # PDBQT with all poses
            "complex_path": complex_path,  # PDBQT with protein + ligand
            "all_scores": result["scores"],
            "vina_log": result["log"],  # Adicionar o log completo do Vina
            "download_urls": {
                "complex": f"/api/download/{os.path.basename(complex_path)}",
                "all_poses": f"/api/download/{os.path.basename(docking_result_pdbqt)}",
                "best_pose": f"/api/download/{os.path.basename(complex_path)}"
            }
        }
        
    except Exception as e:
        print("Docking error:", str(e))  # Debug print
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-interactions")
async def analyze_interactions(request: InteractionAnalysisRequest):
    """
    Analyze protein-ligand interactions (hydrogen bonds, van der Waals /
    hydrophobic contacts, pi-stacking, salt bridges) for one docked pose, and
    render a 2D depiction of the ligand for the interaction diagram.
    """
    try:
        if not os.path.exists(request.receptor_path):
            raise HTTPException(status_code=400, detail="Receptor structure file not found.")
        if not os.path.exists(request.poses_path):
            raise HTTPException(status_code=400, detail="Docking poses file not found.")

        result = interactions_module.analyze_docking_interactions(
            request.receptor_path, request.poses_path, request.pose_index
        )

        if request.ligand_smiles:
            result["ligand_svg"] = interactions_module.generate_ligand_svg(request.ligand_smiles)
        else:
            result["ligand_svg"] = None

        return result

    except HTTPException:
        raise
    except RuntimeError as e:
        # Missing external tool (Open Babel) - not the user's fault
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Interaction analysis error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to analyze interactions: {str(e)}")

@router.get("/download/{filename}")
async def download_file(filename: str):

    print(f"DEBUG: Download endpoint called with filename: {filename}")

    # Only allow a bare filename (no path traversal), then look it up across
    # every directory Dynamic Dock is allowed to serve files from. These
    # directories are all OS-independent (see app/paths.py).
    safe_filename = os.path.basename(filename)
    file_path = None
    for directory in paths.DOWNLOAD_SEARCH_DIRS:
        candidate = os.path.join(directory, safe_filename)
        print(f"CHECKING PATH: {candidate}")
        if os.path.exists(candidate):
            file_path = candidate
            print(f"FOUND FILE AT: {file_path}")
            break

    if not file_path:
        print("FILE NOT FOUND IN ANY PATH")
        raise HTTPException(status_code=404, detail="File not found")

    print(f"DEBUG: Returning file: {file_path}")
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )

@router.post("/convert-poses-to-pdb")
async def convert_poses_to_pdb(request: ConvertPosesRequest):
    """Convert PDBQT with all poses to PDB format for download."""
    try:
        pdbqt_path = request.pdbqt_path
        
        print(f"DEBUG: Converting PDBQT file: {pdbqt_path}")
        
        # Check if file exists
        if not os.path.exists(pdbqt_path):
            raise Exception(f"PDBQT file not found: {pdbqt_path}")
        
        # Generate output path
        output_path = pdbqt_path.replace('.pdbqt', '_all_poses.pdb')
        print(f"DEBUG: Output path will be: {output_path}")
        
        if not OBABEL_EXECUTABLE:
            raise Exception(
                "Open Babel ('obabel') was not found on this system. Install it "
                "(e.g. via conda: 'conda install -c conda-forge openbabel', via "
                "Homebrew on macOS: 'brew install open-babel', via apt on Linux: "
                "'sudo apt install openbabel', or download it for Windows from "
                "https://openbabel.org) and make sure it's on your PATH."
            )

        # Convert using OpenBabel
        cmd = [OBABEL_EXECUTABLE, pdbqt_path, '-O', output_path, '-h']
        print(f"DEBUG: Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"OpenBabel conversion failed: {result.stderr}")
        
        # Check if output file was created
        if os.path.exists(output_path):
            print(f"DEBUG: Output file created successfully: {output_path}")
            print(f"DEBUG: File size: {os.path.getsize(output_path)} bytes")
        else:
            raise Exception(f"Output file was not created: {output_path}")
        
        return {
            "success": True,
            "pdb_path": output_path,
            "download_url": f"/api/download/{os.path.basename(output_path)}"
        }
        
    except Exception as e:
        print(f"DEBUG: Conversion error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/prepare-md")
async def prepare_for_md(docked_complex_path: str):
    """Prepare a docked complex for molecular dynamics."""
    try:
        result = docking_handler.prepare_for_md(docked_complex_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/gerar-relatorio-docking")
async def gerar_relatorio_docking(request: DockingResultsRequest):
    """Generate a docking results report in TXT format."""
    try:
        print(f"📄 Gerando relatório de docking para: {request.docking_result_path}")
        
        # Verificar se o arquivo de docking existe
        if not os.path.exists(request.docking_result_path):
            raise HTTPException(status_code=404, detail=f"Arquivo de docking não encontrado: {request.docking_result_path}")
        
        # Gerar relatório em TXT com o log completo do Vina
        relatorio_txt = molecular_handler.gerar_relatorio_docking_txt(
            request.docking_result_path,
            request.binding_affinity,
            request.all_scores,
            request.vina_log  # Passar o log completo do Vina
        )
        
        # Salvar relatório em arquivo temporário para download
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='_docking_report.txt', delete=False)
        temp_file.write(relatorio_txt)
        temp_file.close()
        
        return {
            "success": True,
            "relatorio_txt": relatorio_txt,
            "relatorio_file_path": temp_file.name,
            "download_url": f"/api/download-docking-report/{os.path.basename(temp_file.name)}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao gerar relatório de docking: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")

@router.get("/download-docking-report/{filename}")
async def download_docking_report(filename: str):
    """Download docking report in TXT format."""
    try:
        # The report is written with tempfile.NamedTemporaryFile, which always
        # uses the OS-standard temp directory (works the same way on Windows,
        # Linux and macOS via tempfile.gettempdir()).
        safe_filename = os.path.basename(filename)
        possible_paths = [
            os.path.join(tempfile.gettempdir(), safe_filename),
            os.path.join(paths.RESULTS_DIR, safe_filename),
        ]

        file_path = None
        for path in possible_paths:
            if os.path.exists(path):
                file_path = path
                break

        if not file_path:
            print(f"❌ Arquivo de relatório de docking não encontrado: {filename}")
            raise HTTPException(status_code=404, detail="Relatório de docking não encontrado")
        
        print(f"📄 Enviando arquivo de relatório de docking: {file_path}")
        
        return FileResponse(
            path=file_path,
            filename=f"docking_results_report_{filename.replace('_docking_report.txt', '')}.txt",
            media_type="text/plain"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro no download do relatório de docking: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao baixar relatório: {str(e)}")
