#!/usr/bin/env python3
"""
Dynamic Dock - one-command, cross-platform setup.

Run this the same way on Windows, Linux and macOS:

    python setup.py

What it does:
  1. Creates a Python virtual environment (.venv) and installs the backend
     dependencies from requirements.txt.
  2. Runs `npm install` for the React frontend.
  3. Installs the AutoDock Vina executable that matches your OS/CPU. The
     official v1.2.7 binaries ship with the project (vina/bin/), so this
     works offline; it only downloads from the official GitHub release if
     the bundled copy is missing. The binary is then self-tested.
  4. Installs Open Babel ('obabel') automatically via the 'openbabel-wheel'
     pip package, which ships prebuilt binaries for Windows, macOS and
     Linux, then verifies it actually runs. If a known Windows plugin bug
     is detected, it's disabled automatically and Open Babel is re-checked -
     no manual steps needed for the common case. Only prints manual/conda
     install instructions as a last resort, if that self-repair doesn't work.

Nothing here is required to happen in a specific order by hand - just run
this script, then `python run.py` to start the app.
"""

import argparse
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

# AutoDock Vina is bundled in vina/bin/<platform>/ (official v1.2.7 binaries,
# Apache 2.0). The version is pinned on purpose: "latest" could change the
# CLI/output format under us, and the GitHub API is rate-limited per IP
# (a whole classroom behind one school IP would hit that limit quickly).
VINA_VERSION = "1.2.7"
VINA_BUNDLE_DIR = os.path.join(VINA_DIR, "bin")
VINA_RELEASES_PAGE = "https://github.com/ccsb-scripps/AutoDock-Vina/releases"
VINA_DOWNLOAD_BASE = (
    f"https://github.com/ccsb-scripps/AutoDock-Vina/releases/download/v{VINA_VERSION}/"
)


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
    banner("1/4  Python virtual environment and dependencies")
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


def _vina_platform():
    """
    Return (bundle_subfolder, official_release_asset_name) for this OS/CPU,
    or (None, None) if there is no official AutoDock Vina build for it.
    """
    system = platform.system()
    machine = platform.machine().lower()
    is_arm = machine in ("arm64", "aarch64")

    if system == "Windows":
        return "windows", f"vina_{VINA_VERSION}_win.exe"
    if system == "Darwin":
        # Note: a Python running under Rosetta reports x86_64 even on Apple
        # Silicon - the Intel build still works there, so that's fine.
        if is_arm:
            return "macos-arm64", f"vina_{VINA_VERSION}_mac_aarch64"
        return "macos-x86_64", f"vina_{VINA_VERSION}_mac_x86_64"
    if system == "Linux":
        if is_arm:
            return "linux-aarch64", f"vina_{VINA_VERSION}_linux_aarch64"
        if machine in ("x86_64", "amd64"):
            return "linux-x86_64", f"vina_{VINA_VERSION}_linux_x86_64"
    return None, None


