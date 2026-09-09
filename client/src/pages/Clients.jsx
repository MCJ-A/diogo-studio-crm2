import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Users, Calendar, Edit, Save, XCircle, MessageCircle, Mail, Phone, AtSign, 
  Trophy, Medal, Award, Plus, ArrowLeft, Heart, Cake, Gift, Copy, Check, 
  Sparkles, AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0)
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

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
  if (pct >= 20) return { icon: <Trophy size={14} />, label: 'Oro', cls: 'loyalty-oro', pct: 20 }
  if (pct >= 15) return { icon: <Medal size={14} />, label: 'Plata', cls: 'loyalty-plata', pct: 15 }
  return { icon: <Award size={14} />, label: 'Bronce', cls: 'loyalty-bronce', pct: pct || 0 }
}

export default function Clients() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  
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

    return (
      <div>
        <button className="back-btn" onClick={() => navigate('/clients')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Volver a Lista de Clientes
        </button>

        {error && (
          <div className="alert-danger-card" style={{ marginBottom: 16 }}>
            <AlertCircle size={18} className="text-danger" style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle size={18} /> {successMsg}
          </div>
        )}
        
        {/* Cabecera del Cliente */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selected.nombre}
            </div>
            <div className="page-subtitle" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <span className={`loyalty-badge ${badge.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {badge.icon} Nivel {badge.label} ({badge.pct}% Descuento Sugerido)
              </span>
              {selected.referred_by_name && (
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                  • Referido por: <strong style={{ color: 'var(--text)' }}>{selected.referred_by_name}</strong>
                </span>
              )}
            </div>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        {/* Barra de Fidelidad & Métricas VIP */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card accent">
            <div className="kpi-icon" style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#f59e0b' }}>
              <Award size={20} />
            </div>
            <div>
              <div className="kpi-label">Estatus de Cliente</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem' }}>VIP {badge.label}</div>
            </div>
          </div>

          <div className="kpi-card success">
            <div className="kpi-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
              <Gift size={20} />
            </div>
            <div>
              <div className="kpi-label">Descuento Sugerido</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{loyalty?.descuento_sugerido_pct || 0}%</div>
            </div>
          </div>

          <div className="kpi-card info">
            <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div className="kpi-label">Sesiones Completadas</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{loyalty?.sesiones_completadas || 0}</div>
            </div>
          </div>

          <div className="kpi-card accent">
            <div className="kpi-icon" style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#f59e0b' }}>
              <Trophy size={20} />
            </div>
            <div>
              <div className="kpi-label">Inversión Histórica</div>
              <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{fmt(loyalty?.total_gastado)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* TARJETA 1: PRÓXIMA PROMOCIÓN POR CICLO DE VIDA */}
          {recommendedPromo && (
            <div className="card" style={{ border: '1px solid rgba(217, 119, 6, 0.4)', background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.07) 0%, rgba(17, 24, 39, 0.8) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                    <Sparkles size={18} /> Próxima Promoción Sugerida por Ciclo de Vida
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', color: '#fff' }}>
                    {recommendedPromo.sugerencia_servicio}
                  </h3>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                    Motivo: <span style={{ color: 'var(--text)' }}>{recommendedPromo.motivo}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.95rem' }}>
                      {fmt(recommendedPromo.precio_base)}
                    </span>
                    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.35rem' }}>
                      {fmt(recommendedPromo.precio_con_descuento)}
                    </span>
                  </div>
                  <span className="loyalty-badge loyalty-oro" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                    -{recommendedPromo.descuento_pct}% OFF Fidelidad VIP
                  </span>
                </div>
              </div>

              {/* Caja con la propuesta redactada para WhatsApp */}
              <div style={{
                marginTop: 16,
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '14px',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                color: '#e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.8rem', color: '#9ca3af' }}>
                  <span>Mensaje personalizado listo para enviar:</span>
                  <button 
                    onClick={() => copyPitchToClipboard(recommendedPromo.whatsapp_pitch)}
                    style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}
                  >
                    {copiedPitch ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar texto</>}
                  </button>
                </div>
                "{recommendedPromo.whatsapp_pitch}"
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                {phone ? (
                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(recommendedPromo.whatsapp_pitch)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                  >
                    <MessageCircle size={16} /> Enviar Propuesta por WhatsApp
                  </a>
                ) : (
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Agrega un teléfono para enviar por WhatsApp</span>
                )}
              </div>
            </div>
          )}

          {/* TARJETA 2: TRATO EXCLUSIVO Y FECHAS ESPECIALES */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Heart size={18} className="text-accent" /> Trato Exclusivo & Fechas Especiales
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
              {/* Evento 1: Aniversario */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(217, 119, 6, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                  <Heart size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Aniversario de Pareja / Boda</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {selected.fecha_aniversario ? fmtDate(selected.fecha_aniversario) : 'No registrada'}
                  </div>
                </div>
                {phone && (
                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(`¡Hola ${firstName}! En Diogo Studio nos acordamos de ustedes y queríamos enviarles un cálido saludo por su aniversario. ¡Esperamos que lo celebren en grande!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm"
                    title="Felicitar por WhatsApp"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  >
                    <MessageCircle size={14} /> Saludar
                  </a>
                )}
              </div>

              {/* Evento 2: Cumpleaños / Parto */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', flexShrink: 0 }}>
                  <Cake size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Cumpleaños Hijos o Parto</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {selected.fecha_cumpleanos_hijos_o_parto ? fmtDate(selected.fecha_cumpleanos_hijos_o_parto) : 'No registrada'}
                  </div>
                </div>
                {phone && (
                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(`¡Hola ${firstName}! Te escribimos de Diogo Studio con mucho cariño para felicitar al peque por su fecha especial. ¡Que sigan creando momentos inolvidables!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm"
                    title="Felicitar por WhatsApp"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  >
                    <MessageCircle size={14} /> Felicitar
                  </a>
                )}
              </div>
            </div>

            {/* Listado de eventos activos calculados */}
            {events.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                {events.map((ev, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: ev.urgente ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      border: `1px solid ${ev.urgente ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                      color: ev.urgente ? '#fbbf24' : '#60a5fa',
                      borderRadius: 20,
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 500
                    }}
                  >
                    <Clock size={12} /> {ev.titulo}: en {ev.dias_restantes} días ({fmtDate(ev.proxima_fecha)})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* TARJETA 3: DATOS PERSONALES Y PREFERENCIAS */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Edit size={18} className="text-accent" /> Ficha de Datos Personales y Preferencias
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
                  placeholder="555-0101"
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
                  placeholder="cliente@email.com"
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
                <label className="form-label">Fecha de Aniversario (Boda / Pareja)</label>
                <input
                  className="form-input"
                  type="date"
                  value={editData.fecha_aniversario || ''}
                  onChange={e => setEditData({ ...editData, fecha_aniversario: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cumpleaños Hijos o Fecha de Parto</label>
                <input
                  className="form-input"
                  type="date"
                  value={editData.fecha_cumpleanos_hijos_o_parto || ''}
                  onChange={e => setEditData({ ...editData, fecha_cumpleanos_hijos_o_parto: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Recomendado Por (Cliente Referidor)</label>
              <select
                className="form-select"
                value={editData.referred_by_client_id || ''}
                onChange={e => setEditData({ ...editData, referred_by_client_id: e.target.value })}
              >
                <option value="">Ninguno / Llegó por Redes o Búsqueda Directa</option>
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
                placeholder="Ej: Prefiere luz cálida de atardecer, estilo natural sin poses rígidas, paleta de colores neutros..."
              />
            </div>
          </div>

          {/* TARJETA 4: HISTORIAL DE RESERVAS */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} className="text-accent" /> Historial de Sesiones y Reservas
            </div>
            {bookings.length === 0 ? (
              <div className="no-data">Sin reservas registradas para este cliente</div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Fecha</th>
                      <th>Ubicación</th>
                      <th>Estado</th>
                      <th>Galería</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id || b.id_reserva}>
                        <td style={{ fontWeight: 500 }}>{b.servicio_nombre || 'Servicio'}</td>
                        <td>{fmtDate(b.fecha_sesion)}</td>
                        <td>{b.ubicacion || '—'}</td>
                        <td><StatusBadge status={b.estado} /></td>
                        <td>
                          {b.url_galeria ? (
                            <a href={b.url_galeria} target="_blank" rel="noopener noreferrer" className="text-accent" style={{ fontSize: '0.85rem' }}>
                              Ver Galería
                            </a>
                          ) : '—'}
                        </td>
                        <td className="text-accent" style={{ fontWeight: 700, textAlign: 'right' }}>
                          {fmt(b.monto_bruto || b.precio_base)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // ==========================================
  // LIST VIEW: LISTA DE CLIENTES Y TARJETAS
  // ==========================================
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={24} className="text-accent" /> Clientes
          </div>
          <div className="page-subtitle">{clients.length} clientes registrados con seguimiento personalizado</div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {error && (
        <div className="alert-danger-card" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} className="text-danger" style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Vista de tabla para escritorio */}
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
            {clients.map(c => {
              const clientId = c.id || c.id_cliente
              const phone = (c.telefono || '').replace(/\D/g, '')
              const badge = getLoyaltyBadge(c.descuento_sugerido_pct || 0)

              return (
                <tr key={clientId}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{c.nombre}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span className={`loyalty-badge ${badge.cls}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        {badge.icon} {badge.label}
                      </span>
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
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

      {/* Vista de tarjetas táctiles para móviles */}
      <div className="mobile-only client-cards-list">
        {clients.length === 0 ? (
          <div className="no-data">No hay clientes registrados</div>
        ) : (
          clients.map(c => {
            const clientId = c.id || c.id_cliente
            const phone = (c.telefono || '').replace(/\D/g, '')
            const badge = getLoyaltyBadge(c.descuento_sugerido_pct || 0)

            return (
              <div key={clientId} className="client-mobile-card">
                <div className="client-mobile-card-header">
                  <div>
                    <h3 className="client-mobile-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {c.nombre}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
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
                      className="client-mobile-insta"
                    >
                      <AtSign size={13} /> {c.instagram}
                    </a>
                  )}
                </div>

                <div className="client-mobile-actions" style={{ marginTop: 12 }}>
                  {c.telefono ? (
                    <>
                      <a
                        href={`https://wa.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-whatsapp-mobile"
                      >
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                      <a
                        href={`tel:${phone}`}
                        className="btn-call-mobile"
                        title="Llamar"
                      >
                        <Phone size={16} /> Llamar
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

      {/* Modal Nuevo Cliente con todos los campos de personalización */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
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

