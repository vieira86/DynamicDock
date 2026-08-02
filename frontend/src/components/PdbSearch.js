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
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';

const PdbSearch = ({ onSearch, loading }) => {
  const [pdbId, setPdbId] = useState('');

  const isValidPdbId = (id) => /^[A-Za-z0-9]{1,4}$/.test(id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pdbId.trim()) {
      onSearch(pdbId.trim().toUpperCase());
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
        Search the Protein Data Bank by ID (e.g. 1M7W, 2XYZ)
      </Typography>

      <TextField
        fullWidth
        placeholder="Enter PDB ID..."
        value={pdbId}
        onChange={(e) => setPdbId(e.target.value.toUpperCase())}
        disabled={loading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <ScienceIcon sx={{ color: 'primary.main', opacity: 0.8, fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: pdbId && (
            <InputAdornment position="end">
              <Tooltip title="Clear">
                <IconButton onClick={() => setPdbId('')} size="small">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        error={Boolean(pdbId) && !isValidPdbId(pdbId)}
        helperText={
          pdbId && !isValidPdbId(pdbId) ? 'PDB ID must be 1-4 alphanumeric characters' : ' '
        }
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading || !pdbId.trim() || !isValidPdbId(pdbId)}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
        sx={{ py: 1.25 }}
      >
        {loading ? 'Searching...' : 'Search PDB Database'}
      </Button>

      <Typography
        variant="caption"
        sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'text.secondary' }}
      >
        Powered by the RCSB Protein Data Bank
      </Typography>
    </Box>
  );
};

export default PdbSearch;
