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
  TableRow,
  Avatar,
  Tooltip,
  alpha,
  useTheme,
  Chip,
  LinearProgress,
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
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import api from '../api';

const DockingConfig = ({ proteinPath, activesite, onDockingComplete }) => {
  const theme = useTheme();
  const [ligandSmiles, setLigandSmiles] = useState('');
  const [boxSize, setBoxSize] = useState({ x: 20, y: 20, z: 20 });
  const [center, setCenter] = useState({ x: '', y: '', z: '' });
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
      setCenter({ x: activesite.x, y: activesite.y, z: activesite.z });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activesite]);

  const canDock =
    proteinPath && ligandSmiles && center.x !== '' && center.y !== '' && center.z !== '';

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
      setReportResults(null);
      setProgress(0);
      if (onDockingComplete) onDockingComplete(null);

      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 200);

      // output_dir is intentionally omitted - the backend picks an
      // OS-appropriate default location (see backend/app/paths.py). This
      // avoids hardcoding any machine-specific absolute path here.
      const dockingData = {
        receptor_path: proteinPath,
        ligand_smiles: ligandSmiles,
        center_x: parseFloat(center.x),
        center_y: parseFloat(center.y),
        center_z: parseFloat(center.z),
        size_x: parseFloat(boxSize.x),
        size_y: parseFloat(boxSize.y),
        size_z: parseFloat(boxSize.z),
      };

      const response = await api.post('/api/dock', dockingData);

      clearInterval(progressInterval);
      setProgress(100);

      const { binding_affinity, poses_path, complex_path, download_urls, all_scores, vina_log } =
        response.data;

      const newResults = {
        binding_affinity: typeof binding_affinity === 'number' ? binding_affinity : null,
        poses_path,
        complex_path,
        download_urls,
        all_scores,
        vina_log,
      };
      setResults(newResults);
      if (onDockingComplete) {
        onDockingComplete({
          ...newResults,
          receptor_path: proteinPath,
          ligand_smiles: ligandSmiles,
        });
      }
    } catch (err) {
      setProgress(0);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getAffinityColor = (affinity) => {
    if (!affinity) return theme.palette.text.secondary;
    if (affinity < -7) return theme.palette.success.main;
    if (affinity < -5) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getAffinityLabel = (affinity) => {
    if (!affinity) return 'N/A';
    if (affinity < -7) return 'Excellent';
    if (affinity < -5) return 'Good';
    return 'Poor';
  };

  const triggerBlobDownload = (blobData, filename) => {
    const blob = new Blob([blobData]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleDownloadComplex = async () => {
    try {
      const response = await api.get(results.download_urls?.all_poses, { responseType: 'blob' });
      triggerBlobDownload(response.data, 'docked_complex_all_poses.pdbqt');
    } catch (err) {
      console.error('Download failed:', err);
      setError(`Download failed: ${err.message}`);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      setError('');

      const reportRequest = {
        docking_result_path: results.poses_path,
        binding_affinity: results.binding_affinity,
        all_scores: results.all_scores,
        vina_log: results.vina_log,
      };

      const response = await api.post('/api/gerar-relatorio-docking', reportRequest);
      setReportResults(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate report';
      setError(errorMessage);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      if (!reportResults?.download_url) {
        setError('Report not available');
        return;
      }
      const response = await api.get(reportResults.download_url, { responseType: 'blob' });
      triggerBlobDownload(response.data, 'docking_results_report.txt');
    } catch (err) {
      console.error('Download report failed:', err);
      setError(`Failed to download report: ${err.message}`);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.15), color: theme.palette.secondary.main }}>
          <ScienceIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Molecular Docking
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            AutoDock Vina integration
          </Typography>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
            {progress < 30
              ? 'Initializing...'
              : progress < 60
              ? 'Preparing receptor...'
              : progress < 90
              ? 'Running docking simulation...'
              : 'Finalizing results...'}
          </Typography>
        </Box>
      )}

      <Grid container spacing={2.5}>
        {hasActiveSite && (
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1.5,
                px: 1.5,
                py: 0.75,
                bgcolor: alpha(theme.palette.info.main, 0.1),
                borderRadius: 2,
              }}
            >
              <LocationIcon sx={{ color: 'info.main', fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Active Site Coordinates
              </Typography>
              <Tooltip title="Auto-detected from ligand position">
                <InfoIcon sx={{ color: 'info.main', fontSize: 15, opacity: 0.7 }} />
              </Tooltip>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  {['x', 'y', 'z'].map((axis) => (
                    <TableRow key={axis}>
                      <TableCell sx={{ fontWeight: 700, width: '20%' }}>
                        {axis.toUpperCase()}{' '}
                        <Typography component="span" variant="caption" sx={{ opacity: 0.7 }}>
                          (Å)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {Number(activesite[axis]).toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        )}

        <Grid item xs={12}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            Ligand SMILES
            <Tooltip title="Enter the SMILES string of the ligand to dock">
              <InfoIcon sx={{ fontSize: 15, opacity: 0.5 }} />
            </Tooltip>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Enter SMILES string (e.g., C1=CC=CC=C1)"
            value={ligandSmiles}
            onChange={(e) => setLigandSmiles(e.target.value)}
            sx={{ '& .MuiOutlinedInput-input': { fontFamily: 'monospace' } }}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
            Docking Center Coordinates
          </Typography>
        </Grid>
        {['x', 'y', 'z'].map((axis) => (
          <Grid item xs={4} key={axis}>
            <TextField
              fullWidth
              type="number"
              label={`${axis.toUpperCase()} (Å)`}
              value={center[axis]}
              onChange={(e) => setCenter({ ...center, [axis]: e.target.value })}
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-input': { fontFamily: 'monospace' } }}
            />
          </Grid>
        ))}

        <Grid item xs={12}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            Search Box Size
            <Tooltip title="Defines the search space for docking">
              <InfoIcon sx={{ fontSize: 15, opacity: 0.5 }} />
            </Tooltip>
          </Typography>
        </Grid>
        {['x', 'y', 'z'].map((axis) => (
          <Grid item xs={4} key={axis}>
            <TextField
              fullWidth
              type="number"
              label={`Size ${axis.toUpperCase()} (Å)`}
              value={boxSize[axis]}
              onChange={(e) => setBoxSize({ ...boxSize, [axis]: Number(e.target.value) })}
              disabled={loading}
              inputProps={{ min: 1 }}
              sx={{ '& .MuiOutlinedInput-input': { fontFamily: 'monospace' } }}
            />
          </Grid>
        ))}

        <Grid item xs={12}>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={handleDock}
            disabled={loading || !canDock}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <StartIcon />}
            sx={{ py: 1.5 }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SpeedIcon sx={{ animation: 'spin 1s linear infinite' }} />
                <Typography>Running Docking Simulation...</Typography>
              </Box>
            ) : (
              'Start Molecular Docking'
            )}
          </Button>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" icon={<ErrorIcon />}>
              {error}
            </Alert>
          </Grid>
        )}

        {results && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 3, bgcolor: alpha(theme.palette.success.main, 0.04) }}>
              <Typography
                variant="h6"
                sx={{ mb: 2, color: 'success.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <ScienceIcon /> Docking Results
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <SuccessIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ color: 'success.main', fontWeight: 700 }}>
                    Docking Complete
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Simulation completed successfully
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 2 }}>
                    <Typography
                      variant="h4"
                      sx={{ color: getAffinityColor(results.binding_affinity), fontWeight: 700, fontFamily: 'monospace' }}
                    >
                      {results.binding_affinity !== null ? results.binding_affinity.toFixed(2) : 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      kcal/mol
                    </Typography>
                    <Chip
                      label={getAffinityLabel(results.binding_affinity)}
                      size="small"
                      sx={{
                        bgcolor: alpha(getAffinityColor(results.binding_affinity), 0.12),
                        color: getAffinityColor(results.binding_affinity),
                      }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      <strong>Poses:</strong> {results.poses_path ? 'Available' : 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      <strong>Complex:</strong> {results.complex_path ? 'Available' : 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ mt: 1, p: 2, bgcolor: alpha(theme.palette.success.main, 0.06), borderRadius: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 2, color: 'success.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <DownloadIcon fontSize="small" /> Download Complete Complex (All Poses)
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleDownloadComplex}
                        disabled={!results.download_urls?.all_poses}
                      >
                        Download Complex with All Poses (PDBQT)
                      </Button>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ mt: 1, p: 2, bgcolor: alpha(theme.palette.success.main, 0.06), borderRadius: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 2, color: 'success.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <FileDownloadIcon fontSize="small" /> Docking Results Report
                    </Typography>

                    {!reportResults ? (
                      <Box sx={{ textAlign: 'center' }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="large"
                          startIcon={reportLoading ? <CircularProgress size={18} color="inherit" /> : <FileDownloadIcon />}
                          onClick={handleGenerateReport}
                          disabled={reportLoading || !results?.poses_path}
                        >
                          {reportLoading ? 'Generating Report...' : 'Generate Results Report'}
                        </Button>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                          Create a comprehensive docking results report
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Box sx={{ mb: 2, p: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="subtitle1" sx={{ color: 'success.main', fontWeight: 700, mb: 1 }}>
                            Report Generated Successfully
                          </Typography>
                          {results.binding_affinity && (
                            <Box>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                <strong>Best Binding Affinity:</strong> {results.binding_affinity.toFixed(2)} kcal/mol
                              </Typography>
                              {results.all_scores && (
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                  <strong>Total Poses:</strong> {results.all_scores.length}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleDownloadReport}
                            disabled={!reportResults.download_url}
                          >
                            Download Report (TXT)
                          </Button>
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                            Complete analysis with all docking results and statistics
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default DockingConfig;
