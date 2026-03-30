import React, { useState } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  InputAdornment,
  IconButton,
  Tooltip,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Science as ScienceIcon
} from '@mui/icons-material';

const PdbSearch = ({ onSearch, loading, darkMode }) => {
  const [pdbId, setPdbId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pdbId.trim()) {
      const upperId = pdbId.trim().toUpperCase();
      console.log('Submitting PDB ID:', upperId); // Debug log
      console.log('Is valid:', isValidPdbId(upperId)); // Debug log
      onSearch(upperId);
    }
  };

  const handleClear = () => {
    setPdbId('');
  };

  const isValidPdbId = (id) => {
    // PDB IDs are typically 1-4 characters, alphanumeric
    // Allow common formats like: 1M7W, 2XYZ, 7P2G, etc.
    return /^[A-Za-z0-9]{1,4}$/.test(id);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="body2" sx={{ mb: 2, color: darkMode ? '#b0bec5' : '#666' }}>
        Search Protein Data Bank by PDB ID (e.g., 1M7W, 2XYZ)
      </Typography>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Enter PDB ID..."
        value={pdbId}
        onChange={(e) => setPdbId(e.target.value.toUpperCase())}
        disabled={loading}
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
              boxShadow: `0 0 0 2px ${alpha(darkMode ? '#64b5f6' : '#1976d2', 0.3)}`,
            },
          },
          '& .MuiOutlinedInput-input': {
            color: darkMode ? '#fff' : '#333',
            fontWeight: 500,
            letterSpacing: 1,
          },
          '& .MuiInputLabel-root': {
            color: darkMode ? '#b0bec5' : '#666',
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <ScienceIcon 
                sx={{ 
                  color: darkMode ? '#64b5f6' : '#1976d2',
                  opacity: 0.7
                }} 
              />
            </InputAdornment>
          ),
          endAdornment: pdbId && (
            <InputAdornment position="end">
              <Tooltip title="Clear">
                <IconButton
                  onClick={handleClear}
                  size="small"
                  sx={{ 
                    color: darkMode ? '#b0bec5' : '#666',
                    '&:hover': {
                      color: darkMode ? '#fff' : '#333',
                    }
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        error={pdbId && !isValidPdbId(pdbId)}
        helperText={
          pdbId && !isValidPdbId(pdbId) 
            ? 'PDB ID must be 1-4 alphanumeric characters' 
            : ''
        }
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading || !pdbId.trim() || !isValidPdbId(pdbId)}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
        sx={{ 
          mt: 2,
          py: 1.5,
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
        {loading ? 'Searching PDB...' : 'Search PDB Database'}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: darkMode ? '#90a4ae' : '#999',
            fontSize: '0.75rem',
            fontStyle: 'italic'
          }}
        >
          Accessing RCSB Protein Data Bank • Real-time search
        </Typography>
      </Box>
    </Box>
  );
};

export default PdbSearch;
