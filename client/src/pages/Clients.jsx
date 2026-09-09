import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Users, Calendar, Edit, Save, XCircle, MessageCircle, Mail, Phone, AtSign, 
  Trophy, Medal, Award, Plus, ArrowLeft, Heart, Cake, Gift, Copy, Check, 
  Sparkles, AlertCircle, CheckCircle, Clock, ExternalLink, Search, UserCheck,
  Download, Send, Share2, Eye
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

function getLoyaltyTier(pct) {
  if (pct >= 20) return { label: 'Oro', tierKey: 'oro', cls: 'loyalty-oro', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', pct: 20 }
  if (pct >= 15) return { label: 'Plata', tierKey: 'plata', cls: 'loyalty-plata', color: '#bcc7de', bg: 'rgba(188, 199, 222, 0.15)', pct: 15 }
  return { label: 'Bronce', tierKey: 'bronce', cls: 'loyalty-bronce', color: '#c78d4d', bg: 'rgba(199, 141, 77, 0.15)', pct: pct || 0 }
}

const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'DS'
}

export default function Clients() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedDrawer, setSelectedDrawer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState('all') // 'all', 'plata', 'bronce', 'oro'
  
  // Detail states (when in /clients/:id)
  const [bookings, setBookings] = useState([])
  const [loyalty, setLoyalty] = useState(null)
  const [events, setEvents] = useState([])
  const [recommendedPromo, setRecommendedPromo] = useState(null)
  const [referrers, setReferrers] = useState([])
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [copiedPitch, setCopiedPitch] = useState(false)
  
  // Create modal
  const [showModal, setShowModal] = useState(false)
  const [newClient, setNewClient] = useState(EMPTY_CLIENT)
  const [creating, setCreating] = useState(false)

  const fetchClientsList = async () => {
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) throw new Error('Error al obtener clientes')
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.clients || []
      setClients(list)
      if (list.length > 0 && !selectedDrawer) {
        setSelectedDrawer(list[0])
      }
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
            setSelectedDrawer(data.client)
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
      setSelectedDrawer(clientObj)
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
      setSelectedDrawer(clientObj)
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

  const exportCSV = () => {
    if (clients.length === 0) return
    const headers = ['ID', 'Nombre', 'WhatsApp', 'Email', 'Nivel', 'LTV Inversión', 'Referido Por']
    const rows = clients.map(c => [
      c.id || c.id_cliente,
      `"${c.nombre || ''}"`,
      `"${c.telefono || ''}"`,
      `"${c.email || ''}"`,
      getLoyaltyTier(c.descuento_sugerido_pct || 0).label,
      c.total_gastado || c.ltv || 0,
      `"${c.referred_by_name || 'Directo'}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `clientes_diogo_atelier_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyPitchToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedPitch(true)
    setTimeout(() => setCopiedPitch(false), 2000)
  }

  // Métricas
  const totalCount = clients.length
  const plataCount = clients.filter(c => {
    const p = c.descuento_sugerido_pct || 0
    return p >= 15 && p < 20
  }).length
  const oroCount = clients.filter(c => (c.descuento_sugerido_pct || 0) >= 20).length
  const bronceCount = clients.filter(c => (c.descuento_sugerido_pct || 0) < 15).length
  const ltvTotal = clients.reduce((acc, c) => acc + parseFloat(c.total_gastado || c.ltv || 0), 0)

  // Filtrado
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch = !term || (
      (c.nombre || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.telefono || '').toLowerCase().includes(term) ||
      (c.instagram || '').toLowerCase().includes(term)
    )

    const pct = c.descuento_sugerido_pct || 0
    const tier = getLoyaltyTier(pct).tierKey
    const matchesTier = tierFilter === 'all' || tier === tierFilter || (tierFilter === 'plata' && (tier === 'plata' || tier === 'oro'))

    return matchesSearch && matchesTier
  })

  if (loading && !selected && clients.length === 0) {
    return <div className="loading-spinner"><div className="spinner" /></div>
  }

  // =======================================================
  // VISTA DETALLADA EXPANDIDA (/clients/:id)
  // =======================================================
  if (selected) {
    const tier = getLoyaltyTier(loyalty?.descuento_sugerido_pct || selected?.descuento_sugerido_pct || 0)
    const phone = (selected.telefono || '').replace(/\D/g, '')
    const firstName = (selected.nombre || 'cliente').split(' ')[0]
    const defaultPitch = `¡Hola ${firstName}! ✨ Te saludamos con mucho cariño desde Diogo Studio. Queremos recordarte que como cliente VIP nivel ${tier.label}, cuentas con un ${tier.pct}% de beneficio exclusivo para tu próxima sesión fotográfica. ¿Te gustaría agendar una fecha especial? 📸`

    return (
      <div className="client-detail-page">
        <button 
          className="back-btn" 
          onClick={() => navigate('/clients')} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, background: '#1c202d', border: '1px solid #2d3548', padding: '6px 14px', borderRadius: 8, color: '#cbd5e1', cursor: 'pointer' }}
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
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e8b86d 0%, #c78d4d 100%)',
              color: '#2a1a00', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800,
              boxShadow: '0 4px 16px rgba(232, 184, 109, 0.35)', flexShrink: 0
            }}>
              {getInitials(selected.nombre)}
            </div>
            <div>
              <div className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                {selected.nombre}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <span className={`loyalty-badge ${tier.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: '0.78rem' }}>
                  <Award size={14} /> Nivel {tier.label} ({tier.pct}% Beneficio Sugerido)
                </span>
                {selected.referred_by_name && (
                  <span className="text-muted" style={{ fontSize: '0.82rem' }}>
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

        {/* Métricas KPI de Fidelidad */}
        <div className="kpi-grid" style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div className="kpi-card accent" style={{ background: '#1a1f2e', padding: 16, borderRadius: 12, border: '1px solid #2d3548' }}>
            <div className="kpi-icon" style={{ background: tier.bg, color: tier.color, width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Award size={20} />
            </div>
            <div>
              <div className="kpi-label" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Estatus de Cliente</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>VIP {tier.label}</div>
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
              <div className="kpi-label" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Sesiones Atelier</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa' }}>{loyalty?.sesiones_completadas || bookings.length || 0} Tomas</div>
            </div>
          </div>

          <div className="kpi-card" style={{ background: '#1a1f2e', padding: 16, borderRadius: 12, border: '1px solid #2d3548' }}>
            <div className="kpi-icon" style={{ background: 'rgba(232, 184, 109, 0.15)', color: '#e8b86d', width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div className="kpi-label" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Inversión Histórica LTV</div>
              <div className="kpi-value text-accent" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {fmt(bookings.reduce((acc, b) => acc + parseFloat(b.monto_bruto || b.precio_base || 0), 0))}
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Formulario y Historial */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          
          <div style={{ gridColumn: 'span 7' }} className="client-detail-main">
            {/* Generador de Mensaje WhatsApp */}
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
                padding: 12, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5
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

            {/* Ficha de Edición */}
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

          <div style={{ gridColumn: 'span 5' }} className="client-detail-sidebar">
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

            <div className="card" style={{ background: 'linear-gradient(135deg, #1f2536 0%, #151821 100%)', border: '1px solid #333d54' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <UserCheck size={18} className="text-accent" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>Red de Referidos</span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                Cada cliente recomendado por <strong>{selected.nombre}</strong> suma beneficios acumulables para su próximo paquete.
              </div>
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#0f121a', borderRadius: 8, border: '1px solid #282f42', fontSize: '0.78rem', color: '#cbd5e1' }}>
                💡 Enlace sugerido para compartir: 
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

  // =======================================================
  // VISTA PRINCIPAL: DIRECTORIO Y DRAWER HAUTE ATELIER
  // =======================================================
  const activeDrawerTier = selectedDrawer ? getLoyaltyTier(selectedDrawer.descuento_sugerido_pct || 0) : null
  const drawerPhone = selectedDrawer?.telefono ? selectedDrawer.telefono.replace(/\D/g, '') : ''

  return (
    <div className="clients-page" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Top Stat Highlights & Ambient Header */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 16,
        background: '#191b22', padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        border: '1px solid rgba(232, 176, 114, 0.12)'
      }}>
        {/* Glow ambient circle */}
        <div style={{
          position: 'absolute', right: -50, top: -50, width: 260, height: 260,
          borderRadius: '50%', background: 'rgba(245, 185, 85, 0.05)',
          filter: 'blur(50px)', pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 2 }}>
          
          {/* Page Identity */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#282a30',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5B955',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)', flexShrink: 0
            }}>
              <Users size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
                  Directorio de Clientes
                </h1>
                <span style={{
                  background: 'rgba(232, 176, 114, 0.15)', color: '#F5B955',
                  fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20
                }}>
                  CRM V3
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.88rem' }}>
                {totalCount} clientes registrados con seguimiento personalizado, historial fotográfico y perfil de facturación.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={exportCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', background: '#282a30', color: '#94A3B8',
                border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}
            >
              <Download size={16} /> Exportar CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: '#e8b072', color: '#482900',
                border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 0 20px rgba(232, 176, 114, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={18} /> Nuevo Cliente
            </button>
          </div>

        </div>

        {/* Quick Editorial KPI Counters */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
          marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(30, 31, 38, 0.6)', backdropFilter: 'blur(4px)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>Total Clientes</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC' }}>{totalCount}</span>
              <span style={{ fontSize: '0.75rem', color: '#F5B955', fontWeight: 600 }}>+100% activo</span>
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(30, 31, 38, 0.6)', backdropFilter: 'blur(4px)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>Nivel Plata / VIP</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC' }}>{plataCount + oroCount}</span>
              <span style={{ fontSize: '0.75rem', color: '#bcc7de', fontWeight: 600 }}>{totalCount > 0 ? Math.round(((plataCount + oroCount) / totalCount) * 100) : 0}% del total</span>
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(30, 31, 38, 0.6)', backdropFilter: 'blur(4px)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>Nivel Bronce</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC' }}>{bronceCount}</span>
              <span style={{ fontSize: '0.75rem', color: '#C78D4D', fontWeight: 600 }}>Standard</span>
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(30, 31, 38, 0.6)', backdropFilter: 'blur(4px)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>Valor Facturado (LTV)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F5B955' }}>{fmt(ltvTotal)}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Atelier</span>
            </div>
          </div>
        </div>

      </div>

      {error && <div className="alert-danger-card">{error}</div>}
      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8, padding: '12px 16px', color: '#4ade80',
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Search, Filter & View Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, background: '#191b22', padding: 12, borderRadius: 12
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: 240 }}>
          <Search size={18} className="text-muted" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar cliente por nombre, email o teléfono..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: 38, width: '100%', background: '#131B2A',
              border: '1px solid #282f42', color: '#F8FAFC', borderRadius: 8
            }}
          />
        </div>

        {/* Tier Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, paddingRight: 4 }}>Filtrar:</span>
          
          <button
            onClick={() => setTierFilter('all')}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              background: tierFilter === 'all' ? '#282a30' : 'transparent',
              color: tierFilter === 'all' ? '#F5B955' : '#94A3B8',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            Todos ({totalCount})
          </button>
          
          <button
            onClick={() => setTierFilter('plata')}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              background: tierFilter === 'plata' ? '#282a30' : 'transparent',
              color: tierFilter === 'plata' ? '#F5B955' : '#94A3B8',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            Plata ({plataCount + oroCount})
          </button>
          
          <button
            onClick={() => setTierFilter('bronce')}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              background: tierFilter === 'bronce' ? '#282a30' : 'transparent',
              color: tierFilter === 'bronce' ? '#F5B955' : '#94A3B8',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            Bronce ({bronceCount})
          </button>
        </div>
      </div>

      {/* Main Directory Layout: Split Grid with Table (8 cols) and Quick Drawer Detail (4 cols) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, alignItems: 'start' }}>
        
        {/* Customer Table Card (8 Columns) */}
        <div style={{ gridColumn: 'span 8' }} className="client-detail-main">
          <div style={{ background: '#191b22', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #282f42' }}>
            
            {filteredClients.length === 0 ? (
              <div className="no-data" style={{ padding: 40, textAlign: 'center' }}>
                No se encontraron clientes con los filtros seleccionados.
              </div>
            ) : (
              <>
                {/* Tabla Desktop */}
                <div className="table-wrapper desktop-only">
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'rgba(40, 42, 48, 0.6)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '14px 18px', fontWeight: 600 }}>Cliente & Nivel</th>
                        <th style={{ padding: '14px 14px', fontWeight: 600 }}>Contacto (WhatsApp)</th>
                        <th style={{ padding: '14px 14px', fontWeight: 600 }}>Email</th>
                        <th style={{ padding: '14px 14px', fontWeight: 600 }}>Próximo Evento</th>
                        <th style={{ padding: '14px 14px', fontWeight: 600 }}>Referido por</th>
                        <th style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 600 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map(c => {
                        const isSelected = selectedDrawer && (selectedDrawer.id || selectedDrawer.id_cliente) === (c.id || c.id_cliente)
                        const phone = (c.telefono || '').replace(/\D/g, '')
                        const tier = getLoyaltyTier(c.descuento_sugerido_pct || 0)

                        return (
                          <tr
                            key={c.id || c.id_cliente}
                            onClick={() => setSelectedDrawer(c)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(30, 31, 38, 0.8)' : undefined,
                              borderLeft: isSelected ? '3px solid #F5B955' : '3px solid transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 40, height: 40, borderRadius: '50%',
                                  background: tier.tierKey === 'plata' || tier.tierKey === 'oro' ? '#3e495d' : '#33343b',
                                  color: tier.tierKey === 'plata' || tier.tierKey === 'oro' ? '#d8e3fb' : '#ffcd99',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.9rem', fontWeight: 700, flexShrink: 0
                                }}>
                                  {getInitials(c.nombre)}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 600, color: '#F8FAFC', display: 'block', fontSize: '0.9rem' }}>{c.nombre}</span>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2,
                                    padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                                    background: tier.bg, color: tier.color
                                  }}>
                                    <Award size={12} /> {tier.label}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                              {c.telefono ? (
                                <a
                                  href={`https://wa.me/${phone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#F5B955', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}
                                >
                                  <MessageCircle size={15} /> {c.telefono}
                                </a>
                              ) : (
                                <span style={{ color: '#64748B', fontSize: '0.85rem' }}>—</span>
                              )}
                            </td>

                            <td style={{ padding: '14px 14px', whiteSpace: 'nowrap', color: '#94A3B8', fontSize: '0.82rem' }}>
                              {c.email ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Mail size={14} style={{ color: '#64748B' }} />
                                  <span>{c.email}</span>
                                </div>
                              ) : '—'}
                            </td>

                            <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                              {c.proximo_evento ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 8px', borderRadius: 4, background: '#1e1f26',
                                  color: '#F5B955', fontSize: '0.75rem', fontWeight: 600
                                }}>
                                  <Clock size={12} /> {c.proximo_evento.tipo} ({c.proximo_evento.dias}d)
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 8px', borderRadius: 4, background: '#1e1f26',
                                  color: '#64748B', fontSize: '0.75rem'
                                }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#50453a' }} />
                                  Sin eventos
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '14px 14px', whiteSpace: 'nowrap', color: '#94A3B8', fontSize: '0.82rem' }}>
                              {c.referred_by_name ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Share2 size={13} style={{ color: '#64748B' }} />
                                  <span>{c.referred_by_name}</span>
                                </div>
                              ) : (
                                <span style={{ color: '#64748B' }}>Directo</span>
                              )}
                            </td>

                            <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c.id || c.id_cliente}`) }}
                                  style={{
                                    padding: '6px 12px', borderRadius: 6, background: '#1e1f26',
                                    border: '1px solid #282f42', color: '#F8FAFC', fontSize: '0.8rem',
                                    fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  Ver Perfil
                                </button>
                                {phone && (
                                  <a
                                    href={`https://wa.me/${phone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      width: 32, height: 32, borderRadius: 6, background: '#1e1f26',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      color: '#94A3B8', textDecoration: 'none'
                                    }}
                                  >
                                    <Send size={15} />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tarjetas Móviles */}
                <div className="mobile-only client-cards-list" style={{ padding: 12 }}>
                  {filteredClients.map(c => {
                    const isSelected = selectedDrawer && (selectedDrawer.id || selectedDrawer.id_cliente) === (c.id || c.id_cliente)
                    const phone = (c.telefono || '').replace(/\D/g, '')
                    const tier = getLoyaltyTier(c.descuento_sugerido_pct || 0)

                    return (
                      <div
                        key={c.id || c.id_cliente}
                        onClick={() => setSelectedDrawer(c)}
                        style={{
                          background: '#161922', border: isSelected ? '1px solid #F5B955' : '1px solid #282f42',
                          borderRadius: 12, padding: 14, marginBottom: 10, cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: '#33343b', color: '#ffcd99',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
                          }}>
                            {getInitials(c.nombre)}
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.95rem' }}>{c.nombre}</span>
                            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: tier.bg, color: tier.color, fontWeight: 600 }}>
                                {tier.label}
                              </span>
                            </div>
                          </div>
                          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                            <span style={{ fontSize: '0.85rem', color: '#F5B955', fontWeight: 700 }}>
                              {fmt(c.total_gastado || c.ltv || 0)}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #232a3b' }}>
                          {phone ? (
                            <a
                              href={`https://wa.me/${phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#25D366', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                            >
                              <MessageCircle size={14} /> WhatsApp
                            </a>
                          ) : (
                            <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Sin teléfono</span>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c.id || c.id_cliente}`) }}
                            style={{ background: 'none', border: 'none', color: '#e8b072', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Ver Perfil →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Table Footer Note */}
            <div style={{
              padding: '12px 18px', background: 'rgba(40, 42, 48, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: '#64748B', fontSize: '0.8rem'
            }}>
              <span>Mostrando {filteredClients.length} de {totalCount} clientes activos</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5B955' }} />
                <span>Sincronizado con Agenda Diogo Atelier</span>
              </div>
            </div>

          </div>
        </div>

        {/* Side Detail Panel (Client Profile Peek - 4 Columns) */}
        <div style={{ gridColumn: 'span 4' }} className="client-detail-sidebar">
          {selectedDrawer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Profile Peek Card */}
              <div style={{
                background: '#191b22', borderRadius: 14, padding: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #282f42', position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>
                    Ficha del Cliente
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                    background: activeDrawerTier?.bg, color: activeDrawerTier?.color
                  }}>
                    Nivel {activeDrawerTier?.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: '1px solid #232a3b' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 12,
                    background: activeDrawerTier?.tierKey === 'plata' || activeDrawerTier?.tierKey === 'oro' ? '#3e495d' : '#33343b',
                    color: activeDrawerTier?.tierKey === 'plata' || activeDrawerTier?.tierKey === 'oro' ? '#d8e3fb' : '#ffcd99',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', fontWeight: 800, flexShrink: 0
                  }}>
                    {getInitials(selectedDrawer.nombre)}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {selectedDrawer.nombre}
                    </h2>
                    <p style={{ margin: '2px 0 0 0', color: '#94A3B8', fontSize: '0.82rem' }}>
                      {selectedDrawer.email || 'Sin correo registrado'}
                    </p>
                    {drawerPhone && (
                      <a
                        href={`https://wa.me/${drawerPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#F5B955', fontSize: '0.82rem', fontWeight: 600, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                      >
                        <MessageCircle size={13} /> {selectedDrawer.telefono}
                      </a>
                    )}
                  </div>
                </div>

                {/* Mini Grid Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0', padding: 10, background: '#1e1f26', borderRadius: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>Sesiones Atelier</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>
                      {selectedDrawer.total_reservas || 1} Tomas
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>Inversión Total</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F5B955', marginTop: 2 }}>
                      {fmt(selectedDrawer.total_gastado || selectedDrawer.ltv || 0)}
                    </span>
                  </div>
                </div>

                {/* Additional Info Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#64748B' }}>Referencia:</span>
                    <span style={{ color: '#F8FAFC', fontWeight: 500 }}>
                      {selectedDrawer.referred_by_name || 'Directo (Campaña Editorial)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#64748B' }}>Próximo Disparo:</span>
                    <span style={{ color: selectedDrawer.proximo_evento ? '#F5B955' : '#94A3B8' }}>
                      {selectedDrawer.proximo_evento ? `${selectedDrawer.proximo_evento.tipo} (${selectedDrawer.proximo_evento.dias}d)` : 'Sin eventos programados'}
                    </span>
                  </div>
                  {selectedDrawer.notas_estilo_preferencias && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#64748B' }}>Estilo Asignado:</span>
                      <span style={{ color: '#F5B955', fontWeight: 500 }}>
                        {selectedDrawer.notas_estilo_preferencias.slice(0, 24)}...
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                  <button
                    onClick={() => navigate(`/clients/${selectedDrawer.id || selectedDrawer.id_cliente}`)}
                    style={{
                      width: '100%', padding: '10px 0', background: '#e8b072', color: '#482900',
                      border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700,
                      cursor: 'pointer', boxShadow: '0 0 15px rgba(232,176,114,0.2)', transition: 'all 0.15s ease'
                    }}
                  >
                    Ver Ficha Completa & Fidelización
                  </button>
                  {drawerPhone && (
                    <a
                      href={`https://wa.me/${drawerPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '100%', padding: '8px 0', background: '#1e1f26', color: '#94A3B8',
                        border: '1px solid #282f42', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                        textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <MessageCircle size={15} style={{ color: '#25D366' }} /> Abrir Chat WhatsApp
                    </a>
                  )}
                </div>

              </div>

              {/* Atelier Client Growth Mini-Card */}
              <div style={{
                background: '#191b22', padding: 14, borderRadius: 12, border: '1px solid #282f42',
                display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: '#1e1f26',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5B955', flexShrink: 0
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', display: 'block' }}>
                    Programa de Referidos Atelier
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    {selectedDrawer.nombre} forma parte de la red de fidelización VIP.
                  </span>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ background: '#191b22', borderRadius: 14, padding: 30, textAlign: 'center', border: '1px solid #282f42' }}>
              <Users size={32} className="text-muted" style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <div style={{ color: '#F8FAFC', fontWeight: 600 }}>Selecciona un cliente</div>
              <div style={{ color: '#64748B', fontSize: '0.82rem', marginTop: 4 }}>Haz clic en cualquier fila para ver su ficha rápida.</div>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Alta de Nuevo Cliente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: '#1e1f26',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5B955'
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#F8FAFC' }}>Alta de Nuevo Cliente</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>Añade un perfil al atelier con seguimiento de reservas</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre Completo *</label>
                <input
                  className="form-input"
                  value={newClient.nombre}
                  onChange={e => setNewClient({ ...newClient, nombre: e.target.value })}
                  placeholder="Ej. Sofía Morales"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">WhatsApp *</label>
                  <input
                    className="form-input"
                    value={newClient.telefono}
                    onChange={e => setNewClient({ ...newClient, telefono: e.target.value })}
                    placeholder="555-0199"
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

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input
                  className="form-input"
                  type="email"
                  value={newClient.email}
                  onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="sofia@email.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Referido por</label>
                <select
                  className="form-select"
                  value={newClient.referred_by_client_id}
                  onChange={e => setNewClient({ ...newClient, referred_by_client_id: e.target.value })}
                >
                  <option value="">Directo / Búsqueda Propia</option>
                  {clients.map(c => (
                    <option key={c.id || c.id_cliente} value={c.id || c.id_cliente}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notas de Estilo o Preferencias</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={newClient.notas_estilo_preferencias}
                  onChange={e => setNewClient({ ...newClient, notas_estilo_preferencias: e.target.value })}
                  placeholder="Ej. Retrato editorial, luz natural cálida..."
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
                <CheckCircle size={16} /> {creating ? 'Guardando...' : 'Guardar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
