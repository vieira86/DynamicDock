import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  ButtonGroup,
  Button,
  Paper,
  Typography,
  Chip,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  CenterFocusStrong as CenterIcon,
  ViewInAr as ViewIcon,
  Circle as SphereIcon,
  ViewModule as StickIcon,
  BlurOn as SurfaceIcon,
  GridOn as GridIcon,
  Palette as StyleIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

const MolecularViewer = ({ pdbData, style }) => {
  const theme = useTheme();
  const darkMode = theme.palette.mode === 'dark';
  const viewerRef = useRef(null);
  const viewerInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentStyle, setCurrentStyle] = useState('stick');
  const [proteinStyle, setProteinStyle] = useState('cartoon');
  const [showSurface, setShowSurface] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showLigands, setShowLigands] = useState(true);
  const [colorScheme, setColorScheme] = useState('default');

  useEffect(() => {
    if (!pdbData || !viewerRef.current) return;

    const initViewer = async () => {
      try {
        setLoading(true);

        if (viewerInstance.current) {
          viewerInstance.current.clear();
        }

        const viewer = window.$3Dmol.createViewer(viewerRef.current, {
          backgroundColor: darkMode ? '#0a0e1a' : '#f8f9fb',
          antialias: true,
          quality: 'high',
          ambientOcclusion: true,
          outline: true,
          fog: true,
          fogDensity: 0.1,
          backgroundOpacity: 1.0,
          defaultColors: window.$3Dmol.rasmolElementColors,
        });

        viewerInstance.current = viewer;
        viewer.addModel(pdbData, 'pdb');
        applyViewerStyle(viewer);
        viewer.zoomTo();
        viewer.render();

        setLoading(false);

        setTimeout(() => {
          viewer.rotate(45, { x: 0, y: 1, z: 0 });
          viewer.render();
        }, 500);
      } catch (error) {
        console.error('Error initializing molecular viewer:', error);
        setLoading(false);
      }
    };

    initViewer();

    return () => {
      if (viewerInstance.current) {
        viewerInstance.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdbData, darkMode, proteinStyle, currentStyle, showSurface, showLigands, colorScheme]);

  const applyViewerStyle = (viewer) => {
    viewer.setStyle({}, {});

    switch (proteinStyle) {
      case 'cartoon':
        viewer.setStyle({}, { cartoon: { color: getColorSchemeValue(), thickness: 1.0 } });
        break;
      case 'ribbon':
        viewer.setStyle({}, { cartoon: { color: getColorSchemeValue(), thickness: 0.5, style: 'trace' } });
        break;
      case 'line':
        viewer.setStyle({}, { line: { color: getColorSchemeValue(), linewidth: 2 } });
        break;
      case 'sphere':
        viewer.setStyle({}, { sphere: { color: getColorSchemeValue(), radius: 0.3 } });
        break;
      default:
        viewer.setStyle({}, { cartoon: { color: getColorSchemeValue() } });
    }

    if (showLigands) {
      viewer.setStyle({ hetflag: true }, getLigandStyle());
    }

    if (showSurface) {
      viewer.addSurface(
        window.$3Dmol.SurfaceType.VDW,
        { opacity: 0.7, colorscheme: getColorSchemeValue() },
        { hetflag: true },
        {}
      );
    }

    viewer.render();
  };

  const getColorSchemeValue = () => {
    switch (colorScheme) {
      case 'green':
        return 'greenCarbon';
      case 'cyan':
        return 'cyanCarbon';
      case 'magenta':
        return 'magentaCarbon';
      case 'yellow':
        return 'yellowCarbon';
      case 'white':
        return 'whiteCarbon';
      case 'ss':
        return 'ss';
      case 'chain':
        return 'chain';
      case 'b':
        return 'b';
      case 'residue':
        return 'residue';
      default:
        return 'spectrum';
    }
  };

  const getLigandStyle = () => {
    const base = { colorscheme: 'greenCarbon', opacity: 0.9 };
    switch (currentStyle) {
      case 'sphere':
        return { sphere: { ...base, radius: 0.3 } };
      case 'line':
        return { line: { ...base, linewidth: 2 } };
      case 'stick':
      default:
        return { stick: { ...base, radius: 0.15 } };
    }
  };

  const handleZoom = (direction) => {
    if (!viewerInstance.current) return;
    const newZoom = direction === 'in' ? Math.min(zoom + 10, 200) : Math.max(zoom - 10, 50);
    setZoom(newZoom);
    viewerInstance.current.zoom(newZoom / 100);
    viewerInstance.current.render();
  };

  const handleRotate = (direction) => {
    if (!viewerInstance.current) return;
    viewerInstance.current.rotate(direction === 'left' ? -15 : 15, { x: 0, y: 1, z: 0 });
    viewerInstance.current.render();
  };

  const handleCenter = () => {
    if (!viewerInstance.current) return;
    viewerInstance.current.zoomTo();
    viewerInstance.current.render();
    setZoom(100);
  };

  const handleGridToggle = () => {
    if (!viewerInstance.current) return;
    const newGrid = !showGrid;
    setShowGrid(newGrid);
    if (newGrid) {
      viewerInstance.current.addBox({
        center: { x: 0, y: 0, z: 0 },
        dimensions: { w: 50, h: 50, d: 50 },
        color: 'gray',
        opacity: 0.1,
      });
    } else {
      viewerInstance.current.removeAllShapes();
    }
    viewerInstance.current.render();
  };

  const controlButtonSx = (active, color = 'primary') => ({
    fontSize: '0.65rem',
    ...(active ? {} : { color: `${color}.main`, borderColor: `${color}.main` }),
  });

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: darkMode ? 'rgba(11,16,32,0.85)' : 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(6px)',
            zIndex: 10,
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <ViewIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1.5, opacity: 0.85 }} />
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Loading Structure
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Preparing 3D visualization...
            </Typography>
          </Box>
        </Box>
      )}

      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          p: 2,
          zIndex: 5,
          maxWidth: 210,
          maxHeight: '82vh',
          overflowY: 'auto',
          bgcolor: darkMode ? 'rgba(20,27,45,0.92)' : 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
          View Controls
        </Typography>

        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Protein Style
          </Typography>
          <ButtonGroup size="small" fullWidth sx={{ mb: 0.5 }}>
            {['cartoon', 'ribbon'].map((s) => (
              <Button
                key={s}
                onClick={() => setProteinStyle(s)}
                variant={proteinStyle === s ? 'contained' : 'outlined'}
                sx={controlButtonSx(proteinStyle === s)}
              >
                {s}
              </Button>
            ))}
          </ButtonGroup>
          <ButtonGroup size="small" fullWidth>
            {['line', 'sphere'].map((s) => (
              <Button
                key={s}
                onClick={() => setProteinStyle(s)}
                variant={proteinStyle === s ? 'contained' : 'outlined'}
                sx={controlButtonSx(proteinStyle === s)}
              >
                {s}
              </Button>
            ))}
          </ButtonGroup>
        </Box>

        <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
          <InputLabel sx={{ fontSize: '0.7rem' }}>Color Scheme</InputLabel>
          <Select
            value={colorScheme}
            label="Color Scheme"
            onChange={(e) => setColorScheme(e.target.value)}
            sx={{ fontSize: '0.75rem' }}
          >
            <MenuItem value="default">Spectrum</MenuItem>
            <MenuItem value="green">Green Carbon</MenuItem>
            <MenuItem value="cyan">Cyan Carbon</MenuItem>
            <MenuItem value="magenta">Magenta Carbon</MenuItem>
            <MenuItem value="yellow">Yellow Carbon</MenuItem>
            <MenuItem value="white">White Carbon</MenuItem>
            <MenuItem value="ss">Secondary Structure</MenuItem>
            <MenuItem value="chain">Chain</MenuItem>
            <MenuItem value="b">B-Factor</MenuItem>
            <MenuItem value="residue">Residue</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Ligand Style
          </Typography>
          <ButtonGroup size="small" fullWidth>
            <Tooltip title="Sphere">
              <Button
                onClick={() => setCurrentStyle('sphere')}
                variant={currentStyle === 'sphere' ? 'contained' : 'outlined'}
                color="success"
                sx={controlButtonSx(currentStyle === 'sphere', 'success')}
              >
                <SphereIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Stick">
              <Button
                onClick={() => setCurrentStyle('stick')}
                variant={currentStyle === 'stick' ? 'contained' : 'outlined'}
                color="success"
                sx={controlButtonSx(currentStyle === 'stick', 'success')}
              >
                <StickIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Line">
              <Button
                onClick={() => setCurrentStyle('line')}
                variant={currentStyle === 'line' ? 'contained' : 'outlined'}
                color="success"
                sx={controlButtonSx(currentStyle === 'line', 'success')}
              >
                <StyleIcon fontSize="small" />
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
          <Button
            size="small"
            onClick={() => setShowLigands(!showLigands)}
            variant={showLigands ? 'contained' : 'outlined'}
            color="warning"
            startIcon={<VisibilityIcon fontSize="small" />}
            sx={controlButtonSx(showLigands, 'warning')}
          >
            Ligands
          </Button>
          <Button
            size="small"
            onClick={() => setShowSurface(!showSurface)}
            variant={showSurface ? 'contained' : 'outlined'}
            color="secondary"
            startIcon={<SurfaceIcon fontSize="small" />}
            sx={controlButtonSx(showSurface, 'secondary')}
          >
            Surface
          </Button>
          <Button
            size="small"
            onClick={handleGridToggle}
            variant={showGrid ? 'contained' : 'outlined'}
            startIcon={<GridIcon fontSize="small" />}
            sx={controlButtonSx(showGrid)}
          >
            Grid
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={() => handleZoom('in')} color="primary">
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'center', fontFamily: 'monospace' }}>
            {zoom}%
          </Typography>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={() => handleZoom('out')} color="primary">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Tooltip title="Rotate Left">
            <IconButton size="small" onClick={() => handleRotate('left')} color="secondary">
              <RotateLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rotate Right">
            <IconButton size="small" onClick={() => handleRotate('right')} color="secondary">
              <RotateRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Center View">
            <IconButton size="small" onClick={handleCenter} color="error">
              <CenterIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <Chip label={proteinStyle} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
          <Chip label={currentStyle} size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
          {showLigands && <Chip label="Ligands" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
          {showSurface && <Chip label="Surface" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
          {showGrid && <Chip label="Grid" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
        </Box>
      </Paper>

      <Box
        ref={viewerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          background: darkMode ? '#0a0e1a' : '#f8f9fb',
          ...style,
        }}
      />
    </Box>
  );
};

export default MolecularViewer;
