import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Camera } from 'lucide-react';
import '../styles/index.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

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
        if (rememberMe) {
          localStorage.setItem('remember_user', username);
        }
        onLogin(data.access_token);
      } else {
        setError(data.error || 'Credenciais incorretas');
      }
    } catch (err) {
      setError('Erro de ligação ao servidor');
    }
    setLoading(false);
  };

  return (
    <div className="login-v2-wrapper">
      {/* Fondos radiales difuminados */}
      <div className="login-v2-bg-radial-top" />
      <div className="login-v2-bg-radial-bottom" />
      <div className="login-v2-glow-orb-top" />
      <div className="login-v2-glow-orb-bottom" />

      <main className="login-v2-main">
        <div className="login-v2-card">
          <div className="login-v2-top-highlight" />

          {/* Encabezado con Logo */}
          <div className="login-v2-header">
            <div className="login-v2-logo-container">
              <div className="login-v2-logo-glow" />
              <div className="login-v2-logo-box">
                {!imgError ? (
                  <img
                    src="https://lh3.googleusercontent.com/aida/AEtjO1URic5pWkIYI285xP_w4iSl1frSaNNCfa92RuOhCKlFSjkPNSNmYEx4Vi_zMLeoPG9TAy5xW5ZZ-OyW27_MQ6Mj-jYi8cM3woJUQ1eTqj86bhylDIFQFm2rYEei7XNUwALgA_TteGohbmcqNm_zckBtxcaXtzNht7cvLbhbI2PPFl_KI6XFZxCU5DOG9gwEzCPG7PBGC1_GWi_TcjtvU5fm3eYuHeSb0e7bwI_XLk6P3MKPPY0yGlyiGaKm"
                    alt="Diogo Studio Logo"
                    className="login-v2-logo-img"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Camera size={32} className="text-accent" />
                )}
              </div>
            </div>

            <h1 className="login-v2-title">Diogo Studio</h1>
            <p className="login-v2-subtitle">Painel de Administração</p>
          </div>

          {/* Alerta de Error */}
          {error && (
            <div className="login-v2-error">
              <span>{error}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-v2-form">
            <div className="login-v2-field">
              <label htmlFor="login-username" className="login-v2-label">
                <User size={15} className="login-v2-label-icon" />
                <span>Utilizador</span>
              </label>
              <div className="login-v2-input-wrapper">
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: diogo"
                  required
                  className="login-v2-input"
                />
              </div>
            </div>

            <div className="login-v2-field">
              <div className="login-v2-label-row">
                <label htmlFor="login-password" className="login-v2-label">
                  <Lock size={15} className="login-v2-label-icon" />
                  <span>Palavra-passe</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Para redefinir a tua palavra-passe privada de Diogo, define a variável DIOGO_PASSWORD no teu painel do Render ou altera-a nas definições do sistema.');
                  }}
                  className="login-v2-forgot"
                >
                  Esqueceu-se da palavra-passe?
                </a>
              </div>
              <div className="login-v2-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Insira a sua palavra-passe"
                  required
                  className="login-v2-input login-v2-input-password"
                />
                <button
                  type="button"
                  aria-label="Alternar visibilidade da palavra-passe"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-v2-eye-btn"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Checkbox Recordar Sesión */}
            <div className="login-v2-remember-row">
              <label className="login-v2-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="login-v2-checkbox"
                />
                <span className="login-v2-checkbox-text">Lembrar sessão</span>
              </label>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={loading}
              className="login-v2-submit-btn"
            >
              {loading ? (
                <div className="login-v2-btn-loading">
                  <span className="login-v2-spinner" />
                  <span>A entrar...</span>
                </div>
              ) : (
                <div className="login-v2-btn-content">
                  <span>Entrar</span>
                  <ArrowRight size={18} />
                </div>
              )}
            </button>
          </form>

          {/* Footer de Seguridad */}
          <div className="login-v2-security-badge">
            <ShieldCheck size={14} className="login-v2-shield-icon" />
            <span>Ligação encriptada ponto a ponto</span>
          </div>
        </div>

        {/* Estado del Servidor */}
        <div className="login-v2-status-row">
          <span className="login-v2-status-pill">
            <span className="login-v2-status-dot" />
            <span>Servidor Ativo</span>
          </span>
          <span className="login-v2-status-divider">•</span>
          <span className="login-v2-status-version">v2.4.0 Studio OS</span>
        </div>
      </main>
    </div>
  );
}
