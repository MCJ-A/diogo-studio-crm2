import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User, Users, Calendar, Edit, Save, XCircle, MessageCircle, Mail, Phone, AtSign, Target, Trophy, Medal, Award, Plus, ArrowLeft } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0)
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX') : '—'
const EMPTY_CLIENT = { nombre: '', telefono: '', email: '', instagram: '', notas_estilo_preferencias: '' }

function getLoyaltyBadge(pct) {
  if (pct >= 20) return { icon: <Trophy size={14} />, label: 'Oro', cls: 'loyalty-oro' }
  if (pct >= 15) return { icon: <Medal size={14} />, label: 'Plata', cls: 'loyalty-plata' }
  return { icon: <Award size={14} />, label: 'Bronce', cls: 'loyalty-bronce' }
}

export default function Clients() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // detail state
  const [bookings, setBookings] = useState([])
  const [loyalty, setLoyalty] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  
  // create state
  const [showModal, setShowModal] = useState(false)
  const [newClient, setNewClient] = useState(EMPTY_CLIENT)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => { setClients(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (id && clients.length > 0) {
      const c = clients.find(x => x.id_cliente === parseInt(id))
      if (c) {
        setSelected(c)
        setEditData({...c})
        
        Promise.all([
          fetch(`/api/clients/${c.id_cliente}/bookings`).then(r => r.json()),
          fetch(`/api/dashboard/loyalty`).then(r => r.json())
        ]).then(([bData, lData]) => {
          setBookings(bData)
          const l = lData.find(x => x.id === c.id_cliente)
          if (l) setLoyalty(l)
        })
      }
    } else {
      setSelected(null)
    }
  }, [id, clients])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${selected.id_cliente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      if (!res.ok) throw new Error('Error al actualizar')
      const updated = await res.json()
      
      setClients(prev => prev.map(c => c.id_cliente === selected.id_cliente ? (updated.client || updated) : c))
      setSelected(updated.client || updated)
    } catch(e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      })
      if (!res.ok) throw new Error('Error al crear')
      const created = await res.json()
      setClients(prev => [...prev, created.client || created])
      setShowModal(false)
      setNewClient(EMPTY_CLIENT)
    } catch(e) {
      setError(e.message)
    }
    setCreating(false)
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  // DETAIL VIEW
  if (selected) {
    const badge = getLoyaltyBadge(loyalty?.descuento_sugerido_pct || 0)
    return (
      <div>
        <button className="back-btn" onClick={() => navigate('/clients')}>
          <ArrowLeft size={16} /> Volver a Clientes
        </button>
        {error && <div className="alert-danger-card">{error}</div>}
        
        <div className="page-header">
          <div>
            <div className="page-title">{selected.nombre}</div>
            <div className="page-subtitle" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className={`loyalty-badge ${badge.cls}`} style={{display:'flex', alignItems:'center', gap:4}}>
                {badge.icon} {badge.label}
              </span>
            </div>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{display:'flex', alignItems:'center', gap:8}}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        <div className="detail-panel">
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div className="card">
              <div className="card-title" style={{display:'flex', alignItems:'center', gap:8}}>
                <Edit size={18} className="text-accent" /> Datos Personales
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input className="form-input" value={editData.nombre || ''} onChange={e => setEditData({...editData, nombre: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefono</label>
                  <input className="form-input" value={editData.telefono || ''} onChange={e => setEditData({...editData, telefono: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Instagram</label>
                  <input className="form-input" value={editData.instagram || ''} onChange={e => setEditData({...editData, instagram: e.target.value})} placeholder="@usuario" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={editData.notas_estilo_preferencias || editData.notas || ''} onChange={e => setEditData({...editData, notas_estilo_preferencias: e.target.value})} rows={3} />
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{display:'flex', alignItems:'center', gap:8}}>
                <Calendar size={18} className="text-accent" /> Historial de Reservas
              </div>
              {bookings.length === 0 ? (
                <div className="no-data">Sin reservas registradas</div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Fecha</th>
                        <th>Ubicacion</th>
                        <th>Estado</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.id_reserva}>
                          <td>{b.nombre_servicio}</td>
                          <td>{fmtDate(b.fecha_sesion)}</td>
                          <td>{b.ubicacion || '—'}</td>
                          <td><StatusBadge status={b.estado} /></td>
                          <td className="text-accent" style={{fontWeight:700}}>{fmt(b.monto_bruto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // LIST VIEW
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{display:'flex', alignItems:'center', gap:8}}>
            <Users size={24} className="text-accent" /> Clientes
          </div>
          <div className="page-subtitle">{clients.length} clientes registrados</div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{display:'flex', alignItems:'center', gap:8}}>
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Instagram</th>
              <th>Registro</th>
              <th style={{textAlign:'right'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const phone = (c.telefono || '').replace(/\D/g, '')
              return (
                <tr key={c.id_cliente}>
                  <td style={{fontWeight:500}}>{c.nombre}</td>
                  <td>
                    {c.telefono ? (
                      <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="text-accent" style={{display:'flex', alignItems:'center', gap:4, textDecoration:'none'}}>
                        <MessageCircle size={14} /> {c.telefono}
                      </a>
                    ) : '—'}
                  </td>
                  <td>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-accent" style={{display:'flex', alignItems:'center', gap:4, textDecoration:'none'}}>
                        <Mail size={14} /> {c.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td>
                    {c.instagram ? (
                      <a href={`https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-accent" style={{display:'flex', alignItems:'center', gap:4, textDecoration:'none'}}>
                        <AtSign size={14} /> {c.instagram}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="text-muted">{fmtDate(c.fecha_registro)}</td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn-secondary btn-sm" onClick={() => navigate(`/clients/${c.id_cliente}`)}>Ver Perfil</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nuevo Cliente</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input className="form-input" value={newClient.nombre} onChange={e => setNewClient({...newClient, nombre: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono (WhatsApp)</label>
                <input className="form-input" value={newClient.telefono} onChange={e => setNewClient({...newClient, telefono: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreate} disabled={creating || !newClient.nombre}>
                {creating ? 'Guardando...' : 'Guardar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
