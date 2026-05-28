// Mounts the TabTwin popup React application inside the extension action popup.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