def _make_runnable(path):
    """chmod +x and, on macOS, drop the Gatekeeper quarantine flag.

    When the project ZIP is downloaded with a browser, macOS marks every file
    inside it as 'quarantined'; an unsigned command-line tool like vina would
    then be blocked ("cannot be opened because the developer cannot be
    verified"). Removing the flag on our own copy avoids that popup.
    """
    if platform.system() == "Windows":
        return
    os.chmod(path, 0o755)
    if platform.system() == "Darwin":
        subprocess.run(
            ["xattr", "-d", "com.apple.quarantine", path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def _vina_version(path):
    """Run `vina --version`; return its output, or None if it doesn't run."""
    try:
        result = subprocess.run(
            [path, "--version"], capture_output=True, text=True, timeout=20
        )
    except (subprocess.TimeoutExpired, OSError):
        return None
    out = (result.stdout + result.stderr).strip()
    return out if "vina" in out.lower() else None


def _download(url, target_path):
    req = urllib.request.Request(url, headers={"User-Agent": "dynamic-dock-setup-script"})
    tmp_path = target_path + ".part"
    with urllib.request.urlopen(req, timeout=120) as resp, open(tmp_path, "wb") as out_file:
        shutil.copyfileobj(resp, out_file)
    os.replace(tmp_path, target_path)


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
        _make_runnable(target_path)
        version = _vina_version(target_path)
        if version:
            print(f"AutoDock Vina already present at {target_path} ({version}).")
            print("(Use --force-vina to replace it with the bundled v" + VINA_VERSION + ".)")
            return
        print(f"Existing {target_path} doesn't run on this machine - replacing it.")

    subfolder, asset_name = _vina_platform()
    if not subfolder:
        print(f"WARNING: there is no official AutoDock Vina build for {system}/{platform.machine()}.")
        print(f"Install it yourself (see {VINA_RELEASES_PAGE}, or 'conda install -c conda-forge vina')")
        print(f"and place the executable at: {target_path}")
        return

    # 1) Preferred: the copy bundled with Dynamic Dock (works offline).
    bundled = os.path.join(VINA_BUNDLE_DIR, subfolder, exe_name)
    installed = False
    if os.path.isfile(bundled):
        print(f"Using the AutoDock Vina v{VINA_VERSION} bundled for {subfolder}...")
        shutil.copy2(bundled, target_path)
        installed = True
    else:
        # 2) Fallback: download the same pinned version from the official release.
        url = VINA_DOWNLOAD_BASE + asset_name
        print(f"Bundled binary not found; downloading {asset_name} ...")
        try:
            _download(url, target_path)
            installed = True
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
            print(f"WARNING: download failed ({exc}).")

    if not installed:
        print(f"Please download '{asset_name}' manually from {VINA_RELEASES_PAGE}")
        print(f"and save it as: {target_path}")
        return

    _make_runnable(target_path)
    version = _vina_version(target_path)
    if version:
        print(f"AutoDock Vina installed at {target_path} ({version}).")
    else:
        print(f"WARNING: AutoDock Vina was copied to {target_path} but didn't run a self-test.")
        if system == "Darwin":
            print("On macOS, if a security popup appeared, open System Settings > Privacy &")
            print("Security and click 'Allow Anyway' for 'vina', then run setup again.")
        elif system == "Windows":
            print("Your antivirus may have blocked it - allow vina.exe and run setup again.")


def _print_obabel_manual_instructions():
    system = platform.system()
    print("You can install it manually instead:")
    if system == "Darwin":
        print("    brew install open-babel")
        print("  or, with conda:  conda install -c conda-forge openbabel")
    elif system == "Linux":
        print("    sudo apt install openbabel      (Debian/Ubuntu)")
        print("    sudo dnf install openbabel      (Fedora)")
        print("  or, with conda:  conda install -c conda-forge openbabel")
    else:
        print("    conda install -c conda-forge openbabel")
        print("  or download an installer from https://openbabel.org")
    print("Then, if needed, point Dynamic Dock at it: copy .env.example to .env")
    print("and set OBABEL_EXECUTABLE=<full path to obabel>.")


# Plugin files known to ship broken (missing DLL entry points) in some
# openbabel-wheel builds on Windows. Dynamic Dock never uses these formats,
# so disabling them is safe and keeps setup fully automatic.
KNOWN_BROKEN_OBABEL_PLUGINS = ["formats_json.obf"]


def _obabel_plugin_dir(venv_bin_dir):
    """Where openbabel-wheel puts its format plugin (.obf) files."""
    if platform.system() == "Windows":
        return os.path.join(VENV_DIR, "Lib", "site-packages", "openbabel", "bin")
    # venv_bin_dir is .../<venv>/bin ; site-packages sits next to it under lib/
    site_packages_guess = os.path.join(os.path.dirname(venv_bin_dir), "lib")
    if os.path.isdir(site_packages_guess):
        for entry in os.listdir(site_packages_guess):
            candidate = os.path.join(site_packages_guess, entry, "site-packages", "openbabel", "bin")
            if os.path.isdir(candidate):
                return candidate
    return None


def _obabel_health_check(obabel_path):
    """
    Run obabel with a timeout to check it actually works, instead of letting
    a hung/crashed process (e.g. a Windows 'entry point not found' popup)
    block setup forever. `-L formats` is used deliberately - it forces obabel
    to load every installed format plugin, which is exactly the step that
    fails when a plugin file is broken (a lighter command like `-V` can
    succeed even though a broken plugin is present).
    """
    try:
        result = subprocess.run(
            [obabel_path, "-L", "formats"], capture_output=True, text=True, timeout=15
        )
        return result.returncode == 0 and "pdb" in result.stdout.lower()
    except (subprocess.TimeoutExpired, OSError):
        return False


def _disable_known_broken_obabel_plugins(venv_bin_dir):
    plugin_dir = _obabel_plugin_dir(venv_bin_dir)
    if not plugin_dir or not os.path.isdir(plugin_dir):
        return False

    disabled_any = False
    for name in KNOWN_BROKEN_OBABEL_PLUGINS:
        path = os.path.join(plugin_dir, name)
        if os.path.isfile(path):
            try:
                os.rename(path, path + ".disabled")
                print(f"Disabled known-broken Open Babel plugin: {path}")
                disabled_any = True
            except OSError as exc:
                print(f"WARNING: could not disable {path}: {exc}")
    return disabled_any


def step_install_obabel(skip):
    banner("4/4  Open Babel (obabel)")
    if skip:
        print("Skipped (--skip-openbabel).")
        return

    # Already available system-wide (Homebrew, apt, conda, a previous manual
    # install, ...)? Nothing to do.
    existing = shutil.which("obabel") or shutil.which("obabel.exe")
    if existing:
        print(f"Open Babel already available: {existing}")
        return

    py = venv_python_path()
    print("Installing Open Babel via pip ('openbabel-wheel' - prebuilt for Windows/macOS/Linux)...")
    try:
        run([py, "-m", "pip", "install", "openbabel-wheel"])
    except subprocess.CalledProcessError:
        print(
            "\nWARNING: automatic Open Babel install failed (no prebuilt wheel for "
            "your Python version/OS, or a network issue)."
        )
        _print_obabel_manual_instructions()
        return

    # openbabel-wheel installs the `obabel` CLI next to the venv's own
    # Python interpreter, not necessarily on the system PATH - check there
    # directly rather than relying on shutil.which().
    venv_bin_dir = os.path.dirname(py)
    exe_name = "obabel.exe" if platform.system() == "Windows" else "obabel"
    candidate = os.path.join(venv_bin_dir, exe_name)
    if not os.path.isfile(candidate):
        print("WARNING: openbabel-wheel installed, but the 'obabel' command wasn't found where expected.")
        _print_obabel_manual_instructions()
        return

    print(f"Open Babel installed at {candidate}")
    print("Verifying it actually runs...")
    if _obabel_health_check(candidate):
        print("Open Babel is working.")
        return

    # A known bug in some Windows builds: a specific format plugin fails to
    # load and blocks obabel with a system popup. Disable it automatically
    # and retry - no user action needed for the common case.
    print("Open Babel didn't respond as expected - checking for a known plugin issue...")
    if _disable_known_broken_obabel_plugins(venv_bin_dir) and _obabel_health_check(candidate):
        print("Fixed automatically - Open Babel is working now.")
        return

    print(
        "\nWARNING: Open Babel was installed but isn't working correctly on this "
        "machine (this can happen with certain Windows setups)."
    )
    _print_obabel_manual_instructions()


def main():
    parser = argparse.ArgumentParser(description="Set up Dynamic Dock (cross-platform).")
    parser.add_argument("--skip-npm", action="store_true", help="Skip `npm install` for the frontend.")
    parser.add_argument("--skip-vina", action="store_true", help="Skip installing AutoDock Vina.")
    parser.add_argument(
        "--force-vina", action="store_true", help="Reinstall AutoDock Vina even if one is already present."
    )
    parser.add_argument("--skip-openbabel", action="store_true", help="Skip installing Open Babel.")
    args = parser.parse_args()

    print("Dynamic Dock setup")
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Detected OS:  {platform.system()} ({platform.machine()})")

    try:
        step_create_venv()
        step_npm_install(args.skip_npm)
        step_download_vina(args.skip_vina, args.force_vina)
        step_install_obabel(args.skip_openbabel)
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
