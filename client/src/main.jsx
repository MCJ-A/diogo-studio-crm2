import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('token');
  if (token && resource.startsWith('/api/')) {
    config = config || {};
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  const response = await originalFetch(resource, config);
  if (response.status === 401 && resource !== '/api/auth/login') {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-failed'));
  }
  return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

