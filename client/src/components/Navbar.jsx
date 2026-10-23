import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Users, Calendar, Camera, Euro, Mail, LogOut, 
  Menu, X, KeyRound, ShieldCheck, CheckCircle, AlertCircle 
} from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.dispatchEvent(new Event('auth-failed'))
  }

  const closeMenu = () => setMobileMenuOpen(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (newPwd !== confirmPwd) {
      setPwdError('A nova palavra-passe e a confirmação não coincidem.')
      return
    }

    if (newPwd.length < 6) {
      setPwdError('A nova palavra-passe deve ter no mínimo 6 caracteres.')
      return
    }

    try {
      setPwdLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPwd,
          new_password: newPwd
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar a palavra-passe')
      }

      setPwdSuccess('Palavra-passe atualizada com sucesso!')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setTimeout(() => {
        setShowPwdModal(false)
        setPwdSuccess('')
      }, 1600)
    } catch (err) {
      setPwdError(err.message)
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <>
      {/* Barra superior visible solo en móviles */}
      <header className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Abrir menu de navegação"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="mobile-brand">
          <Camera size={22} className="text-accent" />
          <span>Diogo Studio</span>
        </div>

        <button
          className="mobile-logout-btn"
          onClick={handleLogout}
          aria-label="Terminar sessão"
          title="Terminar sessão"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Overlay backdrop cuando el menú lateral está abierto en móvil */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMenu}
        />
      )}

      {/* Menú lateral (Sidebar) para desktop y drawer para móvil */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Camera size={28} className="text-accent" style={{ marginRight: '10px' }} />
          <h2>Diogo Studio</h2>
          <button className="sidebar-close-btn" onClick={closeMenu}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink
            to="/clients"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Users size={20} /> Clientes
          </NavLink>
          <NavLink
            to="/bookings"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Calendar size={20} /> Sessões & Agenda
          </NavLink>
          <NavLink
            to="/services"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Camera size={20} /> Serviços
          </NavLink>
          <NavLink
            to="/payments"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Euro size={20} /> Finanças
          </NavLink>
          <NavLink
            to="/newsletter"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Mail size={20} /> Campanhas
          </NavLink>
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '16px' }}>
          {/* Card do Perfil de Diogo */}
          <div style={{
            background: 'rgba(25, 27, 34, 0.85)',
            border: '1px solid rgba(232, 176, 114, 0.2)',
            borderRadius: 12,
            padding: '12px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem'
                }}>
                  D
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>Diogo</div>
                  <div style={{ fontSize: '0.7rem', color: '#e8b072' }}>Atelier Central</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowPwdModal(true); closeMenu() }}
                title="Alterar Palavra-passe Privada"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 6,
                  padding: '5px 8px',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.72rem'
                }}
              >
                <KeyRound size={13} />
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <LogOut size={16} /> Terminar Sessão
          </button>
        </div>
      </aside>

      {/* Modal: Alterar Palavra-passe */}
      {showPwdModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={20} className="text-accent" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#F8FAFC' }}>Alterar Palavra-passe</h3>
              </div>
              <button className="modal-close" onClick={() => setShowPwdModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8' }}>
                  Define uma nova palavra-passe de acesso exclusivo para a conta <strong>diogo</strong>.
                </p>

                {pwdError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <AlertCircle size={16} /> {pwdError}
                  </div>
                )}

                {pwdSuccess && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#4ade80', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <CheckCircle size={16} /> {pwdSuccess}
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: '#CBD5E1', marginBottom: 4, display: 'block' }}>
                    Palavra-passe Atual
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="A tua palavra-passe atual"
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: '#CBD5E1', marginBottom: 4, display: 'block' }}>
                    Nova Palavra-passe
                  </label>
                  <input
                    type="password"
                    required
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: '#CBD5E1', marginBottom: 4, display: 'block' }}>
                    Confirmar Nova Palavra-passe
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Repete a nova palavra-passe"
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPwdModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="btn-luxury-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ShieldCheck size={16} />
                  <span>{pwdLoading ? 'A guardar...' : 'Confirmar Alteração'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barra de navegación inferior móvil estilo App / PWA */}
      <nav className="mobile-bottom-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/clients"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Clientes</span>
        </NavLink>
        <NavLink
          to="/bookings"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <Calendar size={20} />
          <span>Agenda</span>
        </NavLink>
        <NavLink
          to="/services"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <Camera size={20} />
          <span>Serviços</span>
        </NavLink>
        <NavLink
          to="/payments"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <Euro size={20} />
          <span>Finanças</span>
        </NavLink>
        <NavLink
          to="/newsletter"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <Mail size={20} />
          <span>Campanhas</span>
        </NavLink>
      </nav>
    </>
  )
}
