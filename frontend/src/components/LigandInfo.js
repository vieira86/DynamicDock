import React, { useState } from 'react';
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
  useTheme,
} from '@mui/material';
import {
  Science as ScienceIcon,
  CopyAll as CopyIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

const LigandInfo = ({ ligands = [], mainLigand = null }) => {
  const theme = useTheme();
  const [copied, setCopied] = useState('');

  const formatCoord = (coord) => (typeof coord === 'number' ? coord.toFixed(2) : 'N/A');

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
      ligandScore: ligand.ligand_score || 0,
    };
  };

  const formattedMainLigand = formatLigandData(mainLigand);
  const formattedLigands = ligands.map(formatLigandData).filter(Boolean);

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
    if (isMain) return theme.palette.success.main;
    if (score > 20) return theme.palette.info.main;
    if (score > 10) return theme.palette.warning.main;
    return theme.palette.text.secondary;
  };

  if (!formattedMainLigand && formattedLigands.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <InfoIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1.5, opacity: 0.8 }} />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            No Ligands Found
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
            This protein structure doesn't contain any ligands. Consider using{' '}
            <strong>blind docking</strong> or <strong>active site prediction</strong>.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Chip
              label="Blind Docking"
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.12),
                color: theme.palette.warning.main,
              }}
            />
            <Chip
              label="Active Site Prediction"
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.12),
                color: theme.palette.info.main,
              }}
            />
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.15), color: theme.palette.success.main }}>
          <ScienceIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Ligand Analysis
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formattedLigands.length} ligand{formattedLigands.length !== 1 ? 's' : ''} detected
          </Typography>
        </Box>
      </Box>

      {formattedMainLigand && (
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
              px: 1.5,
              py: 0.75,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              borderRadius: 2,
            }}
          >
            <CheckIcon sx={{ color: 'success.main', fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Primary Ligand
            </Typography>
            <Tooltip title="Used for active site detection">
              <InfoIcon sx={{ color: 'success.main', fontSize: 15, opacity: 0.7 }} />
            </Tooltip>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 700, width: '30%' }}>
                    Name
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formattedMainLigand.name}
                      size="small"
                      color="success"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 700 }}>
                    SMILES
                  </TableCell>
                  <TableCell sx={{ wordBreak: 'break-all' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                        {formattedMainLigand.smiles}
                      </Typography>
                      <Tooltip title={copied === formattedMainLigand.name ? 'Copied!' : 'Copy SMILES'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopySmiles(formattedMainLigand.smiles, formattedMainLigand.name)}
                          color={copied === formattedMainLigand.name ? 'success' : 'default'}
                        >
                          {copied === formattedMainLigand.name ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 700 }}>
                    Coordinates
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      X: {formatCoord(formattedMainLigand.coordinates.x)}, Y:{' '}
                      {formatCoord(formattedMainLigand.coordinates.y)}, Z:{' '}
                      {formatCoord(formattedMainLigand.coordinates.z)}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 700 }}>
                    Properties
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`${formattedMainLigand.atoms} atoms`} size="small" variant="outlined" />
                      <Chip label={`${formattedMainLigand.heavyAtoms} heavy`} size="small" variant="outlined" color="info" />
                      <Chip
                        label={`${formattedMainLigand.molecularWeight.toFixed(1)} Da`}
                        size="small"
                        variant="outlined"
                        color="warning"
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {formattedLigands.length > 0 && (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            Additional Ligands
            <Chip label={formattedLigands.length} size="small" color="info" variant="outlined" />
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SMILES</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Properties</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formattedLigands.map((ligand, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Chip
                        label={ligand.name}
                        size="small"
                        sx={{
                          bgcolor: getLigandColor(ligand.isMain, ligand.ligandScore),
                          color: '#fff',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: 'monospace', color: 'text.secondary', flex: 1 }}
                          noWrap
                        >
                          {ligand.smiles}
                        </Typography>
                        <Tooltip title={copied === ligand.name ? 'Copied!' : 'Copy SMILES'}>
                          <IconButton size="small" onClick={() => handleCopySmiles(ligand.smiles, ligand.name)}>
                            {copied === ligand.name ? (
                              <CheckIcon fontSize="small" color="success" />
                            ) : (
                              <CopyIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {ligand.atoms} atoms ({ligand.heavyAtoms} heavy)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {ligand.molecularWeight.toFixed(1)} Da
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ligand.ligandScore.toFixed(1)}
                        size="small"
                        variant="outlined"
                        sx={{ color: getLigandColor(ligand.isMain, ligand.ligandScore), borderColor: getLigandColor(ligand.isMain, ligand.ligandScore) }}
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
  );
};

export default LigandInfo;
