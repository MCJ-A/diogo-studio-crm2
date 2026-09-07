import React, { useState } from 'react';
import { Camera, Lock, User } from 'lucide-react';
import '../styles/index.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        onLogin(data.access_token);
      } else {
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Camera size={48} className="login-icon" />
          <h2>Diogo Studio</h2>
          <p>Panel de Administración</p>
        </div>
        {error && <div className="alert-danger-card" style={{marginBottom: '20px'}}>{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label><User size={16} /> Usuario</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              required 
            />
          </div>
          <div className="form-group">
            <label><Lock size={16} /> Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{width: '100%', marginTop: '10px'}}>
            {loading ? 'Entrando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
