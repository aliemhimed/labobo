import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { initTheme } from './lib/theme.js';
import './styles/quiz.css';
import './styles/home.css';

/* Side-effect modules, loaded in the same order the old pages did:
   profanity registers the handle validator that leaderboard uses, and
   announcements installs its own overlay on document.body. */
import './legacy/profanity.js';
import './legacy/leaderboard.js';
import './legacy/announcements.js';

initTheme();

createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
