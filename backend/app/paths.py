"""
Centralized, OS-independent path & executable configuration for Dynamic Dock.

Every directory the backend reads or writes is derived from this file's own
location (never from os.getcwd() or a hardcoded absolute path), so the
application behaves identically on Windows, Linux and macOS regardless of
where it is installed or which working directory it is launched from.

All defaults can be overridden with environment variables, which is useful
for Docker deployments or custom installs.
"""

import os
import platform
import shutil
import sys

# backend/app
APP_DIR = os.path.dirname(os.path.abspath(__file__))
# backend
BACKEND_DIR = os.path.dirname(APP_DIR)
# project root (contains frontend/, backend/, vina/, etc.)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)


def _env_path(name: str, default: str) -> str:
    value = os.environ.get(name)
    return os.path.abspath(value) if value else default


# Structures downloaded from RCSB PDB
DOWNLOADED_STRUCTURES_DIR = _env_path(
    "DYNAMIC_DOCK_DOWNLOADED_DIR", os.path.join(BACKEND_DIR, "downloaded_structures")
)
# Structures with ligands stripped, ready for docking
CLEAN_STRUCTURES_DIR = _env_path(
    "DYNAMIC_DOCK_CLEAN_DIR", os.path.join(BACKEND_DIR, "clean_structures")
)
# User-uploaded PDB files
UPLOADED_STRUCTURES_DIR = _env_path(
    "DYNAMIC_DOCK_UPLOAD_DIR", os.path.join(BACKEND_DIR, "uploaded_structures")
)
# Where the AutoDock Vina executable lives (and where setup.py downloads it to)
VINA_DIR = _env_path("DYNAMIC_DOCK_VINA_DIR", os.path.join(PROJECT_ROOT, "vina"))
# Default location for docking results when the client doesn't specify one
RESULTS_DIR = _env_path("DYNAMIC_DOCK_RESULTS_DIR", os.path.join(VINA_DIR, "results"))

for _dir in (
    DOWNLOADED_STRUCTURES_DIR,
    CLEAN_STRUCTURES_DIR,
    UPLOADED_STRUCTURES_DIR,
    RESULTS_DIR,
):
    os.makedirs(_dir, exist_ok=True)

# Every directory the /download endpoint is allowed to serve files from.
DOWNLOAD_SEARCH_DIRS = [
    RESULTS_DIR,
    DOWNLOADED_STRUCTURES_DIR,
    UPLOADED_STRUCTURES_DIR,
    CLEAN_STRUCTURES_DIR,
]


def find_executable(name: str):
    """Find an executable on PATH, handling the .exe suffix on Windows."""
    if platform.system() == "Windows" and not name.lower().endswith(".exe"):
        return shutil.which(f"{name}.exe") or shutil.which(name)
    return shutil.which(name)


def find_vina_executable():
    """
    Locate the AutoDock Vina executable for the current OS, in this order:
      1. VINA_EXECUTABLE environment variable (explicit override)
      2. Bundled binary in <project_root>/vina/ (downloaded by setup.py)
      3. `vina` (or `vina.exe`) available on the system PATH
    Returns None if nothing is found - callers should surface a friendly
    error instead of crashing.
    """
    override = os.environ.get("VINA_EXECUTABLE")
    if override and os.path.isfile(override):
        return override

    exe_name = "vina.exe" if platform.system() == "Windows" else "vina"
    bundled = os.path.join(VINA_DIR, exe_name)
    if os.path.isfile(bundled):
        return bundled

    return find_executable("vina")


def find_obabel_executable():
    """
    Locate the Open Babel `obabel` executable, in this order:
      1. OBABEL_EXECUTABLE environment variable (explicit override)
      2. Installed via pip ('openbabel-wheel', by setup.py) into this venv -
         its CLI lands next to the running Python interpreter, not
         necessarily on the system PATH.
      3. `obabel` (or `obabel.exe`) available on the system PATH (Homebrew,
         apt, conda, a manual install, ...)
    Returns None if nothing is found.
    """
    override = os.environ.get("OBABEL_EXECUTABLE")
    if override and os.path.isfile(override):
        return override

    exe_name = "obabel.exe" if platform.system() == "Windows" else "obabel"
    venv_bin_dir = os.path.join(sys.prefix, "Scripts" if platform.system() == "Windows" else "bin")
    venv_candidate = os.path.join(venv_bin_dir, exe_name)
    if os.path.isfile(venv_candidate):
        return venv_candidate

    return find_executable("obabel")
