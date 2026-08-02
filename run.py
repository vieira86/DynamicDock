#!/usr/bin/env python3
"""
Dynamic Dock - one-command launcher (Windows, Linux and macOS).

    python run.py

Starts the FastAPI backend (http://localhost:8000) and the React frontend
(http://localhost:3000) together, and stops both cleanly on Ctrl+C.

Run `python setup.py` first if you haven't already - this script expects the
virtual environment and node_modules it creates to already exist.
"""

import os
import platform
import shutil
import subprocess
import sys
import time

from setup import BACKEND_DIR, FRONTEND_DIR, VENV_DIR, venv_python_path


def main():
    py = venv_python_path()
    if not os.path.isfile(py):
        print("No virtual environment found.")
        print("Run 'python setup.py' first, then try again.")
        sys.exit(1)

    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        print("'npm' was not found on your PATH. Install Node.js 16+ from https://nodejs.org")
        sys.exit(1)

    if not os.path.isdir(os.path.join(FRONTEND_DIR, "node_modules")):
        print("Frontend dependencies not installed yet.")
        print("Run 'python setup.py' first, then try again.")
        sys.exit(1)

    print("Starting Dynamic Dock...")
    print("  Backend:  http://localhost:8000")
    print("  Frontend: http://localhost:3000")
    print("Press Ctrl+C to stop both.\n")

    backend_cmd = [py, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
    frontend_cmd = [npm, "start"]

    # On Windows, npm/node handle Ctrl+C best when given their own process
    # group so our signal doesn't race with theirs.
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if platform.system() == "Windows" else 0

    backend_proc = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR, creationflags=creationflags)
    time.sleep(1)  # give the backend a head start before opening the browser via CRA
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR, creationflags=creationflags)

    try:
        while True:
            backend_status = backend_proc.poll()
            frontend_status = frontend_proc.poll()
            if backend_status is not None:
                print(f"Backend exited with code {backend_status}.")
                break
            if frontend_status is not None:
                print(f"Frontend exited with code {frontend_status}.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping Dynamic Dock...")
    finally:
        for proc in (frontend_proc, backend_proc):
            if proc.poll() is None:
                proc.terminate()
        for proc in (frontend_proc, backend_proc):
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()


if __name__ == "__main__":
    main()
