import './storage.js';
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import PotteryShopBilling from './PotteryShopBilling.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PotteryShopBilling />
  </React.StrictMode>
);
