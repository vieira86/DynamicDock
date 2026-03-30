import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  Alert,
  Box,
  Divider,
  CircularProgress,
  Fade,
  Slide,
  IconButton,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Upload as UploadIcon,
  Search as SearchIcon,
  Science as ScienceIcon,
  ViewInAr as ViewIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon
} from '@mui/icons-material';
import axios from 'axios';
import MolecularViewer from './components/MolecularViewer';
import LigandInfo from './components/LigandInfo';
import DockingConfig from './components/DockingConfig';
import PdbSearch from './components/PdbSearch';

function App() {
  const theme = useTheme();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proteinData, setProteinData] = useState(null);
  const [pdbContent, setPdbContent] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'search'

  useEffect(() => {
    // Apply theme transitions
    document.body.style.transition = 'all 0.3s ease';
  }, [darkMode]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    console.log('File selected:', file); // Debug log
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
      
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      if (!fileContent || typeof fileContent !== 'string') {
        throw new Error('Invalid PDB file content');
      }

      // Don't set pdbContent here, let the API return it
      // setPdbContent(fileContent);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post('http://localhost:8000/api/upload-pdb', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
        maxContentLength: MAX_FILE_SIZE,
        retry: 3,
        retryDelay: 1000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${percentCompleted}%`);
        }
      });

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid server response');
      }

      // Use pdb_content from API response
      if (response.data.pdb_content) {
        setPdbContent(response.data.pdb_content);
      } else {
        throw new Error('No PDB content received from server');
      }

      setProteinData(response.data);
      setUploadedFile(file);
      
      // Debug logs
      console.log('Protein data received:', response.data);
      console.log('Type of protein data:', typeof response.data);
      console.log('Ligands:', response.data?.ligands);
      console.log('Type of ligands:', typeof response.data?.ligands);
      console.log('Main ligand:', response.data?.main_ligand);
      console.log('Type of main ligand:', typeof response.data?.main_ligand);
    } catch (err) {
      console.error('Upload error:', err);
      
      // Debug detalhado do erro
      console.log('Error details:', {
        message: err.message,
        response: err.response,
        request: err.request
      });
      
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
      
      const response = await axios.get(`http://localhost:8000/api/fetch-pdb/${pdbId}`, {
        timeout: 30000
      });

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid server response');
      }

      // Get PDB content from the response
      if (response.data.pdb_content) {
        setPdbContent(response.data.pdb_content);
      } else {
        throw new Error('No PDB content received from server');
      }

      setProteinData(response.data);
      setUploadedFile(null);
    } catch (err) {
      console.error('PDB search error:', err);
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

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: darkMode 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 50%, #16213e 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
      py: 3,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: darkMode 
          ? 'radial-gradient(circle at 20% 50%, #4facfe 0%, transparent 50%), radial-gradient(circle at 80% 80%, #f093fb 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 50%, #667eea 0%, transparent 50%), radial-gradient(circle at 80% 80%, #f5576c 0%, transparent 50%)',
        animation: 'pulse 4s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.1 },
          '50%': { opacity: 0.2 }
        }
      }} />

      <Container maxWidth="xl">
        <Box sx={{ maxWidth: '1800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Slide direction="down" in={true} timeout={800}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                <ScienceIcon sx={{ fontSize: 48, color: darkMode ? '#64b5f6' : '#fff' }} />
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 'bold',
                    background: darkMode 
                      ? 'linear-gradient(45deg, #fff, #e0e0e0)'
                      : 'linear-gradient(45deg, #fff, #f0f0f0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(255,255,255,0.3)',
                    letterSpacing: 1
                  }}
                >
                  Dynamic Dock
                </Typography>
                <ScienceIcon sx={{ fontSize: 48, color: darkMode ? '#64b5f6' : '#fff' }} />
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: darkMode ? '#b0bec5' : 'rgba(255,255,255,0.9)',
                  fontWeight: 300,
                  letterSpacing: 0.5
                }}
              >
                Advanced Molecular Docking Platform
              </Typography>
            </Box>
          </Slide>

          {/* Theme Toggle */}
          <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
            <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <IconButton 
                onClick={() => setDarkMode(!darkMode)}
                sx={{
                  background: alpha(darkMode ? '#fff' : '#000', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(darkMode ? '#fff' : '#fff', 0.2)}`,
                  color: darkMode ? '#fff' : '#fff',
                  '&:hover': {
                    background: alpha(darkMode ? '#fff' : '#000', 0.2),
                  }
                }}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          <Fade in={true} timeout={1000}>
            <Grid container spacing={3}>
              {/* Left Column - Controls */}
              <Grid item xs={12} lg={4}>
                {/* Input Method Selection */}
                <Paper 
                  elevation={8} 
                  sx={{ 
                    p: 3, 
                    mb: 3,
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(darkMode ? '#fff' : '#000', 0.1)}`
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ color: darkMode ? '#64b5f6' : '#1976d2', fontWeight: 'bold' }}>
                    Load Protein Structure
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button
                      variant={activeTab === 'search' ? 'contained' : 'outlined'}
                      onClick={() => setActiveTab('search')}
                      startIcon={<SearchIcon />}
                      sx={{ 
                        flex: 1,
                        background: activeTab === 'search' 
                          ? 'linear-gradient(45deg, #2196f3, #1976d2)' 
                          : 'transparent',
                        borderColor: darkMode ? '#64b5f6' : '#1976d2',
                        color: activeTab === 'search' ? '#fff' : (darkMode ? '#64b5f6' : '#1976d2')
                      }}
                    >
                      Upload PDB
                    </Button>
                    <Button
                      variant={activeTab === 'upload' ? 'contained' : 'outlined'}
                      onClick={() => setActiveTab('upload')}
                      startIcon={<UploadIcon />}
                      sx={{ 
                        flex: 1,
                        background: activeTab === 'upload' 
                          ? 'linear-gradient(45deg, #2196f3, #1976d2)' 
                          : 'transparent',
                        borderColor: darkMode ? '#64b5f6' : '#1976d2',
                        color: activeTab === 'upload' ? '#fff' : (darkMode ? '#64b5f6' : '#1976d2')
                      }}
                    >
                      Search PDB
                    </Button>
                  </Box>

                  {activeTab === 'search' ? (
                    <Box>
                      <Button
                        variant="contained"
                        component="label"
                        fullWidth
                        disabled={loading}
                        sx={{ 
                          py: 2,
                          background: 'linear-gradient(45deg, #4caf50, #45a049)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #45a049, #3d8b40)',
                          },
                          boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                        }}
                      >
                        {loading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          uploadedFile?.name || 'Choose PDB File'
                        )}
                        <input
                          type="file"
                          hidden
                          accept=".pdb"
                          onChange={handleFileUpload}
                          disabled={loading}
                        />
                      </Button>
                    </Box>
                  ) : (
                    <PdbSearch onSearch={handlePdbSearch} loading={loading} darkMode={darkMode} />
                  )}

                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mt: 2,
                        background: darkMode ? 'rgba(244, 67, 54, 0.1)' : undefined,
                        color: darkMode ? '#ff8a80' : undefined
                      }}
                    >
                      {error}
                    </Alert>
                  )}
                </Paper>

                {/* Ligand Info Section */}
                {proteinData?.ligands && (
                  <Fade in={true} timeout={600}>
                    <Box>
                      <LigandInfo
                        ligands={proteinData.ligands || []}
                        mainLigand={proteinData.main_ligand || null}
                        darkMode={darkMode}
                      />
                    </Box>
                  </Fade>
                )}

                {/* Docking Config Section */}
                {proteinData?.clean_structure_path && proteinData?.active_site_coords && (
                  <Fade in={true} timeout={800}>
                    <Box>
                      <DockingConfig
                        proteinPath={proteinData.clean_structure_path}
                        activesite={proteinData.active_site_coords}
                        darkMode={darkMode}
                      />
                    </Box>
                  </Fade>
                )}
              </Grid>

              {/* Right Column - Viewer */}
              <Grid item xs={12} lg={8}>
                <Paper 
                  elevation={8} 
                  sx={{ 
                    height: '700px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(darkMode ? '#fff' : '#000', 0.1)}`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {loading ? (
                    <Box sx={{ textAlign: 'center' }}>
                      <CircularProgress size={60} thickness={4} />
                      <Typography 
                        sx={{ 
                          mt: 2, 
                          color: darkMode ? '#b0bec5' : '#666',
                          fontSize: '1.1rem'
                        }}
                      >
                        Loading structure...
                      </Typography>
                    </Box>
                  ) : pdbContent ? (
                    <Box sx={{ width: '100%', height: '100%', position: 'absolute' }}>
                      <MolecularViewer
                        pdbData={pdbContent}
                        style={{ width: '100%', height: '100%' }}
                        darkMode={darkMode}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', color: darkMode ? '#b0bec5' : '#666' }}>
                      <ViewIcon sx={{ fontSize: 80, mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" gutterBottom>
                        No Structure Loaded
                      </Typography>
                      <Typography variant="body2">
                        Upload a PDB file or search the PDB database to visualize molecular structures
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Fade>
        </Box>
      </Container>
    </Box>
  );
}

export default App;
