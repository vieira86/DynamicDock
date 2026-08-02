#!/usr/bin/env python3
"""
Dynamic Dock - one-command, cross-platform setup.

Run this the same way on Windows, Linux and macOS:

    python setup.py

What it does:
  1. Creates a Python virtual environment (.venv) and installs the backend
     dependencies from requirements.txt.
  2. Runs `npm install` for the React frontend.
  3. Downloads the AutoDock Vina executable that matches your OS/CPU
     automatically (from the official GitHub releases), unless one is
     already present in vina/.
  4. Checks whether Open Babel ('obabel') is available and prints
     installation instructions for your OS if it isn't (Open Babel doesn't
     ship a single portable binary, so it isn't auto-downloaded).

Nothing here is required to happen in a specific order by hand - just run
this script, then `python run.py` to start the app.
"""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
VINA_DIR = os.path.join(PROJECT_ROOT, "vina")
VENV_DIR = os.path.join(PROJECT_ROOT, ".venv")
REQUIREMENTS_FILE = os.path.join(PROJECT_ROOT, "requirements.txt")

VINA_RELEASES_API = "https://api.github.com/repos/ccsb-scripps/AutoDock-Vina/releases/latest"
VINA_RELEASES_PAGE = "https://github.com/ccsb-scripps/AutoDock-Vina/releases"


def banner(text):
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70)


def venv_python_path():
    if platform.system() == "Windows":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python")


def run(cmd, **kwargs):
    print(f"$ {' '.join(str(c) for c in cmd)}")
    return subprocess.run(cmd, check=True, **kwargs)


def step_create_venv():
    banner("1/4  Python virtual environment")
    if os.path.isfile(venv_python_path()):
        print(f"Virtual environment already exists at {VENV_DIR}, skipping creation.")
    else:
        try:
            run([sys.executable, "-m", "venv", VENV_DIR])
        except subprocess.CalledProcessError:
            print(
                "\nCould not create the virtual environment. This usually means "
                "your Python installation is missing the 'venv'/'ensurepip' modules."
            )
            system = platform.system()
            if system == "Linux":
                print("On Debian/Ubuntu, install them with:")
                print("    sudo apt install python3-venv python3-pip")
                print("On Fedora:")
                print("    sudo dnf install python3-virtualenv python3-pip")
            else:
                print(
                    "Try reinstalling Python from https://python.org (make sure "
                    "'pip' is included) and re-run this script."
                )
            raise
        print(f"Created virtual environment at {VENV_DIR}")

    py = venv_python_path()
    run([py, "-m", "pip", "install", "--upgrade", "pip"])
    if os.path.isfile(REQUIREMENTS_FILE):
        run([py, "-m", "pip", "install", "-r", REQUIREMENTS_FILE])
    else:
        print(f"WARNING: {REQUIREMENTS_FILE} not found, skipping pip install.")


def step_npm_install(skip):
    banner("2/4  Frontend dependencies (npm)")
    if skip:
        print("Skipped (--skip-npm).")
        return

    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        print(
            "WARNING: 'npm' was not found on your PATH. Install Node.js 16+ from "
            "https://nodejs.org and re-run this script (or run 'npm install' "
            "manually inside the frontend/ folder)."
        )
        return

    run([npm, "install"], cwd=FRONTEND_DIR)


def _pick_vina_asset(assets, system, machine):
    """Return the best-matching release asset for this OS/architecture."""
    system = system.lower()
    machine = machine.lower()
    is_arm = machine in ("arm64", "aarch64")

    def has(asset, *tokens):
        name = asset["name"].lower()
        return any(t in name for t in tokens)

    if system == "windows":
        matches = [a for a in assets if has(a, "win")]
        return matches[0] if matches else None

    if system == "darwin":
        mac_assets = [a for a in assets if has(a, "mac", "osx", "darwin")]
        arm_matches = [a for a in mac_assets if has(a, "aarch64", "arm64")]
        intel_matches = [a for a in mac_assets if has(a, "x86_64", "x64")]
        if is_arm:
            return arm_matches[0] if arm_matches else (intel_matches[0] if intel_matches else None)
        return intel_matches[0] if intel_matches else (arm_matches[0] if arm_matches else None)

    if system == "linux":
        matches = [a for a in assets if has(a, "linux") and has(a, "x86_64", "x64")]
        return matches[0] if matches else None

    return None


