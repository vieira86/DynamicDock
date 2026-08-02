import axios from 'axios';

// Centralized API configuration. The backend URL is read from an
// environment variable so the same build works unmodified on Windows,
// Linux and macOS, and so it can point at a remote backend if needed.
// Set REACT_APP_API_URL in frontend/.env to override (see .env.example).
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;
