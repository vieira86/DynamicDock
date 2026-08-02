import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// The theme (light/dark) is created inside App.js, since it depends on the
// user's dark-mode toggle. See src/theme.js for the palette definition.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
