import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import api from '../api';

const DIAGRAM_SIZE = 560;
const CENTER = DIAGRAM_SIZE / 2;
const RADIUS = 215;
const LIGAND_BOX = { w: 260, h: 210 };
// Lines stop at 78% of the way to the residue label, leaving a visible gap
// before the chip so they never appear to run under the residue name.
const LINE_END_FACTOR = 0.78;

const INTERACTION_STYLES = {
  hydrogen_bond: { color: '#2e7d32', dash: '7,4', label: 'Hydrogen Bond' },
  salt_bridge: { color: '#e65100', dash: '2,3', label: 'Salt Bridge' },
  pi_stacking: { color: '#8e24aa', dash: '1,5', label: 'Pi-Stacking' },
  van_der_waals: { color: '#607d8b', dash: '0', label: 'Van der Waals / Hydrophobic' },
};
const TYPE_PRIORITY = ['hydrogen_bond', 'salt_bridge', 'pi_stacking', 'van_der_waals'];

const InteractionViewer = ({ receptorPath, posesPath, ligandSmiles, allScores }) => {
  const theme = useTheme();
  const [poseIndex, setPoseIndex] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!receptorPath || !posesPath) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .post('/api/analyze-interactions', {
        receptor_path: receptorPath,
        poses_path: posesPath,
        ligand_smiles: ligandSmiles,
        pose_index: poseIndex,
      })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.detail || err.message || 'Failed to analyze interactions');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receptorPath, posesPath, poseIndex]);

  const residues = useMemo(() => {
    if (!data?.interactions) return [];
    const map = {};
    data.interactions.forEach((it) => {
      const key = `${it.chain}:${it.res_number}`;
      if (!map[key]) {
        map[key] = { chain: it.chain, res_number: it.res_number, residue: it.residue, items: [] };
      }
      map[key].items.push(it);
    });
    return Object.values(map);
  }, [data]);

  if (!receptorPath || !posesPath) {
    return (
      <Box sx={{ textAlign: 'center', color: 'text.secondary', p: 4 }}>
        <Typography variant="h6" gutterBottom>
          No Docking Results Yet
        </Typography>
        <Typography variant="body2">
          Run a docking simulation to see the 2D interaction diagram here.
        </Typography>
      </Box>
    );
  }

  if (loading && !data) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2, color: 'text.secondary' }}>Analyzing interactions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const dominantType = (items) => TYPE_PRIORITY.find((t) => items.some((i) => i.type === t)) || 'van_der_waals';

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          Simplified geometric analysis (distance-based) - not a full physics fingerprint.
        </Typography>
        {allScores?.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Pose</InputLabel>
            <Select value={poseIndex} label="Pose" onChange={(e) => setPoseIndex(e.target.value)}>
              {allScores.map((s) => (
                <MenuItem key={s.mode} value={s.mode}>
                  Pose {s.mode} ({s.affinity.toFixed(2)} kcal/mol)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Box
        sx={{
          position: 'relative',
          width: DIAGRAM_SIZE,
          height: DIAGRAM_SIZE,
          mx: 'auto',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        <svg
          width={DIAGRAM_SIZE}
          height={DIAGRAM_SIZE}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        >
          {residues.map((res, idx) => {
            const angle = (idx / Math.max(residues.length, 1)) * 2 * Math.PI - Math.PI / 2;
            const x = CENTER + RADIUS * Math.cos(angle);
            const y = CENTER + RADIUS * Math.sin(angle);
            const dx = x - CENTER;
            const dy = y - CENTER;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            // Stop the line short of the residue label so it never runs
            // under the chip's text, regardless of label length.
            const endX = CENTER + dx * LINE_END_FACTOR;
            const endY = CENTER + dy * LINE_END_FACTOR;

            return res.items.map((item, i) => {
              const offset = (i - (res.items.length - 1) / 2) * 6;
              const px = (-dy / len) * offset;
              const py = (dx / len) * offset;
              const style = INTERACTION_STYLES[item.type] || INTERACTION_STYLES.van_der_waals;
              return (
                <line
                  key={`${res.chain}-${res.res_number}-${item.type}-${i}`}
                  x1={CENTER + px}
                  y1={CENTER + py}
                  x2={endX + px}
                  y2={endY + py}
                  stroke={style.color}
                  strokeWidth={2}
                  strokeDasharray={style.dash}
                  opacity={0.85}
                />
              );
            });
          })}
        </svg>

        <Box
          sx={{
            position: 'absolute',
            left: CENTER - LIGAND_BOX.w / 2,
            top: CENTER - LIGAND_BOX.h / 2,
            width: LIGAND_BOX.w,
            height: LIGAND_BOX.h,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: `2px solid ${theme.palette.primary.main}`,
            boxShadow: 3,
            zIndex: 2,
            p: 1,
          }}
        >
          {data.ligand_svg ? (
            <Box
              sx={{ width: '100%', height: '100%', '& svg': { width: '100%', height: '100%' } }}
              dangerouslySetInnerHTML={{ __html: data.ligand_svg }}
            />
          ) : (
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Ligand structure unavailable
            </Typography>
          )}
        </Box>

        {residues.map((res, idx) => {
          const angle = (idx / Math.max(residues.length, 1)) * 2 * Math.PI - Math.PI / 2;
          const x = CENTER + RADIUS * Math.cos(angle);
          const y = CENTER + RADIUS * Math.sin(angle);
          const type = dominantType(res.items);
          const color = (INTERACTION_STYLES[type] || INTERACTION_STYLES.van_der_waals).color;
          return (
            <Chip
              key={`${res.chain}-${res.res_number}`}
              label={`${res.residue}${res.res_number}`}
              size="small"
              sx={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                // Fully opaque background (not the usual translucent chip)
                // so any line segment behind it is completely hidden, never
                // overlapping the residue label text.
                bgcolor: 'background.paper',
                color,
                border: `1.5px solid ${color}`,
                boxShadow: `0 1px 4px ${alpha(color, 0.35)}`,
                fontWeight: 700,
              }}
            />
          );
        })}

        {residues.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: CENTER + LIGAND_BOX.h / 2 + 20,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">No close contacts detected for this pose.</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center', mt: 1, mb: 2 }}>
        {Object.entries(INTERACTION_STYLES).map(([key, style]) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 20, height: 0, borderTop: `2px dashed ${style.color}` }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {style.label} {data.summary?.[key] ? `(${data.summary[key]})` : ''}
            </Typography>
          </Box>
        ))}
      </Box>

      {data.interactions?.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Residue</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Chain</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Interaction</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ligand Atom</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Distance (Å)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.interactions.map((it, idx) => {
                const style = INTERACTION_STYLES[it.type] || INTERACTION_STYLES.van_der_waals;
                return (
                  <TableRow key={idx} hover>
                    <TableCell>{it.residue}{it.res_number}</TableCell>
                    <TableCell>{it.chain}</TableCell>
                    <TableCell>
                      <Chip label={style.label} size="small" sx={{ bgcolor: alpha(style.color, 0.12), color: style.color }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{it.ligand_atom}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{it.distance}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default InteractionViewer;
