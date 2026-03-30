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
  alpha,
  Fade,
  Zoom,
  Select,
  MenuItem,
  FormControl,
  InputLabel
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
  Visibility as VisibilityIcon
} from '@mui/icons-material';

const MolecularViewer = ({ pdbData, style, darkMode }) => {
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
          backgroundColor: darkMode ? '#0a0a0a' : '#f8f9fa',
          antialias: true,
          quality: 'high',
          ambientOcclusion: true,
          outline: true,
          fog: true,
          fogDensity: 0.1,
          backgroundOpacity: 1.0,
          defaultColors: window.$3Dmol.rasmolElementColors
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
  }, [pdbData, darkMode, proteinStyle, currentStyle, showSurface, showLigands, colorScheme]);

  const applyViewerStyle = (viewer) => {
    viewer.setStyle({}, {});

    switch (proteinStyle) {
      case 'cartoon':
        viewer.setStyle({}, {
          cartoon: {
            color: getColorSchemeValue(),
            thickness: 1.0
          }
        });
        break;
      case 'ribbon':
        viewer.setStyle({}, {
          cartoon: {
            color: getColorSchemeValue(),
            thickness: 0.5,
            style: 'trace'
          }
        });
        break;
      case 'line':
        viewer.setStyle({}, {
          line: {
            color: getColorSchemeValue(),
            linewidth: 2
          }
        });
        break;
      case 'sphere':
        viewer.setStyle({}, {
          sphere: {
            color: getColorSchemeValue(),
            radius: 0.3
          }
        });
        break;
      default:
        viewer.setStyle({}, {
          cartoon: {
            color: getColorSchemeValue()
          }
        });
    }

    if (showLigands) {
      viewer.setStyle({hetflag: true}, getLigandStyle());
    }

    if (showSurface) {
      viewer.addSurface(window.$3Dmol.SurfaceType.VDW, {
        opacity: 0.7,
        colorscheme: getColorSchemeValue()
      }, {hetflag: true}, {});
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
    switch (currentStyle) {
      case 'sphere':
        return {
          sphere: {
            colorscheme: 'greenCarbon',
            radius: 0.3,
            opacity: 0.8
          }
        };
      case 'stick':
        return {
          stick: {
            colorscheme: 'greenCarbon',
            radius: 0.15,
            opacity: 0.9
          }
        };
      case 'line':
        return {
          line: {
            colorscheme: 'greenCarbon',
            linewidth: 2,
            opacity: 0.8
          }
        };
      default:
        return {
          stick: {
            colorscheme: 'greenCarbon',
            radius: 0.15,
            opacity: 0.9
          }
        };
    }
  };

  const handleStyleChange = (newStyle) => {
    if (!viewerInstance.current) return;
    setCurrentStyle(newStyle);
  };

  const handleProteinStyleChange = (newStyle) => {
    if (!viewerInstance.current) return;
    setProteinStyle(newStyle);
  };

  const handleColorSchemeChange = (newScheme) => {
    if (!viewerInstance.current) return;
    setColorScheme(newScheme);
  };

  const handleSurfaceToggle = () => {
    if (!viewerInstance.current) return;
    setShowSurface(!showSurface);
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
        opacity: 0.1
      });
    } else {
      viewerInstance.current.removeAllShapes();
    }
    viewerInstance.current.render();
  };

  const handleLigandsToggle = () => {
    if (!viewerInstance.current) return;
    setShowLigands(!showLigands);
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
    
    const angle = direction === 'left' ? -15 : 15;
    viewerInstance.current.rotate(angle, { x: 0, y: 1, z: 0 });
    viewerInstance.current.render();
  };

  const handleCenter = () => {
    if (!viewerInstance.current) return;
    viewerInstance.current.zoomTo();
    viewerInstance.current.render();
    setZoom(100);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <Fade in={loading}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: darkMode 
                ? 'rgba(0,0,0,0.8)' 
                : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(5px)',
              zIndex: 10,
              borderRadius: 2
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <ViewIcon sx={{ fontSize: 60, color: darkMode ? '#64b5f6' : '#1976d2', mb: 2 }} />
              <Typography variant="h6" sx={{ color: darkMode ? '#fff' : '#333', mb: 1 }}>
                Loading Molecular Structure
              </Typography>
              <Typography variant="body2" sx={{ color: darkMode ? '#b0bec5' : '#666' }}>
                Preparing 3D visualization...
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}

      <Zoom in={!loading} timeout={600}>
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            p: 2,
            background: darkMode 
              ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(darkMode ? '#fff' : '#000', 0.2)}`,
            borderRadius: 2,
            zIndex: 5,
            maxWidth: 220,
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: 'bold',
              mb: 1,
              display: 'block',
              color: '#333'
            }}
          >
            View Controls
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#333', mb: 1, display: 'block' }}>
              Protein Style
            </Typography>
            <ButtonGroup size="small" sx={{ width: '100%', mb: 1 }}>
              <Tooltip title="Cartoon">
                <Button
                  onClick={() => handleProteinStyleChange('cartoon')}
                  variant={proteinStyle === 'cartoon' ? 'contained' : 'outlined'}
                  sx={{ 
                    fontSize: '0.6rem',
                    background: proteinStyle === 'cartoon' ? '#1976d2' : 'transparent',
                    borderColor: '#1976d2',
                    color: proteinStyle === 'cartoon' ? '#fff' : '#1976d2'
                  }}
                >
                  Cartoon
                </Button>
              </Tooltip>
              <Tooltip title="Ribbon">
                <Button
                  onClick={() => handleProteinStyleChange('ribbon')}
                  variant={proteinStyle === 'ribbon' ? 'contained' : 'outlined'}
                  sx={{ 
                    fontSize: '0.6rem',
                    background: proteinStyle === 'ribbon' ? '#1976d2' : 'transparent',
                    borderColor: '#1976d2',
                    color: proteinStyle === 'ribbon' ? '#fff' : '#1976d2'
                  }}
                >
                  Ribbon
                </Button>
              </Tooltip>
            </ButtonGroup>
            <ButtonGroup size="small" sx={{ width: '100%' }}>
              <Tooltip title="Line">
                <Button
                  onClick={() => handleProteinStyleChange('line')}
                  variant={proteinStyle === 'line' ? 'contained' : 'outlined'}
                  sx={{ 
                    fontSize: '0.6rem',
                    background: proteinStyle === 'line' ? '#1976d2' : 'transparent',
                    borderColor: '#1976d2',
                    color: proteinStyle === 'line' ? '#fff' : '#1976d2'
                  }}
                >
                  Line
                </Button>
              </Tooltip>
              <Tooltip title="Sphere">
                <Button
                  onClick={() => handleProteinStyleChange('sphere')}
                  variant={proteinStyle === 'sphere' ? 'contained' : 'outlined'}
                  sx={{ 
                    fontSize: '0.6rem',
                    background: proteinStyle === 'sphere' ? '#1976d2' : 'transparent',
                    borderColor: '#1976d2',
                    color: proteinStyle === 'sphere' ? '#fff' : '#1976d2'
                  }}
                >
                  Sphere
                </Button>
              </Tooltip>
            </ButtonGroup>
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: '0.7rem', color: '#333' }}>Color Scheme</InputLabel>
              <Select
                value={colorScheme}
                onChange={(e) => handleColorSchemeChange(e.target.value)}
                label="Color Scheme"
                sx={{
                  fontSize: '0.7rem',
                  '& .MuiOutlinedInput-input': {
                    color: '#333'
                  },
                  '& .MuiInputLabel-root': {
                    color: '#333'
                  }
                }}
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
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#333', mb: 1, display: 'block' }}>
              Ligand Style
            </Typography>
            <ButtonGroup size="small" sx={{ width: '100%' }}>
              <Tooltip title="Sphere">
                <Button
                  onClick={() => handleStyleChange('sphere')}
                  variant={currentStyle === 'sphere' ? 'contained' : 'outlined'}
                  sx={{ 
                    fontSize: '0.6rem',
                    background: currentStyle === 'sphere' ? '#4caf50' : 'transparent',
                    borderColor: '#4caf50',
                    color: currentStyle === 'sphere' ? '#fff' : '#4caf50'
                  }}
                >
                  <SphereIcon fontSize="small" />
                </Button>
              </Tooltip>
              <Tooltip title="Stick">
                <Button
                  onClick={() => handleStyleChange('stick')}
                  variant={currentStyle === 'stick' ? 'contained' : 'outlined'}
                  sx={{ 
                    fontSize: '0.6rem',
                    background: currentStyle === 'stick' ? '#4caf50' : 'transparent',
                    borderColor: '#4caf50',
                    color: currentStyle === 'stick' ? '#fff' : '#4caf50'
                  }}
                >
                  <StickIcon fontSize="small" />
                </Button>
              </Tooltip>
              <Tooltip title="Line">
                <Button
                  onClick={() => handleStyleChange('line')}
                  variant={currentStyle === 'line' ? 'contained' : 'outlined'}
                  sx={{ 
                    fontSize: '0.6rem',
                    background: currentStyle === 'line' ? '#4caf50' : 'transparent',
                    borderColor: '#4caf50',
                    color: currentStyle === 'line' ? '#fff' : '#4caf50'
                  }}
                >
                  <StyleIcon fontSize="small" />
                </Button>
              </Tooltip>
            </ButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            <Tooltip title="Show Ligands">
              <Button
                size="small"
                onClick={handleLigandsToggle}
                variant={showLigands ? 'contained' : 'outlined'}
                startIcon={<VisibilityIcon />}
                sx={{
                  fontSize: '0.6rem',
                  background: showLigands ? '#ff9800' : 'transparent',
                  borderColor: '#ff9800',
                  color: showLigands ? '#fff' : '#ff9800'
                }}
              >
                Ligands
              </Button>
            </Tooltip>
            <Tooltip title="Surface">
              <Button
                size="small"
                onClick={handleSurfaceToggle}
                variant={showSurface ? 'contained' : 'outlined'}
                startIcon={<SurfaceIcon />}
                sx={{
                  fontSize: '0.6rem',
                  background: showSurface ? '#9c27b0' : 'transparent',
                  borderColor: '#9c27b0',
                  color: showSurface ? '#fff' : '#9c27b0'
                }}
              >
                Surface
              </Button>
            </Tooltip>
            <Tooltip title="Grid">
              <Button
                size="small"
                onClick={handleGridToggle}
                variant={showGrid ? 'contained' : 'outlined'}
                startIcon={<GridIcon />}
                sx={{
                  fontSize: '0.6rem',
                  background: showGrid ? '#607d8b' : 'transparent',
                  borderColor: '#607d8b',
                  color: showGrid ? '#fff' : '#607d8b'
                }}
              >
                Grid
              </Button>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Tooltip title="Zoom In">
              <IconButton
                size="small"
                onClick={() => handleZoom('in')}
                sx={{
                  background: alpha('#1976d2', 0.1),
                  color: '#1976d2',
                  '&:hover': {
                    background: alpha('#1976d2', 0.2),
                  }
                }}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography 
              variant="caption" 
              sx={{ 
                minWidth: 40, 
                textAlign: 'center',
                fontFamily: 'monospace',
                color: '#333'
              }}
            >
              {zoom}%
            </Typography>
            <Tooltip title="Zoom Out">
              <IconButton
                size="small"
                onClick={() => handleZoom('out')}
                sx={{
                  background: alpha('#1976d2', 0.1),
                  color: '#1976d2',
                  '&:hover': {
                    background: alpha('#1976d2', 0.2),
                  }
                }}
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Tooltip title="Rotate Left">
              <IconButton
                size="small"
                onClick={() => handleRotate('left')}
                sx={{
                  background: alpha('#9c27b0', 0.1),
                  color: '#9c27b0',
                  '&:hover': {
                    background: alpha('#9c27b0', 0.2),
                  }
                }}
              >
                <RotateLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rotate Right">
              <IconButton
                size="small"
                onClick={() => handleRotate('right')}
                sx={{
                  background: alpha('#9c27b0', 0.1),
                  color: '#9c27b0',
                  '&:hover': {
                    background: alpha('#9c27b0', 0.2),
                  }
                }}
              >
                <RotateRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Center View">
              <IconButton
                size="small"
                onClick={handleCenter}
                sx={{
                  background: alpha('#f44336', 0.1),
                  color: '#f44336',
                  '&:hover': {
                    background: alpha('#f44336', 0.2),
                  }
                }}
              >
                <CenterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip 
              label={proteinStyle}
              size="small"
              sx={{
                background: alpha('#1976d2', 0.1),
                color: '#1976d2',
                fontSize: '0.6rem',
                height: 20
              }}
            />
            <Chip 
              label={currentStyle}
              size="small"
              sx={{
                background: alpha('#4caf50', 0.1),
                color: '#4caf50',
                fontSize: '0.6rem',
                height: 20
              }}
            />
            {showLigands && (
              <Chip 
                label="Ligands"
                size="small"
                sx={{
                  background: alpha('#ff9800', 0.1),
                  color: '#ff9800',
                  fontSize: '0.6rem',
                  height: 20
                }}
              />
            )}
            {showSurface && (
              <Chip 
                label="Surface"
                size="small"
                sx={{
                  background: alpha('#9c27b0', 0.1),
                  color: '#9c27b0',
                  fontSize: '0.6rem',
                  height: 20
                }}
              />
            )}
            {showGrid && (
              <Chip 
                label="Grid"
                size="small"
                sx={{
                  background: alpha('#607d8b', 0.1),
                  color: '#607d8b',
                  fontSize: '0.6rem',
                  height: 20
                }}
              />
            )}
          </Box>
        </Paper>
      </Zoom>

      <Box
        ref={viewerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          background: darkMode ? '#0a0a0a' : '#f8f9fa',
          ...style
        }}
      />
    </Box>
  );
};

export default MolecularViewer;
