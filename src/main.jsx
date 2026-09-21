import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { initTheme } from './lib/theme.js';
import './styles/tokens.css';
import './styles/quiz.css';
import './styles/home.css';

initTheme();

createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
