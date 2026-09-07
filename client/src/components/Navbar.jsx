import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, Camera, DollarSign, LogOut } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-failed'));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Camera size={28} className="text-accent" style={{marginRight: '10px'}} />
        <h2>Diogo Studio</h2>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/clients" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Users size={20} /> Clientes
        </NavLink>
        <NavLink to="/bookings" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Calendar size={20} /> Reservas
        </NavLink>
        <NavLink to="/services" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Camera size={20} /> Servicios
        </NavLink>
        <NavLink to="/payments" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <DollarSign size={20} /> Finanzas
        </NavLink>
      </nav>
      
      <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px' }}>
        <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
