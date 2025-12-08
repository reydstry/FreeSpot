import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App.jsx';
import { ToastProvider } from './components/Toast/ToastContainer.jsx';

createRoot(document.getElementById('root')).render(
	<ToastProvider>
		<App />
	</ToastProvider>
);
