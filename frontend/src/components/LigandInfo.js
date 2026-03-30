import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Avatar,
  IconButton,
  Tooltip,
  alpha,
  Fade,
  Zoom
} from '@mui/material';
import {
  Science as ScienceIcon,
  CopyAll as CopyIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const LigandInfo = ({ ligands = [], mainLigand = null, darkMode }) => {
  const [copied, setCopied] = React.useState('');

  const formatCoord = (coord) => {
    return typeof coord === 'number' ? coord.toFixed(2) : 'N/A';
  };

  const formatLigandData = (ligand) => {
    if (!ligand || typeof ligand !== 'object') return null;

    return {
      name: ligand.name || 'Unknown',
      smiles: ligand.smiles || 'N/A',
      coordinates: ligand.coordinates || {},
      isMain: mainLigand?.name === ligand.name,
      atoms: ligand.atoms || 0,
      heavyAtoms: ligand.heavy_atoms || 0,
      molecularWeight: ligand.molecular_weight || 0,
      ligandScore: ligand.ligand_score || 0
    };
  };

  const formattedMainLigand = formatLigandData(mainLigand);
  const formattedLigands = ligands
    .map(formatLigandData)
    .filter(Boolean);

  const handleCopySmiles = async (smiles, ligandName) => {
    try {
      await navigator.clipboard.writeText(smiles);
      setCopied(ligandName);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getLigandColor = (isMain, score) => {
    if (isMain) return '#4caf50';
    if (score > 20) return '#2196f3';
    if (score > 10) return '#ff9800';
    return '#9e9e9e';
  };

  if (!formattedMainLigand && formattedLigands.length === 0) {
    return (
      <Fade in={true} timeout={600}>
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
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <InfoIcon sx={{ fontSize: 48, color: darkMode ? '#64b5f6' : '#1976d2', mb: 2 }} />
            <Typography 
              variant="h6" 
              sx={{ 
                color: darkMode ? '#fff' : '#333', 
                mb: 2,
                fontWeight: 'bold'
              }}
            >
              No Ligands Found
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: darkMode ? '#b0bec5' : '#666', 
                mb: 3,
                lineHeight: 1.6
              }}
            >
              This protein structure doesn't contain any ligands.<br />
              Consider using <strong>blind docking</strong> or <strong>active site prediction</strong> tools.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Chip 
                label="Blind Docking"
                size="small"
                sx={{
                  background: alpha('#ff9800', 0.1),
                  color: '#ff9800',
                  border: `1px solid ${alpha('#ff9800', 0.3)}`,
                  fontWeight: 'bold'
                }}
              />
              <Chip 
                label="Active Site Prediction"
                size="small"
                sx={{
                  background: alpha('#2196f3', 0.1),
                  color: '#2196f3',
                  border: `1px solid ${alpha('#2196f3', 0.3)}`,
                  fontWeight: 'bold'
                }}
              />
            </Box>
          </Box>
        </Paper>
      </Fade>
    );
  }

  return (
    <Fade in={true} timeout={600}>
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
        {/* Header with icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar 
            sx={{ 
              background: 'linear-gradient(45deg, #4caf50, #45a049)',
              boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)'
            }}
          >
            <ScienceIcon />
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
              Ligand Analysis
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: darkMode ? '#b0bec5' : '#666',
                fontStyle: 'italic'
              }}
            >
              {formattedLigands.length} ligand{formattedLigands.length !== 1 ? 's' : ''} detected
            </Typography>
          </Box>
        </Box>

        {/* Main Ligand Section */}
        {formattedMainLigand && (
          <Zoom in={true} timeout={800}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                px: 2,
                py: 1,
                background: alpha('#4caf50', 0.1),
                borderRadius: 2,
                border: `1px solid ${alpha('#4caf50', 0.3)}`
              }}>
                <CheckIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: darkMode ? '#4caf50' : '#2e7d32',
                    fontWeight: 'bold',
                    letterSpacing: 0.5
                  }}
                >
                  Primary Ligand
                </Typography>
                <Tooltip title="This is the main ligand used for active site detection">
                  <InfoIcon sx={{ color: '#4caf50', fontSize: 16, opacity: 0.7 }} />
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
                  border: `1px solid ${alpha('#4caf50', 0.2)}`
                }}
              >
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell 
                        component="th" 
                        sx={{ 
                          fontWeight: 'bold', 
                          width: '30%',
                          background: alpha('#4caf50', 0.05),
                          color: darkMode ? '#4caf50' : '#2e7d32'
                        }}
                      >
                        Name
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={formattedMainLigand.name} 
                          sx={{
                            background: 'linear-gradient(45deg, #4caf50, #45a049)',
                            color: '#fff',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                          }}
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell 
                        component="th" 
                        sx={{ 
                          fontWeight: 'bold',
                          background: alpha('#4caf50', 0.05),
                          color: darkMode ? '#4caf50' : '#2e7d32'
                        }}
                      >
                        SMILES
                      </TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace',
                              color: darkMode ? '#e0e0e0' : '#333',
                              flex: 1
                            }}
                          >
                            {formattedMainLigand.smiles}
                          </Typography>
                          <Tooltip title={copied === formattedMainLigand.name ? "Copied!" : "Copy SMILES"}>
                            <IconButton
                              size="small"
                              onClick={() => handleCopySmiles(formattedMainLigand.smiles, formattedMainLigand.name)}
                              sx={{
                                color: copied === formattedMainLigand.name ? '#4caf50' : (darkMode ? '#b0bec5' : '#666'),
                                '&:hover': {
                                  background: alpha('#4caf50', 0.1),
                                }
                              }}
                            >
                              {copied === formattedMainLigand.name ? <CheckIcon /> : <CopyIcon />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell 
                        component="th" 
                        sx={{ 
                          fontWeight: 'bold',
                          background: alpha('#4caf50', 0.05),
                          color: darkMode ? '#4caf50' : '#2e7d32'
                        }}
                      >
                        Coordinates
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            color: darkMode ? '#e0e0e0' : '#333'
                          }}
                        >
                          X: {formatCoord(formattedMainLigand.coordinates.x)}, 
                          Y: {formatCoord(formattedMainLigand.coordinates.y)}, 
                          Z: {formatCoord(formattedMainLigand.coordinates.z)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell 
                        component="th" 
                        sx={{ 
                          fontWeight: 'bold',
                          background: alpha('#4caf50', 0.05),
                          color: darkMode ? '#4caf50' : '#2e7d32'
                        }}
                      >
                        Properties
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Chip 
                            label={`${formattedMainLigand.atoms} atoms`}
                            size="small"
                            sx={{ 
                              background: alpha('#4caf50', 0.1),
                              color: darkMode ? '#4caf50' : '#2e7d32',
                              border: `1px solid ${alpha('#4caf50', 0.3)}`
                            }}
                          />
                          <Chip 
                            label={`${formattedMainLigand.heavyAtoms} heavy`}
                            size="small"
                            sx={{ 
                              background: alpha('#2196f3', 0.1),
                              color: darkMode ? '#64b5f6' : '#1976d2',
                              border: `1px solid ${alpha('#2196f3', 0.3)}`
                            }}
                          />
                          <Chip 
                            label={`${formattedMainLigand.molecularWeight.toFixed(1)} Da`}
                            size="small"
                            sx={{ 
                              background: alpha('#ff9800', 0.1),
                              color: darkMode ? '#ffb74d' : '#f57c00',
                              border: `1px solid ${alpha('#ff9800', 0.3)}`
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Zoom>
        )}

        {/* Other Ligands Section */}
        {formattedLigands.length > 0 && (
          <Box>
            <Typography 
              variant="subtitle1" 
              gutterBottom 
              sx={{ 
                color: darkMode ? '#64b5f6' : '#1976d2',
                fontWeight: 'bold',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              Additional Ligands
              <Chip 
                label={formattedLigands.length}
                size="small"
                sx={{ 
                  background: alpha('#2196f3', 0.1),
                  color: darkMode ? '#64b5f6' : '#1976d2',
                  border: `1px solid ${alpha('#2196f3', 0.3)}`
                }}
              />
            </Typography>
            
            <TableContainer 
              component={Paper} 
              variant="outlined" 
              sx={{ 
                background: darkMode 
                  ? alpha('#000', 0.2) 
                  : alpha('#fff', 0.8),
                backdropFilter: 'blur(5px)',
                maxHeight: 300,
                overflow: 'auto'
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      background: darkMode ? alpha('#64b5f6', 0.1) : alpha('#1976d2', 0.1),
                      color: darkMode ? '#64b5f6' : '#1976d2'
                    }}>
                      Name
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      background: darkMode ? alpha('#64b5f6', 0.1) : alpha('#1976d2', 0.1),
                      color: darkMode ? '#64b5f6' : '#1976d2'
                    }}>
                      SMILES
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      background: darkMode ? alpha('#64b5f6', 0.1) : alpha('#1976d2', 0.1),
                      color: darkMode ? '#64b5f6' : '#1976d2'
                    }}>
                      Properties
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      background: darkMode ? alpha('#64b5f6', 0.1) : alpha('#1976d2', 0.1),
                      color: darkMode ? '#64b5f6' : '#1976d2'
                    }}>
                      Score
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formattedLigands.map((ligand, index) => (
                    <TableRow 
                      key={index}
                      sx={{
                        '&:hover': {
                          background: darkMode ? alpha('#fff', 0.05) : alpha('#000', 0.02)
                        }
                      }}
                    >
                      <TableCell>
                        <Chip 
                          label={ligand.name} 
                          sx={{
                            background: getLigandColor(ligand.isMain, ligand.ligandScore),
                            color: '#fff',
                            fontWeight: 'bold',
                            boxShadow: `0 2px 8px ${alpha(getLigandColor(ligand.isMain, ligand.ligandScore), 0.3)}`
                          }}
                          size="small" 
                        />
                      </TableCell>
                      <TableCell sx={{ wordBreak: 'break-all', maxWidth: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontFamily: 'monospace',
                              color: darkMode ? '#b0bec5' : '#666',
                              flex: 1,
                              fontSize: '0.7rem'
                            }}
                            noWrap
                          >
                            {ligand.smiles}
                          </Typography>
                          <Tooltip title={copied === ligand.name ? "Copied!" : "Copy SMILES"}>
                            <IconButton
                              size="small"
                              onClick={() => handleCopySmiles(ligand.smiles, ligand.name)}
                              sx={{
                                color: copied === ligand.name ? '#4caf50' : (darkMode ? '#b0bec5' : '#666'),
                                '&:hover': {
                                  background: alpha('#4caf50', 0.1),
                                }
                              }}
                            >
                              {copied === ligand.name ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: darkMode ? '#b0bec5' : '#666' }}>
                            {ligand.atoms} atoms ({ligand.heavyAtoms} heavy)
                          </Typography>
                          <Typography variant="caption" sx={{ color: darkMode ? '#b0bec5' : '#666' }}>
                            {ligand.molecularWeight.toFixed(1)} Da
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={ligand.ligandScore.toFixed(1)}
                          size="small"
                          sx={{
                            background: alpha(getLigandColor(ligand.isMain, ligand.ligandScore), 0.1),
                            color: getLigandColor(ligand.isMain, ligand.ligandScore),
                            border: `1px solid ${alpha(getLigandColor(ligand.isMain, ligand.ligandScore), 0.3)}`,
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Fade>
  );
};

export default LigandInfo;
