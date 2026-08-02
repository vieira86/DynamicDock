# Dynamic Dock

A molecular docking platform for protein-ligand docking analysis and molecular dynamics preparation, with an interactive 3D viewer.

## Features

- PDB structure loading (via PDB ID search or file upload)
- Co-crystallized ligand detection and analysis
- Automatic active site identification
- Interactive 3D molecular visualization (3Dmol.js)
- Molecular docking powered by AutoDock Vina
- Downloadable results and docking reports

## Runs on Windows, Linux and macOS

Dynamic Dock is a local app: you download the project, run one setup command, and it works the same way on any of the three operating systems. No platform-specific steps required.

### Prerequisites

Install these once, regardless of OS:

- **Python 3.9+** — https://python.org (on Windows, tick "Add Python to PATH" during install)
- **Node.js 18+** (includes npm) — https://nodejs.org

You do **not** need to install AutoDock Vina or Open Babel yourself — `setup.py` below installs both automatically for your OS (Vina by downloading the official binary, Open Babel via the `openbabel-wheel` pip package). It also checks that Open Babel actually runs afterward and, on the rare Windows builds with a broken plugin, fixes that automatically too. Only if all of that fails does it print manual instructions (conda/brew/apt/installer) as a last resort.

### Quick start

From the project root, in a terminal:

```bash
python setup.py
python run.py
```

`setup.py` creates a Python virtual environment, installs backend dependencies, runs `npm install` for the frontend, downloads the AutoDock Vina binary for your OS, and installs Open Babel. `run.py` then starts both the backend and frontend together and opens the app at **http://localhost:3000**. Press `Ctrl+C` to stop.

Re-running `python setup.py` any time is safe — it skips steps that are already done (existing venv, existing Vina binary, Open Babel already installed) unless you pass `--force-vina`. Other flags: `--skip-npm`, `--skip-vina`, `--skip-openbabel`.

If something is still missing after setup (rare — e.g. no prebuilt Open Babel wheel exists yet for a brand-new Python version), Dynamic Dock still starts and shows a "Setup needed" banner in the UI explaining what to install manually.

### Manual setup (equivalent, if you prefer to run each step yourself)

**Backend:**

```bash
cd backend
python -m venv ../.venv        # or: poetry install, see pyproject.toml
../.venv/bin/pip install -r ../requirements.txt      # Windows: ..\.venv\Scripts\pip
../.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (in a second terminal):

```bash
cd frontend
npm install
npm start
```

The frontend expects the API at `http://localhost:8000` by default; override with `REACT_APP_API_URL` in `frontend/.env` if your backend runs elsewhere.

## Configuration

All configuration is via environment variables (optional — sensible defaults are used otherwise). Backend variables can be set either as real environment variables, or - more convenient, especially on Windows - by copying `.env.example` to `.env` in the project root and editing it as a plain text file:

| Variable | Where | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | frontend/.env | Backend URL the frontend talks to (default `http://localhost:8000`) |
| `VINA_EXECUTABLE` | backend (.env) | Full path to the AutoDock Vina binary, overriding auto-detection |
| `OBABEL_EXECUTABLE` | backend (.env) | Full path to `obabel`, overriding auto-detection |
| `DYNAMIC_DOCK_VINA_DIR` | backend (.env) | Where the Vina binary/results live (default `<project>/vina`) |
| `DYNAMIC_DOCK_RESULTS_DIR` | backend (.env) | Where docking results are written (default `<vina>/results`) |
| `DYNAMIC_DOCK_CORS_ORIGINS` | backend (.env) | Extra comma-separated origins allowed to call the API |

## Troubleshooting

- **"AutoDock Vina executable was not found"** — run `python setup.py` again (check your internet connection), or download it manually from https://github.com/ccsb-scripps/AutoDock-Vina/releases and place it at `vina/vina` (`vina/vina.exe` on Windows).
- **"Open Babel was not found"** — re-run `python setup.py`. It installs Open Babel via pip, verifies it actually runs, and auto-fixes the known Windows plugin bug described below if it hits it. If it still fails after that, see [Open Babel via conda](#open-babel-via-conda-last-resort) as a last resort.
- **`obabel.exe` shows a Windows "entry point not found" popup for a specific plugin (e.g. `formats_json.obf`)** — this is a broken/incompatible plugin file in a specific `openbabel-wheel` build, not a missing Visual C++ Redistributable. `setup.py` now detects this automatically (it runs a health check after installing) and disables the offending plugin for you — just re-run `python setup.py`, no manual steps needed. If it's still broken afterward, use the conda fallback below.
- **Check system status** — visit `http://localhost:8000/api/health` to see whether Vina/Open Babel are detected and where.
- **Port already in use** — stop whatever else is using 3000/8000, or change the backend port and update `REACT_APP_API_URL` accordingly.

### Open Babel via conda (last resort)

`setup.py` installs Open Babel automatically and self-heals the most common Windows issue (a broken format plugin), so most people never need this section. If `python setup.py` still reports Open Babel isn't working after a re-run, install it through conda instead - it's the most reliable distribution channel, especially on Windows - and point Dynamic Dock at it:

1. Install Miniconda if you don't already have Anaconda/Miniconda: https://docs.conda.io/en/latest/miniconda.html
2. Open the **Anaconda Prompt** (Windows) or a regular terminal (macOS/Linux) and create an environment with Open Babel in it:
   ```bash
   conda create -n dynamicdock_obabel -c conda-forge openbabel -y
   ```
3. Find the `obabel` executable's full path:
   ```bash
   conda activate dynamicdock_obabel
   where obabel        # Windows
   which obabel        # macOS/Linux
   ```
4. In the project root, copy `.env.example` to `.env` and add the path you just found, for example:
   ```
   OBABEL_EXECUTABLE=C:\Users\<you>\miniconda3\envs\dynamicdock_obabel\Library\bin\obabel.exe
   ```
5. Run setup skipping the pip-based Open Babel install, then start the app as usual:
   ```bash
   python setup.py --skip-openbabel
   python run.py
   ```

Setting `OBABEL_EXECUTABLE` in `.env` means Dynamic Dock always finds this Open Babel install, whether or not the conda environment happens to be active in your terminal.

## Project Structure

```
dynamic_dock/
├── frontend/            # React frontend (Material UI + 3Dmol.js)
├── backend/             # Python FastAPI backend
├── vina/                # AutoDock Vina binary (downloaded by setup.py) + results
├── setup.py             # Cross-platform one-time setup
├── run.py                # Cross-platform launcher (starts backend + frontend)
└── requirements.txt      # Backend Python dependencies (pip)
```

## License

MIT
