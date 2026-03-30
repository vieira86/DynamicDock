import React, { useState, useEffect } from 'react';
import {
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  alpha,
  Fade,
  Zoom,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Science as ScienceIcon,
  PlayArrow as StartIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  MyLocation as LocationIcon,
  Download as DownloadIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import axios from 'axios';

const DockingConfig = ({ proteinPath, activesite, darkMode }) => {
  const [ligandSmiles, setLigandSmiles] = useState('');
  const [boxSize, setBoxSize] = useState({ x: 20, y: 20, z: 20 });
  const [center, setCenter] = useState({ x: '', y: '', z: '' });
  const [outputDir] = useState('/Users/rafaelvieira/Desktop/Dynamic_Dock/vina');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResults, setReportResults] = useState(null);

  const hasActiveSite =
    activesite &&
    typeof activesite.x === 'number' &&
    typeof activesite.y === 'number' &&
    typeof activesite.z === 'number';

  useEffect(() => {
    if (hasActiveSite) {
      setCenter({
        x: activesite.x,
        y: activesite.y,
        z: activesite.z
      });
    }
  }, [activesite]);

  const canDock =
    proteinPath &&
    ligandSmiles &&
    center.x !== '' &&
    center.y !== '' &&
    center.z !== '';

  const formatErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === 'string') return detail;
    }
    return error?.message || 'Docking failed';
  };

  const handleDock = async () => {
    try {
      setLoading(true);
      setError('');
      setResults(null);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 200);

      const dockingData = {
        receptor_path: proteinPath,
        ligand_smiles: ligandSmiles,
        center_x: parseFloat(center.x),
        center_y: parseFloat(center.y),
        center_z: parseFloat(center.z),
        size_x: parseFloat(boxSize.x),
        size_y: parseFloat(boxSize.y),
        size_z: parseFloat(boxSize.z),
        output_dir: outputDir
      };

      const response = await axios.post(
        'http://localhost:8000/api/dock',
        dockingData
      );

      clearInterval(progressInterval);
      setProgress(100);

      const { binding_affinity, poses_path, complex_path, download_urls, all_scores, vina_log } = response.data;

      setResults({
        binding_affinity:
          typeof binding_affinity === 'number' ? binding_affinity : null,
        poses_path,
        complex_path,
        download_urls,
        all_scores,
        vina_log  // Adicionar o log do Vina aos resultados
      });

    } catch (err) {
      setProgress(0);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getAffinityColor = (affinity) => {
    if (!affinity) return '#9e9e9e';
    if (affinity < -7) return '#4caf50'; // Excellent
    if (affinity < -5) return '#ff9800'; // Good
    return '#f44336'; // Poor
  };

  const getAffinityLabel = (affinity) => {
    if (!affinity) return 'N/A';
    if (affinity < -7) return 'Excellent';
    if (affinity < -5) return 'Good';
    return 'Poor';
  };

  const handleDownloadComplex = async () => {
    try {
      console.log('Download button clicked - starting download process');
      
      // Download PDBQT file with all poses using axios
      const response = await axios.get(`http://localhost:8000/api${results.download_urls?.all_poses}`, {
        responseType: 'blob'
      });
      
      console.log('Download response received, creating blob');
      
      // Create blob URL
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      
      console.log('Blob created, URL:', downloadUrl);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'docked_complex_all_poses.pdbqt');
      link.setAttribute('target', '_blank');
      
      console.log('Download link created, triggering click');
      
      // Trigger download with user choice
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download process completed successfully');
    } catch (err) {
      console.error('Download failed:', err);
      setError(`Download failed: ${err.message}`);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      setError('');
      
      console.log('Iniciando geração de relatório de docking...');
      
      const reportRequest = {
        docking_result_path: results.poses_path,
        binding_affinity: results.binding_affinity,
        all_scores: results.all_scores,
        vina_log: results.vina_log  // Adicionar o log do Vina
      };
      
      const response = await axios.post(
        'http://localhost:8000/api/gerar-relatorio-docking',
        reportRequest
      );
      
      console.log('Relatório gerado com sucesso:', response.data);
      setReportResults(response.data);
      
    } catch (err) {
      console.error('Erro na geração do relatório:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Erro ao gerar relatório';
      setError(errorMessage);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      if (!reportResults?.download_url) {
        setError('Relatório não disponível');
        return;
      }
      
      console.log('Download report clicked');
      
      const response = await axios.get(`http://localhost:8000/api${reportResults.download_url}`, {
        responseType: 'blob'
      });
      
      // Create blob URL
      const blob = new Blob([response.data], { type: 'text/plain' });
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'docking_results_report.txt');
      link.setAttribute('target', '_blank');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('Docking report downloaded successfully');
    } catch (err) {
      console.error('Download report failed:', err);
      setError(`Erro ao baixar relatório: ${err.message}`);
    }
  };

  return (
    <Fade in={true} timeout={800}>
      <Paper 
        elevation={8} 
        sx={{ 
          p: 3, 
          mb: 3,
          background: darkMode 
            ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(darkMode ? '#fff' : '#000', 0.1)}`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar 
            sx={{ 
              background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
              boxShadow: '0 4px 10px rgba(255, 107, 107, 0.3)'
            }}
          >
            <ScienceIcon />
          </Avatar>
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color: darkMode ? '#ff6b6b' : '#e53935',
                fontWeight: 'bold',
                letterSpacing: 0.5
              }}
            >
              Molecular Docking
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: darkMode ? '#b0bec5' : '#666',
                fontStyle: 'italic'
              }}
            >
              AutoDock Vina integration
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                height: 8,
                borderRadius: 4,
                background: alpha('#000', 0.1),
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                  borderRadius: 4,
                }
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                color: darkMode ? '#b0bec5' : '#666',
                mt: 1,
                display: 'block'
              }}
            >
              {progress < 30 ? 'Initializing...' : 
               progress < 60 ? 'Preparing receptor...' :
               progress < 90 ? 'Running docking simulation...' :
               'Finalizing results...'}
            </Typography>
          </Box>
        )}

        <Grid container spacing={3}>

          {/* ACTIVE SITE DISPLAY */}
          {hasActiveSite && (
            <Grid item xs={12}>
              <Zoom in={true} timeout={600}>
                <Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mb: 2,
                    px: 2,
                    py: 1,
                    background: alpha('#2196f3', 0.1),
                    borderRadius: 2,
                    border: `1px solid ${alpha('#2196f3', 0.3)}`
                  }}>
                    <LocationIcon sx={{ color: '#2196f3', fontSize: 20 }} />
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        color: darkMode ? '#64b5f6' : '#1976d2',
                        fontWeight: 'bold',
                        letterSpacing: 0.5
                      }}
                    >
                      Active Site Coordinates
                    </Typography>
                    <Tooltip title="Auto-detected from ligand position">
                      <InfoIcon sx={{ color: '#2196f3', fontSize: 16, opacity: 0.7 }} />
                    </Tooltip>
                  </Box>
                  
                  <TableContainer 
                    component={Paper} 
                    variant="outlined" 
                    sx={{ 
                      background: darkMode 
                        ? alpha('#000', 0.2) 
                        : alpha('#fff', 0.8),
                      backdropFilter: 'blur(5px)',
                      border: `1px solid ${alpha('#2196f3', 0.2)}`
                    }}
                  >
                    <Table size="small">
                      <TableBody>
                        {['x','y','z'].map((axis) => (
                          <TableRow key={axis}>
                            <TableCell 
                              sx={{ 
                                fontWeight: 'bold',
                                width: '20%',
                                background: alpha('#2196f3', 0.05),
                                color: darkMode ? '#64b5f6' : '#1976d2'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {axis.toUpperCase()}
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                  (Å)
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontFamily: 'monospace',
                                  color: darkMode ? '#e0e0e0' : '#333',
                                  fontWeight: 'bold'
                                }}
                              >
                                {Number(activesite[axis]).toFixed(2)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Zoom>
            </Grid>
          )}

          {/* SMILES INPUT */}
          <Grid item xs={12}>
            <Typography 
              variant="subtitle2" 
              gutterBottom 
              sx={{ 
                color: darkMode ? '#e0e0e0' : '#333',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              Ligand SMILES
              <Tooltip title="Enter the SMILES string of the ligand to dock">
                <InfoIcon sx={{ fontSize: 16, opacity: 0.5 }} />
              </Tooltip>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Enter SMILES string (e.g., C1=CC=CC=C1)"
              value={ligandSmiles}
              onChange={(e) => setLigandSmiles(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: darkMode 
                    ? alpha('#fff', 0.05) 
                    : alpha('#000', 0.02),
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: darkMode 
                      ? alpha('#fff', 0.08) 
                      : alpha('#000', 0.04),
                  },
                  '&.Mui-focused': {
                    background: darkMode 
                      ? alpha('#fff', 0.1) 
                      : alpha('#000', 0.06),
                    boxShadow: `0 0 0 2px ${alpha('#ff6b6b', 0.3)}`,
                  },
                },
                '& .MuiOutlinedInput-input': {
                  color: darkMode ? '#fff' : '#333',
                  fontFamily: 'monospace',
                  fontWeight: 500,
                },
              }}
            />
          </Grid>

          {/* COORDINATES INPUT */}
          <Grid item xs={12}>
            <Typography 
              variant="subtitle2" 
              gutterBottom 
              sx={{ 
                color: darkMode ? '#e0e0e0' : '#333',
                fontWeight: 'bold'
              }}
            >
              Docking Center Coordinates
            </Typography>
          </Grid>

          {['x','y','z'].map((axis) => (
            <Grid item xs={4} key={axis}>
              <TextField
                fullWidth
                type="number"
                label={`${axis.toUpperCase()} (Å)`}
                value={center[axis]}
                onChange={(e) =>
                  setCenter({ ...center, [axis]: e.target.value })
                }
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: darkMode 
                      ? alpha('#fff', 0.05) 
                      : alpha('#000', 0.02),
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                  },
                  '& .MuiOutlinedInput-input': {
                    color: darkMode ? '#fff' : '#333',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                  },
                }}
              />
            </Grid>
          ))}

          {/* BOX SIZE */}
          <Grid item xs={12}>
            <Typography 
              variant="subtitle2" 
              gutterBottom 
              sx={{ 
                color: darkMode ? '#e0e0e0' : '#333',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              Search Box Size
              <Tooltip title="Defines the search space for docking">
                <InfoIcon sx={{ fontSize: 16, opacity: 0.5 }} />
              </Tooltip>
            </Typography>
          </Grid>

          {['x','y','z'].map((axis) => (
            <Grid item xs={4} key={axis}>
              <TextField
                fullWidth
                type="number"
                label={`Size ${axis.toUpperCase()} (Å)`}
                value={boxSize[axis]}
                onChange={(e) =>
                  setBoxSize({ ...boxSize, [axis]: Number(e.target.value) })
                }
                disabled={loading}
                inputProps={{ min: 1 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: darkMode 
                      ? alpha('#fff', 0.05) 
                      : alpha('#000', 0.02),
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                  },
                  '& .MuiOutlinedInput-input': {
                    color: darkMode ? '#fff' : '#333',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                  },
                }}
              />
            </Grid>
          ))}

          {/* DOCKING BUTTON */}
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleDock}
              disabled={loading || !canDock}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <StartIcon />}
              sx={{ 
                py: 2,
                background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #ee5a24, #ff6b6b)',
                },
                '&.Mui-disabled': {
                  background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                },
                boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                borderRadius: 2,
                fontWeight: 'bold',
                letterSpacing: 0.5,
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SpeedIcon sx={{ animation: 'spin 1s linear infinite' }} />
                  <Typography>Running Docking Simulation...</Typography>
                </Box>
              ) : (
                'Start Molecular Docking'
              )}
            </Button>
          </Grid>

          {/* ERROR DISPLAY */}
          {error && (
            <Grid item xs={12}>
              <Zoom in={true} timeout={400}>
                <Alert 
                  severity="error" 
                  icon={<ErrorIcon />}
                  sx={{ 
                    background: darkMode ? 'rgba(244, 67, 54, 0.1)' : undefined,
                    color: darkMode ? '#ff8a80' : undefined,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      color: darkMode ? '#ff8a80' : '#f44336'
                    }
                  }}
                >
                  {error}
                </Alert>
              </Zoom>
            </Grid>
          )}

          {/* RESULTS DISPLAY */}
          {results && (
            <Grid item xs={12}>
              <Zoom in={true} timeout={600}>
                <Paper 
                  elevation={8} 
                  sx={{ 
                    p: 3, 
                    mb: 3,
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
                    borderRadius: 3
                  }}
                >
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      mb: 2,
                      color: darkMode ? '#4caf50' : '#2e7d32',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <ScienceIcon sx={{ mr: 1 }} />
                    Docking Results
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        background: 'linear-gradient(45deg, #4caf50, #45a049)',
                        boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)'
                      }}
                    >
                      <SuccessIcon />
                    </Avatar>
                    <Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: darkMode ? '#4caf50' : '#2e7d32',
                          fontWeight: 'bold',
                          letterSpacing: 0.5
                        }}
                      >
                        Docking Complete
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: darkMode ? '#b0bec5' : '#666',
                          fontStyle: 'italic'
                        }}
                      >
                        Simulation completed successfully
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ textAlign: 'center', p: 2, background: alpha('#000', 0.02), borderRadius: 2 }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            color: getAffinityColor(results.binding_affinity),
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                          }}
                        >
                          {results.binding_affinity !== null
                            ? `${results.binding_affinity.toFixed(2)}`
                            : 'N/A'}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: darkMode ? '#b0bec5' : '#666',
                            mb: 1
                          }}
                        >
                          kcal/mol
                        </Typography>
                        <Chip 
                          label={getAffinityLabel(results.binding_affinity)}
                          size="small"
                          sx={{
                            background: alpha(getAffinityColor(results.binding_affinity), 0.1),
                            color: getAffinityColor(results.binding_affinity),
                            border: `1px solid ${alpha(getAffinityColor(results.binding_affinity), 0.3)}`,
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    </Grid>
                    
                    {/* Download Buttons */}
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, p: 2, background: alpha('#4caf50', 0.05), borderRadius: 2 }}>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            mb: 2,
                            color: darkMode ? '#4caf50' : '#2e7d32',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <DownloadIcon fontSize="small" />
                          Download Complete Complex (All Poses)
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleDownloadComplex}
                            disabled={!results.download_urls?.all_poses}
                            sx={{
                              background: 'linear-gradient(45deg, #4caf50, #45a049)',
                              color: '#fff',
                              fontSize: '1rem',
                              padding: '12px 24px',
                              '&:hover': {
                                background: 'linear-gradient(45deg, #45a049, #3d8b40)',
                                transform: 'translateY(-2px)'
                              }
                            }}
                          >
                            Download Complex with All Poses (PDBQT)
                          </Button>
                        </Box>
                      </Box>
                    </Grid>
                    
                    {/* Docking Report Section */}
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, p: 2, background: alpha('#4caf50', 0.05), borderRadius: 2 }}>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            mb: 2,
                            color: darkMode ? '#4caf50' : '#2e7d32',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <FileDownloadIcon fontSize="small" />
                          Docking Results Report
                        </Typography>
                        
                        {!reportResults ? (
                          <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Button
                              variant="contained"
                              size="large"
                              startIcon={reportLoading ? <CircularProgress size={20} color="inherit" /> : <FileDownloadIcon />}
                              onClick={handleGenerateReport}
                              disabled={reportLoading || !results?.poses_path}
                              sx={{
                                background: 'linear-gradient(45deg, #4caf50, #45a049)',
                                color: '#fff',
                                fontSize: '1rem',
                                padding: '12px 24px',
                                '&:hover': {
                                  background: 'linear-gradient(45deg, #45a049, #3d8b40)',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              {reportLoading ? 'Generating Report...' : 'Generate Results Report'}
                            </Button>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block',
                                mt: 1,
                                color: darkMode ? '#b0bec5' : '#666',
                                fontStyle: 'italic'
                              }}
                            >
                              Create a comprehensive docking results report
                            </Typography>
                          </Box>
                        ) : (
                          <Box>
                            {/* Report Results Display */}
                            <Box sx={{ mb: 2, p: 2, background: alpha('#000', 0.02), borderRadius: 2 }}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography 
                                  variant="h6" 
                                  sx={{ 
                                    color: darkMode ? '#4caf50' : '#2e7d32',
                                    fontWeight: 'bold',
                                    mb: 1
                                  }}
                                >
                                  ✅ Report Generated Successfully
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: darkMode ? '#b0bec5' : '#666',
                                    mb: 2
                                  }}
                                >
                                  Comprehensive docking analysis report is ready for download
                                </Typography>
                                
                                {/* Report Summary */}
                                {results.binding_affinity && (
                                  <Box sx={{ mb: 2 }}>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        color: darkMode ? '#e0e0e0' : '#333',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem'
                                      }}
                                    >
                                      <strong>Best Binding Affinity:</strong> {results.binding_affinity.toFixed(2)} kcal/mol
                                    </Typography>
                                    {results.all_scores && (
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          color: darkMode ? '#e0e0e0' : '#333',
                                          fontFamily: 'monospace',
                                          fontSize: '0.9rem'
                                        }}
                                      >
                                        <strong>Total Poses:</strong> {results.all_scores.length}
                                      </Typography>
                                    )}
                                  </Box>
                                )}
                              </Box>
                            </Box>
                            
                            {/* Download Report Button */}
                            <Box sx={{ textAlign: 'center', mt: 2 }}>
                              <Button
                                variant="contained"
                                size="large"
                                startIcon={<FileDownloadIcon />}
                                onClick={handleDownloadReport}
                                disabled={!reportResults.download_url}
                                sx={{
                                  background: 'linear-gradient(45deg, #4caf50, #45a049)',
                                  color: '#fff',
                                  fontSize: '1rem',
                                  padding: '12px 24px',
                                  '&:hover': {
                                    background: 'linear-gradient(45deg, #45a049, #3d8b40)',
                                    transform: 'translateY(-2px)'
                                  }
                                }}
                              >
                                Download Report (TXT)
                              </Button>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  display: 'block',
                                  mt: 1,
                                  color: darkMode ? '#b0bec5' : '#666',
                                  fontStyle: 'italic'
                                }}
                              >
                                Complete analysis with all docking results and statistics
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 2 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: darkMode ? '#e0e0e0' : '#333',
                            mb: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.8rem'
                          }}
                        >
                          <strong>Poses:</strong> {results.poses_path ? 'Available' : 'N/A'}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: darkMode ? '#e0e0e0' : '#333',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem'
                          }}
                        >
                          <strong>Complex:</strong> {results.complex_path ? 'Available' : 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Zoom>
            </Grid>
          )}

        </Grid>
      </Paper>
    </Fade>
  );
};

export default DockingConfig;