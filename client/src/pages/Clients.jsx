import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Users, Calendar, Edit, Save, XCircle, MessageCircle, Mail, Phone, AtSign, 
  Trophy, Medal, Award, Plus, ArrowLeft, Heart, Cake, Gift, Copy, Check, 
  Sparkles, AlertCircle, CheckCircle, Clock, ExternalLink, Search, UserCheck
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0)
const fmtDate = d => {
  if (!d) return '—'
  const dateObj = new Date(d.includes('T') ? d : d + 'T00:00:00')
  return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_CLIENT = { 
  nombre: '', 
  telefono: '', 
  email: '', 
  instagram: '', 
  referred_by_client_id: '',
  fecha_aniversario: '', 
  fecha_cumpleanos_hijos_o_parto: '', 
  notas_estilo_preferencias: '' 
}

function getLoyaltyBadge(pct) {
  if (pct >= 20) return { icon: <Trophy size={14} />, label: 'Oro', cls: 'loyalty-oro', pct: 20, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
  if (pct >= 15) return { icon: <Medal size={14} />, label: 'Plata', cls: 'loyalty-plata', pct: 15, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
  return { icon: <Award size={14} />, label: 'Bronce', cls: 'loyalty-bronce', pct: pct || 0, color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)' }
}

const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'CL'
}

export default function Clients() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState('ALL') // ALL, ORO, PLATA, BRONCE, EVENTS
  
  // Detail states
  const [bookings, setBookings] = useState([])
  const [loyalty, setLoyalty] = useState(null)
  const [events, setEvents] = useState([])
  const [recommendedPromo, setRecommendedPromo] = useState(null)
  const [referrers, setReferrers] = useState([])
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [copiedPitch, setCopiedPitch] = useState(false)
  
  // Create state
  const [showModal, setShowModal] = useState(false)
  const [newClient, setNewClient] = useState(EMPTY_CLIENT)
  const [creating, setCreating] = useState(false)

  const fetchClientsList = async () => {
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) throw new Error('Error al obtener clientes')
      const data = await res.json()
      setClients(Array.isArray(data) ? data : data.clients || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientsList()
  }, [])

  useEffect(() => {
    if (id) {
      const clientId = parseInt(id)
      setLoading(true)
      fetch(`/api/clients/${clientId}`)
        .then(r => r.json())
        .then(data => {
          if (data.client) {
            setSelected(data.client)
            setEditData({ ...data.client })
            setBookings(data.bookings || [])
            setLoyalty(data.loyalty || null)
            setEvents(data.events || [])
            setRecommendedPromo(data.recommended_promo || null)
            setReferrers(data.referrers || [])
          } else {
            setError('Cliente no encontrado')
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    } else {
      setSelected(null)
    }
  }, [id])

  const handleSave = async () => {
    const currentId = selected?.id || selected?.id_cliente
    if (!currentId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error || 'Error al actualizar cliente')
      
      const clientObj = updated.client || updated
      setClients(prev => prev.map(c => (c.id || c.id_cliente) === currentId ? clientObj : c))
      setSelected(clientObj)
      setSuccessMsg('Ficha de cliente guardada correctamente')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch(e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!newClient.nombre.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      })
      const created = await res.json()
      if (!res.ok) throw new Error(created.error || 'Error al registrar cliente')
      
      const clientObj = created.client || created
      setClients(prev => [clientObj, ...prev])
      setShowModal(false)
      setNewClient(EMPTY_CLIENT)
      setSuccessMsg(`Cliente "${clientObj.nombre}" registrado exitosamente`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch(e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const copyPitchToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedPitch(true)
    setTimeout(() => setCopiedPitch(false), 2000)
  }

  // Métricas rápidas del directorio
  const totalCount = clients.length
  const oroCount = clients.filter(c => (c.descuento_sugerido_pct || 0) >= 20).length
  const plataCount = clients.filter(c => (c.descuento_sugerido_pct || 0) >= 15 && (c.descuento_sugerido_pct || 0) < 20).length
  const bronceCount = clients.filter(c => (c.descuento_sugerido_pct || 0) < 15).length
  const eventsCount = clients.filter(c => c.proximo_evento).length
  const ltvTotal = clients.reduce((acc, c) => acc + (parseFloat(c.total_gastado || c.ltv || 0)), 0)

  // Filtrado de clientes
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = term ? (
      (c.nombre || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.telefono || '').toLowerCase().includes(term) ||
      (c.instagram || '').toLowerCase().includes(term)
    ) : true

    const pct = c.descuento_sugerido_pct || 0
    let matchesTier = true
    if (tierFilter === 'ORO') matchesTier = pct >= 20
    else if (tierFilter === 'PLATA') matchesTier = pct >= 15 && pct < 20
    else if (tierFilter === 'BRONCE') matchesTier = pct < 15
    else if (tierFilter === 'EVENTS') matchesTier = !!c.proximo_evento

    return matchesSearch && matchesTier
  })

  if (loading && !selected && clients.length === 0) {
    return <div className="loading-spinner"><div className="spinner" /></div>
  }

  // ==========================================
  // DETAIL VIEW: PERFIL DEL CLIENTE & ACCIONES
  // ==========================================
  if (selected) {
    const badge = getLoyaltyBadge(loyalty?.descuento_sugerido_pct || selected?.descuento_sugerido_pct || 0)
    const phone = (selected.telefono || '').replace(/\D/g, '')
    const firstName = (selected.nombre || 'cliente').split(' ')[0]
    const defaultPitch = `¡Hola ${firstName}! ✨ Te saludamos con mucho cariño desde Diogo Studio. Queremos recordarte que como cliente VIP nivel ${badge.label}, cuentas con un ${badge.pct}% de beneficio exclusivo para tu próxima sesión fotográfica. ¿Te gustaría agendar una fecha especial? 📸`

    return (
      <div className="client-detail-page">
        <button 
          className="back-btn" 
          onClick={() => navigate('/clients')} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, background: '#1c202d', border: '1px solid #2d3548', padding: '6px 12px', borderRadius: 8, color: '#cbd5e1', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Volver al Directorio
        </button>

        {error && (
          <div className="alert-danger-card" style={{ marginBottom: 16 }}>
            <AlertCircle size={18} className="text-danger" style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#4ade80',
            display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
          }}>
            <CheckCircle size={18} /> {successMsg}
          </div>
        )}
        
        {/* Cabecera del Cliente Haute Atelier */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e8b86d 0%, #c78d4d 100%)',
              color: '#2a1a00', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800,
              boxShadow: '0 4px 16px rgba(232, 184, 109, 0.35)', flexShrink: 0
            }}>
              {getInitials(selected.nombre)}
            </div>
            <div>
              <div className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                {selected.nombre}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <span className={`loyalty-badge ${badge.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: '0.78rem' }}>
                  {badge.icon} Nivel {badge.label} ({badge.pct}% Beneficio)
                </span>
                {selected.referred_by_name && (
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    • Referido por: <strong style={{ color: '#e8b86d' }}>{selected.referred_by_name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {phone && (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#25D366', color: '#0b2b18', padding: '8px 14px',
                  borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none'
                }}
              >
                <MessageCircle size={16} /> WhatsApp Directo
              </a>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Barra de Fidelidad & Métricas VIP */}
        <div className="kpi-grid" style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div className="kpi-card accent" style={{ background: '#1a1f2e', padding: 16, borderRadius: 12, border: '1px solid #2d3548' }}>
            <div className="kpi-icon" style={{ background: badge.bg, color: badge.color, width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Award size={20} />
            </div>
            <div>
              <div className="kpi-label" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Estatus de Cliente</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>VIP {badge.label}</div>
            </div>
          </div>

          <div className="kpi-card success" style={{ background: '#1a1f2e', padding: 16, borderRadius: 12, border: '1px solid #2d3548' }}>
            <div className="kpi-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Gift size={20} />
            </div>
            <div>
              <div className="kpi-label" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Descuento Sugerido</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4ade80' }}>{loyalty?.descuento_sugerido_pct || selected?.descuento_sugerido_pct || 0}%</div>
            </div>
          </div>

          <div className="kpi-card info" style={{ background: '#1a1f2e', padding: 16, borderRadius: 12, border: '1px solid #2d3548' }}>
            <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Calendar size={20} />
            </div>
            <div>
              <div className="kpi-label" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Sesiones Realizadas</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa' }}>{loyalty?.sesiones_completadas || bookings.length || 0}</div>
            </div>
          </div>

          <div className="kpi-card" style={{ background: '#1a1f2e', padding: 16, borderRadius: 12, border: '1px solid #2d3548' }}>
            <div className="kpi-icon" style={{ background: 'rgba(232, 184, 109, 0.15)', color: '#e8b86d', width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div className="kpi-label" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Inversión Histórica LTV</div>
              <div className="kpi-value text-accent" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {fmt(bookings.reduce((acc, b) => acc + (parseFloat(b.monto_bruto || b.precio_base || 0)), 0))}
              </div>
            </div>
          </div>
        </div>

        {/* GRID DE DETALLE & ACCIONES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          
          {/* COLUMNA IZQUIERDA: PITCH & FORMULARIO (7 COLS) */}
          <div style={{ gridColumn: 'span 7' }} className="client-detail-main">
            
            {/* Generador de Mensaje WhatsApp Haute Atelier */}
            <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(232, 184, 109, 0.3)', background: 'linear-gradient(135deg, #181d29 0%, #131620 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} className="text-accent" />
                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>Mensaje Personalizado de Fidelización</span>
                </div>
                {phone && (
                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(defaultPitch)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#25D366', color: '#0b2b18', padding: '4px 10px',
                      borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none'
                    }}
                  >
                    <MessageCircle size={14} /> Enviar WhatsApp
                  </a>
                )}
              </div>
              
              <div style={{
                background: '#0f121a', border: '1px solid #232a3d', borderRadius: 8,
                padding: 12, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5,
                position: 'relative'
              }}>
                {defaultPitch}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={() => copyPitchToClipboard(defaultPitch)}
                  style={{
                    background: 'none', border: 'none', color: '#e8b86d',
                    fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  {copiedPitch ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  {copiedPitch ? '¡Copiado al portapapeles!' : 'Copiar texto'}
                </button>
              </div>
            </div>

            {/* Formulario Ficha de Cliente */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Edit size={18} className="text-accent" /> Datos Personales y Fechas Especiales
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    className="form-input"
                    value={editData.nombre || ''}
                    onChange={e => setEditData({ ...editData, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono (WhatsApp)</label>
                  <input
                    className="form-input"
                    value={editData.telefono || ''}
                    onChange={e => setEditData({ ...editData, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    className="form-input"
                    type="email"
                    value={editData.email || ''}
                    onChange={e => setEditData({ ...editData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Instagram</label>
                  <input
                    className="form-input"
                    value={editData.instagram || ''}
                    onChange={e => setEditData({ ...editData, instagram: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Aniversario (Boda / Pareja)</label>
                  <input
                    className="form-input"
                    type="date"
                    value={editData.fecha_aniversario || ''}
                    onChange={e => setEditData({ ...editData, fecha_aniversario: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cumpleaños Hijos o Parto</label>
                  <input
                    className="form-input"
                    type="date"
                    value={editData.fecha_cumpleanos_hijos_o_parto || ''}
                    onChange={e => setEditData({ ...editData, fecha_cumpleanos_hijos_o_parto: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cliente que lo Recomendó</label>
                <select
                  className="form-select"
                  value={editData.referred_by_client_id || ''}
                  onChange={e => setEditData({ ...editData, referred_by_client_id: e.target.value })}
                >
                  <option value="">Ninguno / Llegó Directo</option>
                  {referrers.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notas de Estilo y Preferencias Fotográficas</label>
                <textarea
                  className="form-textarea"
                  value={editData.notas_estilo_preferencias || ''}
                  onChange={e => setEditData({ ...editData, notas_estilo_preferencias: e.target.value })}
                  rows={3}
                  placeholder="Ej: Prefiere luz cálida, fotografía espontánea sin poses forzadas..."
                />
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: HISTORIAL DE RESERVAS & PROGRAMA DE REFERIDOS (5 COLS) */}
          <div style={{ gridColumn: 'span 5' }} className="client-detail-sidebar">
            
            {/* Historial de Reservas */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} className="text-accent" /> Historial de Sesiones
                </span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>({bookings.length})</span>
              </div>

              {bookings.length === 0 ? (
                <div className="no-data" style={{ padding: 20, textAlign: 'center' }}>Sin reservas registradas</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bookings.map(b => (
                    <div key={b.id || b.id_reserva} style={{
                      background: '#161922', border: '1px solid #282f42', borderRadius: 10,
                      padding: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc' }}>
                          {b.servicio_nombre || 'Sesión Fotográfica'}
                        </div>
                        <StatusBadge status={b.estado} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                        <span>{fmtDate(b.fecha_sesion)}</span>
                        <span className="text-accent" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {fmt(b.monto_bruto || b.precio_base)}
                        </span>
                      </div>

                      {b.url_galeria && (
                        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #232a3b' }}>
                          <a href={b.url_galeria} target="_blank" rel="noopener noreferrer" className="text-accent" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ExternalLink size={12} /> Ver Galería Entregada
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Banner Programa de Referidos */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #1f2536 0%, #151821 100%)', border: '1px solid #333d54' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <UserCheck size={18} className="text-accent" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>Red de Referidos</span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                Cada cliente recomendado por <strong>{selected.nombre}</strong> suma beneficios acumulables para su próximo paquete.
              </div>
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#0f121a', borderRadius: 8, border: '1px solid #282f42', fontSize: '0.78rem', color: '#cbd5e1' }}>
                💡 Enlace sugerido para compartir por WhatsApp: 
                <div style={{ color: '#e8b86d', fontWeight: 600, marginTop: 2 }}>
                  diogostudio.com/promo?ref={selected.id || selected.id_cliente}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    )
  }

  // ==========================================
  // LIST VIEW: DIRECTORIO DE CLIENTES (HAUTE ATELIER)
  // ==========================================
  return (
    <div className="clients-page">
      {/* Cabecera Haute Atelier */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={26} className="text-accent" /> Directorio de Clientes
          </div>
          <div className="page-subtitle">
            Base de datos de clientes, historial de sesiones y programa de fidelización VIP
          </div>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => setShowModal(true)} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {error && <div className="alert-danger-card" style={{ marginBottom: 16 }}>{error}</div>}
      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#4ade80',
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Quick Metrics Bar (Haute Atelier) */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="kpi-card" style={{ background: '#161922', border: '1px solid #282f42', borderRadius: 10, padding: 14 }}>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>Total Clientes</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>{totalCount}</div>
        </div>
        <div className="kpi-card" style={{ background: '#161922', border: '1px solid #282f42', borderRadius: 10, padding: 14 }}>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2, color: '#f59e0b' }}>Nivel Oro (VIP)</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>{oroCount}</div>
        </div>
        <div className="kpi-card" style={{ background: '#161922', border: '1px solid #282f42', borderRadius: 10, padding: 14 }}>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2, color: '#94a3b8' }}>Nivel Plata</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#94a3b8' }}>{plataCount}</div>
        </div>
        <div className="kpi-card" style={{ background: '#161922', border: '1px solid #282f42', borderRadius: 10, padding: 14 }}>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2, color: '#d97706' }}>Nivel Bronce</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706' }}>{bronceCount}</div>
        </div>
        <div className="kpi-card" style={{ background: '#161922', border: '1px solid #282f42', borderRadius: 10, padding: 14 }}>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2, color: '#e8b86d' }}>LTV Total Estimado</div>
          <div className="text-accent" style={{ fontSize: '1.3rem', fontWeight: 800 }}>{fmt(ltvTotal)}</div>
        </div>
      </div>

      {/* Sticky Search & Tier Filter Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          
          {/* Input de Búsqueda */}
          <div style={{ position: 'relative', flex: '1', minWidth: 220 }}>
            <Search size={16} className="text-muted" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre, email, teléfono o Instagram..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          {/* Filtros por Categoría / Tier */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => setTierFilter('ALL')}
              style={{
                background: tierFilter === 'ALL' ? '#e8b86d' : '#1c202d',
                color: tierFilter === 'ALL' ? '#2a1a00' : '#94a3b8',
                border: '1px solid #2d3548', padding: '6px 12px', borderRadius: 20,
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setTierFilter('ORO')}
              style={{
                background: tierFilter === 'ORO' ? '#f59e0b' : '#1c202d',
                color: tierFilter === 'ORO' ? '#2a1a00' : '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)', padding: '6px 12px', borderRadius: 20,
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Oro ({oroCount})
            </button>
            <button
              onClick={() => setTierFilter('PLATA')}
              style={{
                background: tierFilter === 'PLATA' ? '#94a3b8' : '#1c202d',
                color: tierFilter === 'PLATA' ? '#2a1a00' : '#cbd5e1',
                border: '1px solid rgba(148, 163, 184, 0.3)', padding: '6px 12px', borderRadius: 20,
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Plata ({plataCount})
            </button>
            <button
              onClick={() => setTierFilter('BRONCE')}
              style={{
                background: tierFilter === 'BRONCE' ? '#d97706' : '#1c202d',
                color: tierFilter === 'BRONCE' ? '#2a1a00' : '#d97706',
                border: '1px solid rgba(217, 119, 6, 0.3)', padding: '6px 12px', borderRadius: 20,
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Bronce ({bronceCount})
            </button>
            {eventsCount > 0 && (
              <button
                onClick={() => setTierFilter('EVENTS')}
                style={{
                  background: tierFilter === 'EVENTS' ? '#3b82f6' : '#1c202d',
                  color: tierFilter === 'EVENTS' ? '#ffffff' : '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)', padding: '6px 12px', borderRadius: 20,
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                Eventos Próximos ({eventsCount})
              </button>
            )}
          </div>

        </div>
      </div>

      {/* VISTA DE TABLA PARA DESKTOP */}
      <div className="table-wrapper desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente & Nivel</th>
              <th>Contacto (WhatsApp)</th>
              <th>Email</th>
              <th>Próximo Evento</th>
              <th>Referido por</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(c => {
              const clientId = c.id || c.id_cliente
              const phone = (c.telefono || '').replace(/\D/g, '')
              const badge = getLoyaltyBadge(c.descuento_sugerido_pct || 0)

              return (
                <tr key={clientId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(232, 184, 109, 0.25) 0%, rgba(217, 145, 54, 0.1) 100%)',
                        border: '1px solid rgba(232, 184, 109, 0.4)',
                        color: '#f5b955', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0
                      }}>
                        {getInitials(c.nombre)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{c.nombre}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <span className={`loyalty-badge ${badge.cls}`} style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                            {badge.icon} {badge.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.telefono ? (
                      <a 
                        href={`https://wa.me/${phone}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-accent" 
                        style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 500 }}
                      >
                        <MessageCircle size={14} /> {c.telefono}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: '0.85rem' }}>
                        <Mail size={13} /> {c.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td>
                    {c.proximo_evento ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px',
                        borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)'
                      }}>
                        <Clock size={12} /> {c.proximo_evento.tipo} ({c.proximo_evento.dias}d)
                      </span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Sin eventos</span>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {c.referred_by_name || 'Directo'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary btn-sm" onClick={() => navigate(`/clients/${clientId}`)}>
                      Ver Perfil
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* VISTA DE TARJETAS TÁCTILES PARA MÓVILES (HAUTE ATELIER) */}
      <div className="mobile-only client-cards-list">
        {filteredClients.length === 0 ? (
          <div className="no-data">No se encontraron clientes con los filtros seleccionados.</div>
        ) : (
          filteredClients.map(c => {
            const clientId = c.id || c.id_cliente
            const phone = (c.telefono || '').replace(/\D/g, '')
            const badge = getLoyaltyBadge(c.descuento_sugerido_pct || 0)

            return (
              <div 
                key={clientId} 
                className="client-mobile-card"
                style={{
                  background: '#161922', border: '1px solid #282f42', borderRadius: 12,
                  padding: 14, marginBottom: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e8b86d 0%, #c78d4d 100%)',
                    color: '#2a1a00', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, flexShrink: 0
                  }}>
                    {getInitials(c.nombre)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {c.nombre}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span className={`loyalty-badge ${badge.cls}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                        {badge.label}
                      </span>
                      {c.proximo_evento && (
                        <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                          • {c.proximo_evento.tipo} ({c.proximo_evento.dias}d)
                        </span>
                      )}
                    </div>
                  </div>
                  {c.instagram && (
                    <a
                      href={`https://instagram.com/${c.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: 'auto', color: '#e8b86d', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      <AtSign size={13} /> {c.instagram}
                    </a>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #232a3b' }}>
                  {c.telefono ? (
                    <>
                      <a
                        href={`https://wa.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#25D366', color: '#0b2b18', padding: '6px 12px',
                          borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none'
                        }}
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                      <a
                        href={`tel:${phone}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#1c202d', color: '#cbd5e1', border: '1px solid #2d3548',
                          padding: '6px 10px', borderRadius: 6, fontSize: '0.8rem', textDecoration: 'none'
                        }}
                      >
                        <Phone size={14} /> Llamar
                      </a>
                    </>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Sin teléfono</span>
                  )}

                  <button
                    className="btn-secondary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => navigate(`/clients/${clientId}`)}
                  >
                    Ver Perfil
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={20} className="text-accent" /> Registrar Nuevo Cliente
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    className="form-input"
                    value={newClient.nombre}
                    onChange={e => setNewClient({ ...newClient, nombre: e.target.value })}
                    placeholder="Ej: Sofia Morales"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono (WhatsApp)</label>
                  <input
                    className="form-input"
                    value={newClient.telefono}
                    onChange={e => setNewClient({ ...newClient, telefono: e.target.value })}
                    placeholder="555-0199"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={newClient.email}
                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="sofia@email.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Instagram</label>
                  <input
                    className="form-input"
                    value={newClient.instagram}
                    onChange={e => setNewClient({ ...newClient, instagram: e.target.value })}
                    placeholder="@sofia.foto"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha de Aniversario</label>
                  <input
                    className="form-input"
                    type="date"
                    value={newClient.fecha_aniversario}
                    onChange={e => setNewClient({ ...newClient, fecha_aniversario: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cumpleaños Hijos o Parto</label>
                  <input
                    className="form-input"
                    type="date"
                    value={newClient.fecha_cumpleanos_hijos_o_parto}
                    onChange={e => setNewClient({ ...newClient, fecha_cumpleanos_hijos_o_parto: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Recomendado Por</label>
                <select
                  className="form-select"
                  value={newClient.referred_by_client_id}
                  onChange={e => setNewClient({ ...newClient, referred_by_client_id: e.target.value })}
                >
                  <option value="">Llegó por cuenta propia (Instagram, Web, etc.)</option>
                  {clients.map(c => (
                    <option key={c.id || c.id_cliente} value={c.id || c.id_cliente}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Preferencias de Estilo</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={newClient.notas_estilo_preferencias}
                  onChange={e => setNewClient({ ...newClient, notas_estilo_preferencias: e.target.value })}
                  placeholder="Ej: Prefiere fotos espontáneas, estética editorial, locaciones en exterior..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={creating || !newClient.nombre.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle size={16} /> {creating ? 'Guardando...' : 'Crear Ficha de Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
