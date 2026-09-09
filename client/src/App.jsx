import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Bookings from './pages/Bookings'
import Services from './pages/Services'
import Payments from './pages/Payments'
import Newsletter from './pages/Newsletter'
import Login from './pages/Login'
import './styles/index.css'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthFailed = () => {
      setToken(null);
      navigate('/');
    };
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => window.removeEventListener('auth-failed', handleAuthFailed);
  }, [navigate]);

  if (!token) {
    return <Login onLogin={(t) => setToken(t)} />
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<Clients />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/services" element={<Services />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/newsletter" element={<Newsletter />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
