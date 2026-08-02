import React, { useState, useEffect, useMemo } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  AppBar,
  Toolbar,
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
  alpha,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Search as SearchIcon,
  Science as ScienceIcon,
  ViewInAr as ViewIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Hub as HubIcon,
} from '@mui/icons-material';
import getAppTheme from './theme';
import api from './api';
import MolecularViewer from './components/MolecularViewer';
import LigandInfo from './components/LigandInfo';
import DockingConfig from './components/DockingConfig';
import PdbSearch from './components/PdbSearch';
import InteractionViewer from './components/InteractionViewer';

const STEPS = ['Load Structure', 'Ligand Analysis', 'Configure Docking', 'Results'];

function App() {
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  );
  const theme = useMemo(() => getAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proteinData, setProteinData] = useState(null);
  const [pdbContent, setPdbContent] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [dockingResults, setDockingResults] = useState(null);
  const [viewerTab, setViewerTab] = useState('3d');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/health')
      .then((res) => {
        if (!cancelled) setHealth(res.data);
      })
      .catch(() => {
        if (!cancelled) setHealth({ error: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDockingResults(null);
    setViewerTab('3d');
  }, [proteinData]);

  const activeStep = dockingResults
    ? 3
    : proteinData?.clean_structure_path
    ? 2
    : proteinData
    ? 1
    : 0;

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdb')) {
      setError('Only .pdb files are allowed');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPdbContent(null);
      setProteinData(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/upload-pdb', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
        maxContentLength: MAX_FILE_SIZE,
      });

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid server response');
      }
      if (!response.data.pdb_content) {
        throw new Error('No PDB content received from server');
      }

      setPdbContent(response.data.pdb_content);
      setProteinData(response.data);
      setUploadedFile(file);
    } catch (err) {
      let errorMessage;
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please try again.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection and make sure the server is running.';
      } else if (err.response) {
        errorMessage = err.response.data?.detail || 'Server error occurred';
      } else if (err.request) {
        errorMessage = 'No response from server. Please check if the server is running.';
      } else {
        errorMessage = err.message || 'Failed to upload PDB file';
      }
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      setPdbContent(null);
      setProteinData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePdbSearch = async (pdbId) => {
    try {
      setLoading(true);
      setError(null);
      setPdbContent(null);
      setProteinData(null);

      const response = await api.get(`/api/fetch-pdb/${pdbId}`, { timeout: 30000 });

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid server response');
      }
      if (!response.data.pdb_content) {
        throw new Error('No PDB content received from server');
      }

      setPdbContent(response.data.pdb_content);
      setProteinData(response.data);
      setUploadedFile(null);
    } catch (err) {
      let errorMessage;
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please try again.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection and make sure the server is running.';
      } else if (err.response) {
        errorMessage = err.response.data?.detail || 'Server error occurred';
        if (err.response.status === 404) {
          errorMessage = `PDB ID "${pdbId}" not found. Please check the ID and try again.`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check if the server is running.';
      } else {
        errorMessage = err.message || 'Failed to fetch PDB structure';
      }
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      setPdbContent(null);
      setProteinData(null);
    } finally {
      setLoading(false);
    }
  };

  const missingTools = [];
  if (health && !health.error) {
    if (!health.vina?.available) missingTools.push('AutoDock Vina');
    if (!health.obabel?.available) missingTools.push('Open Babel');
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          backgroundImage: darkMode
            ? `radial-gradient(circle at 15% 0%, ${alpha(theme.palette.primary.main, 0.18)}, transparent 45%), radial-gradient(circle at 85% 100%, ${alpha(theme.palette.secondary.main, 0.14)}, transparent 45%)`
            : `radial-gradient(circle at 15% 0%, ${alpha(theme.palette.primary.main, 0.08)}, transparent 45%), radial-gradient(circle at 85% 100%, ${alpha(theme.palette.secondary.main, 0.08)}, transparent 45%)`,
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          color="transparent"
          sx={{
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.default, 0.7),
          }}
        >
          <Toolbar sx={{ gap: 1.5 }}>
            <ScienceIcon sx={{ color: 'primary.main', fontSize: 30 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                Dynamic Dock
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Molecular Docking Platform
              </Typography>
            </Box>

            {missingTools.length > 0 && (
              <Tooltip title={`Missing on this machine: ${missingTools.join(', ')}. Run 'python setup.py' or see the README.`}>
                <Chip label="Setup needed" color="warning" size="small" variant="outlined" />
              </Tooltip>
            )}

            <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <IconButton onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ maxWidth: 1800, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
              <Stepper activeStep={activeStep} alternativeLabel>
                {STEPS.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {missingTools.length > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <strong>{missingTools.join(' and ')}</strong> not found on this machine. Docking will not
                work until they're installed. Run <code>python setup.py</code> from the project root, or see
                the README for manual installation instructions.
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12} lg={4}>
                <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 700 }}>
                    Load Protein Structure
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button
                      variant={activeTab === 'search' ? 'contained' : 'outlined'}
                      onClick={() => setActiveTab('search')}
                      startIcon={<SearchIcon />}
                      sx={{ flex: 1 }}
                    >
                      Search PDB
                    </Button>
                    <Button
                      variant={activeTab === 'upload' ? 'contained' : 'outlined'}
                      onClick={() => setActiveTab('upload')}
                      startIcon={<UploadIcon />}
                      sx={{ flex: 1 }}
                    >
                      Upload PDB
                    </Button>
                  </Box>

                  {activeTab === 'upload' ? (
                    <Button
                      variant="contained"
                      component="label"
                      fullWidth
                      disabled={loading}
                      color="success"
                      sx={{ py: 1.5 }}
                    >
                      {loading ? <CircularProgress size={22} color="inherit" /> : uploadedFile?.name || 'Choose PDB File'}
                      <input type="file" hidden accept=".pdb" onChange={handleFileUpload} disabled={loading} />
                    </Button>
                  ) : (
                    <PdbSearch onSearch={handlePdbSearch} loading={loading} />
                  )}

                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {error}
                    </Alert>
                  )}
                </Paper>

                {proteinData?.ligands && (
                  <LigandInfo ligands={proteinData.ligands || []} mainLigand={proteinData.main_ligand || null} />
                )}

                {proteinData?.clean_structure_path && proteinData?.active_site_coords && (
                  <DockingConfig
                    proteinPath={proteinData.clean_structure_path}
                    activesite={proteinData.active_site_coords}
                    onDockingComplete={(results) => {
                      setDockingResults(results);
                      if (results) setViewerTab('interactions');
                    }}
                  />
                )}
              </Grid>

              <Grid item xs={12} lg={8}>
                <Paper
                  variant="outlined"
                  sx={{
                    height: '700px',
                    position: 'sticky',
                    top: 88,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <Tabs
                    value={viewerTab}
                    onChange={(e, v) => setViewerTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 1, minHeight: 44 }}
                  >
                    <Tab value="3d" label="3D Structure" icon={<ViewIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 44 }} />
                    <Tab
                      value="interactions"
                      label="2D Interactions"
                      icon={<HubIcon fontSize="small" />}
                      iconPosition="start"
                      sx={{ minHeight: 44 }}
                    />
                  </Tabs>

                  <Box
                    sx={{
                      flex: 1,
                      position: 'relative',
                      overflow: viewerTab === '3d' ? 'hidden' : 'auto',
                      display: viewerTab === '3d' ? 'flex' : 'block',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {viewerTab === '3d' ? (
                      loading ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <CircularProgress size={56} thickness={4} />
                          <Typography sx={{ mt: 2, color: 'text.secondary' }}>Loading structure...</Typography>
                        </Box>
                      ) : pdbContent ? (
                        <Box sx={{ width: '100%', height: '100%', position: 'absolute' }}>
                          <MolecularViewer pdbData={pdbContent} style={{ width: '100%', height: '100%' }} />
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          <ViewIcon sx={{ fontSize: 72, mb: 2, opacity: 0.4 }} />
                          <Typography variant="h6" gutterBottom>
                            No Structure Loaded
                          </Typography>
                          <Typography variant="body2">
                            Upload a PDB file or search the PDB database to visualize molecular structures
                          </Typography>
                        </Box>
                      )
                    ) : (
                      <InteractionViewer
                        receptorPath={dockingResults?.receptor_path}
                        posesPath={dockingResults?.poses_path}
                        ligandSmiles={dockingResults?.ligand_smiles}
                        allScores={dockingResults?.all_scores}
                      />
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