def step_download_vina(skip, force):
    banner("3/4  AutoDock Vina executable")
    system = platform.system()
    exe_name = "vina.exe" if system == "Windows" else "vina"
    target_path = os.path.join(VINA_DIR, exe_name)
    os.makedirs(VINA_DIR, exist_ok=True)

    if skip:
        print("Skipped (--skip-vina).")
        return

    if os.path.isfile(target_path) and not force:
        print(f"AutoDock Vina already present at {target_path}, skipping download.")
        print("(Use --force-vina to re-download.)")
        return

    print(f"Detecting AutoDock Vina release for {system} / {platform.machine()}...")
    try:
        req = urllib.request.Request(
            VINA_RELEASES_API, headers={"User-Agent": "dynamic-dock-setup-script"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            release = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
        print(f"WARNING: could not reach GitHub to look up AutoDock Vina releases ({exc}).")
        print(f"Please download it manually from {VINA_RELEASES_PAGE}")
        print(f"and place the executable at: {target_path}")
        return

    assets = release.get("assets", [])
    asset = _pick_vina_asset(assets, system, platform.machine())
    if not asset:
        print(f"WARNING: no matching AutoDock Vina asset found for {system}/{platform.machine()}.")
        print(f"Please download it manually from {VINA_RELEASES_PAGE}")
        print(f"and place the executable at: {target_path}")
        return

    download_url = asset["browser_download_url"]
    print(f"Downloading {asset['name']} ...")
    try:
        req = urllib.request.Request(
            download_url, headers={"User-Agent": "dynamic-dock-setup-script"}
        )
        with urllib.request.urlopen(req, timeout=120) as resp, open(target_path, "wb") as out_file:
            shutil.copyfileobj(resp, out_file)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
        print(f"WARNING: download failed ({exc}).")
        print(f"Please download it manually from {VINA_RELEASES_PAGE}")
        print(f"and place the executable at: {target_path}")
        return

    if system != "Windows":
        os.chmod(target_path, 0o755)

    print(f"AutoDock Vina installed at {target_path}")


def step_check_obabel():
    banner("4/4  Open Babel check")
    obabel = shutil.which("obabel") or shutil.which("obabel.exe")
    if obabel:
        print(f"Open Babel found: {obabel}")
        return

    system = platform.system()
    print("Open Babel ('obabel') was NOT found on your PATH.")
    print("Dynamic Dock needs it to convert molecule file formats. Install it with:")
    if system == "Darwin":
        print("    brew install open-babel")
        print("  or, with conda:  conda install -c conda-forge openbabel")
    elif system == "Linux":
        print("    sudo apt install openbabel      (Debian/Ubuntu)")
        print("    sudo dnf install openbabel      (Fedora)")
        print("  or, with conda:  conda install -c conda-forge openbabel")
    else:
        print("    conda install -c conda-forge openbabel   (recommended on Windows)")
        print("  or download an installer from https://openbabel.org")


def main():
    parser = argparse.ArgumentParser(description="Set up Dynamic Dock (cross-platform).")
    parser.add_argument("--skip-npm", action="store_true", help="Skip `npm install` for the frontend.")
    parser.add_argument("--skip-vina", action="store_true", help="Skip downloading AutoDock Vina.")
    parser.add_argument(
        "--force-vina", action="store_true", help="Re-download AutoDock Vina even if already present."
    )
    args = parser.parse_args()

    print("Dynamic Dock setup")
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Detected OS:  {platform.system()} ({platform.machine()})")

    try:
        step_create_venv()
        step_npm_install(args.skip_npm)
        step_download_vina(args.skip_vina, args.force_vina)
        step_check_obabel()
    except subprocess.CalledProcessError as exc:
        banner("Setup failed")
        print(f"Command failed with exit code {exc.returncode}: {exc.cmd}")
        sys.exit(1)

    banner("Setup complete")
    print("Next step: start the app with")
    print("    python run.py")
    print("\nOr manually, in two terminals:")
    py = venv_python_path()
    print(f"    {py} -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000   (from backend/)")
    print("    npm start                                                          (from frontend/)")


if __name__ == "__main__":
    main()
