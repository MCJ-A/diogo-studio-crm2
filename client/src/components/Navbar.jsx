import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, Camera, Euro, Mail, LogOut, Menu, X } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.dispatchEvent(new Event('auth-failed'))
  }

  const closeMenu = () => setMobileMenuOpen(false)

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

        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px' }}>
          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <LogOut size={16} /> Terminar Sessão
          </button>
        </div>
      </aside>

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
