import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('token');

  let url = '';
  if (typeof resource === 'string') {
    url = resource;
  } else if (resource && resource.url) {
    url = resource.url;
  }

  const isApi = url.includes('/api/');
  const isLogin = url.includes('/api/auth/login');

  if (token && isApi && !isLogin) {
    config = config || {};
    const headers = new Headers(config.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers = headers;
  }

  const response = await originalFetch(resource, config);

  if (response.status === 401 && isApi && !isLogin) {
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

