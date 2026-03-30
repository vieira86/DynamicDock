# Dynamic Dock

A molecular docking platform that enables protein-ligand docking analysis and molecular dynamics preparation.

## Features

- PDB structure loading (via PDB ID or file upload)
- Co-crystallized ligand analysis and visualization
- Active site identification
- Molecular docking using AutoDock Vina
- Results download and molecular dynamics preparation

## Project Structure

```
dynamic_dock/
├── frontend/           # React frontend application
├── backend/           # Python FastAPI backend
├── vina/              # AutoDock Vina executable
└── README.md         # This file
```

## System Requirements

- **Operating System**: macOS, Linux, or Windows (with WSL2)
- **Python**: 3.8 or higher
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: At least 2GB free space

## Prerequisites Installation

### 1. Install Python 3.8+

**macOS (using Homebrew):**
```bash
brew install python@3.9
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.9 python3.9-pip python3.9-venv
```

**Windows:**
Download and install from [python.org](https://www.python.org/downloads/)

### 2. Install Node.js 16+

**macOS (using Homebrew):**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download and install from [nodejs.org](https://nodejs.org/)

### 3. Install Poetry (Python Dependency Manager)

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

Add Poetry to your PATH (restart terminal after):
```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/Dynamic_Dock.git
cd Dynamic_Dock/Dynamic_Dock
```

### Step 2: Backend Setup

**Option A: Using Poetry (Recommended)**

1. **Navigate to the backend directory:**
```bash
cd backend
```

2. **Install Python dependencies using Poetry:**
```bash
poetry install
```

3. **Activate the virtual environment:**
```bash
poetry shell
```

4. **Verify installation:**
```bash
poetry run python -c "import rdkit, biopython; print('Dependencies installed successfully')"
```

**Option B: Using pip (Alternative)**

1. **Navigate to the backend directory:**
```bash
cd backend
```

2. **Create and activate a virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies using pip:**
```bash
pip install -r requirements.txt
```

⚠️ **Note**: Some dependencies like RDKit may be difficult to install with pip on certain systems. If you encounter issues, especially with RDKit, consider using conda:
```bash
conda install -c conda-forge rdkit biopython numpy
pip install fastapi uvicorn python-multipart pydantic python-dotenv requests starlette typing-extensions
```

4. **Verify installation:**
```bash
python -c "import rdkit, biopython; print('Dependencies installed successfully')"
```

### Step 3: Frontend Setup

1. **Navigate to the frontend directory (from the root directory):**
```bash
cd ../frontend
```

2. **Install Node.js dependencies:**
```bash
npm install
```

3. **Verify installation:**
```bash
npm --version
node --version
```

### Step 4: AutoDock Vina Setup

The project includes a pre-compiled AutoDock Vina executable in the `vina/` directory. 

**For macOS users:**
The executable `vina/autodock_vina_1_1_2_mac_catalina_64bit/` is already included.

**For Linux/Windows users:**
Download the appropriate version from [AutoDock Vina](http://vina.scripps.edu/download/) and place it in the `vina/` directory.

Make the executable executable (Linux/macOS):
```bash
chmod +x vina/vina
```

## Running the Application

### Option 1: Using the Root Script (Recommended)

From the root directory (`Dynamic_Dock/`):

```bash
npm start
```

This will start both the frontend and backend simultaneously.

### Option 2: Manual Startup

**Using Poetry:**
**Terminal 1 - Start Backend:**
```bash
cd backend
poetry shell
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm start
```

**Using pip:**
**Terminal 1 - Start Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm start
```

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Troubleshooting

### Common Issues

1. **Poetry not found:**
   - Ensure Poetry is installed and in your PATH
   - Restart your terminal after installation

2. **RDKit installation fails:**
   - RDKit requires conda on some systems. Consider using Miniconda:
   ```bash
   conda install -c conda-forge rdkit
   ```
   - Or use the pip alternative mentioned in Step 2

3. **Port already in use:**
   - Kill processes using ports 3000 or 8000:
   ```bash
   lsof -ti:3000 | xargs kill -9
   lsof -ti:8000 | xargs kill -9
   ```

4. **Permission denied on Vina executable:**
   ```bash
   chmod +x vina/vina
   ```

5. **Node.js version incompatible:**
   - Use nvm to manage Node.js versions:
   ```bash
   nvm install 18
   nvm use 18
   ```

### Verification Commands

**Check Python dependencies:**

**Using Poetry:**
```bash
cd backend
poetry run python -c "import fastapi, uvicorn, biopython, rdkit; print('All dependencies OK')"
```

**Using pip:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -c "import fastapi, uvicorn, biopython, rdkit; print('All dependencies OK')"
```

**Check Node.js dependencies:**
```bash
cd frontend
npm list --depth=0
```

## Development

### Running Tests

**Backend tests:**

**Using Poetry:**
```bash
cd backend
poetry run pytest
```

**Using pip:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
pytest
```

**Frontend tests:**
```bash
cd frontend
npm test
```

### Code Formatting

**Backend:**

**Using Poetry:**
```bash
cd backend
poetry run black .
poetry run isort .
```

**Using pip:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
black .
isort .
```

**Frontend:**
```bash
cd frontend
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Ensure all prerequisites are properly installed
