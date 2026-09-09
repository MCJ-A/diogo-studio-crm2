import { useState, useEffect, useRef } from 'react'
import { 
  Calendar, Users, Camera, Edit, MapPin, CheckCircle, Clock, Save, 
  XCircle, ChevronRight, FileText, FileSignature, CheckSquare, 
  MessageCircle, AlertTriangle, Plus, Printer, ExternalLink, 
  Sparkles, DollarSign, ArrowRight, ShieldCheck, PhoneCall
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0)
const fmtDate = d => {
  if (!d) return '—'
  const dateObj = new Date(d.includes('T') ? d : d + 'T00:00:00')
  return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ESTADOS = [
  { id: '', label: 'Todos los estados' },
  { id: 'Agendada', label: 'Agendada' },
  { id: 'Realizada', label: 'Realizada' },
  { id: 'Seleccion_pendiente', label: 'Selección Pendiente' },
  { id: 'En_edicion', label: 'En Edición' },
  { id: 'Entregada', label: 'Entregada' },
  { id: 'Cancelada', label: 'Cancelada' }
]

const PIPELINE_STEPS = [
  { id: 'Agendada', label: 'Agendada' },
  { id: 'Realizada', label: 'Realizada' },
  { id: 'Seleccion_pendiente', label: 'Selección' },
  { id: 'En_edicion', label: 'En Edición' },
  { id: 'Entregada', label: 'Entregada' }
]

const EMPTY_BOOKING = {
  id_cliente: '', id_servicio: '', fecha_sesion: '', ubicacion: '',
  contrato_firmado: false, notas_internas: ''
}

export default function Bookings() {
  const detailRef = useRef(null)
  const [bookings, setBookings] = useState([])
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterEstado, setFilterEstado] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newBooking, setNewBooking] = useState(EMPTY_BOOKING)
  const [creating, setCreating] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/bookings').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/services').then(r => r.json()),
    ]).then(([bd, cd, sd]) => {
      const bArr = Array.isArray(bd) ? bd : bd.bookings || []
      setBookings(bArr)
      setClients(Array.isArray(cd) ? cd : cd.clients || [])
      setServices(Array.isArray(sd) ? sd : sd.services || [])
      if (bArr.length > 0 && !selected) {
        setSelected(bArr[0])
      }
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false))
  }, [])

  const refetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings')
      const data = await res.json()
      const arr = Array.isArray(data) ? data : data.bookings || []
      setBookings(arr)
      if (selected) {
        const updated = arr.find(b => (b.id_reserva || b.id) === (selected.id_reserva || selected.id))
        if (updated) setSelected(updated)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const updateEstado = async (id, estado, extra = {}) => {
    setActionLoading(true)
    try {
      const bId = id || selected?.id_reserva || selected?.id
      const res = await fetch(`/api/bookings/${bId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado,
          razon_cancelacion: extra.motivo_cancelacion || extra.razon_cancelacion,
          ...extra
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || err.message || 'Error al actualizar estado')
      }
      await refetchBookings()
      setSuccessMsg(`Estado actualizado a: ${estado.replace('_', ' ')}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 4000)
    } finally {
      setActionLoading(false)
    }
  }

  const updateContrato = async (id, val) => {
    setActionLoading(true)
    try {
      const bId = id || selected?.id_reserva || selected?.id
      await fetch(`/api/bookings/${bId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrato_firmado: val }),
      })
      await refetchBookings()
      setSuccessMsg(val ? 'Contrato marcado como firmado' : 'Contrato desmarcado')
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const clientId = parseInt(newBooking.id_cliente || newBooking.client_id)
      const serviceId = parseInt(newBooking.id_servicio || newBooking.service_id)
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          id_cliente: clientId,
          service_id: serviceId,
          id_servicio: serviceId,
          fecha_sesion: newBooking.fecha_sesion,
          ubicacion: newBooking.ubicacion,
          contrato_firmado: !!newBooking.contrato_firmado,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear reserva')
      }
      await refetchBookings()
      setNewBooking(EMPTY_BOOKING)
      setShowModal(false)
      setSuccessMsg('Reserva creada exitosamente')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Métricas rápidas
  const activasCount = bookings.filter(b => ['Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion'].includes(b.estado)).length
  const porEntregarCount = bookings.filter(b => b.estado === 'En_edicion').length
  const completadasCount = bookings.filter(b => b.estado === 'Entregada').length

  const filtered = bookings.filter(b => {
    const matchesEstado = filterEstado ? b.estado?.toLowerCase() === filterEstado.toLowerCase() : true
    const term = searchTerm.toLowerCase()
    const matchesSearch = term ? (
      (b.nombre_cliente || b.cliente_nombre || '').toLowerCase().includes(term) ||
      (b.nombre_servicio || b.servicio_nombre || '').toLowerCase().includes(term) ||
      (b.ubicacion || '').toLowerCase().includes(term)
    ) : true
    return matchesEstado && matchesSearch
  })

  const getInitials = (name = '') => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'DS'
  }

  const getWhatsAppReminderUrl = (booking) => {
    const phone = (booking?.telefono_cliente || booking?.cliente_telefono || '').replace(/\D/g, '')
    const clientName = (booking?.nombre_cliente || booking?.cliente_nombre || 'Estimado/a').split(' ')[0]
    const dateStr = fmtDate(booking?.fecha_sesion)
    const serviceName = booking?.nombre_servicio || booking?.servicio_nombre || 'tu sesión'
    const msg = encodeURIComponent(`¡Hola ${clientName}! 👋 Te saludamos de Diogo Studio. Recordatorio de tu sesión de fotos (${serviceName}) programada para el ${dateStr}. ¿Todo listo para tu experiencia fotográfica? ✨`)
    return phone ? `https://wa.me/${phone}?text=${msg}` : null
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div className="bookings-page">
      {/* Cabecera Haute Atelier */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={26} className="text-accent" /> Reservas
          </div>
          <div className="page-subtitle">
            Gestiona tu agenda de sesiones fotográficas, producción y entregas
          </div>
          
          {/* Quick Metrics Badges */}
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(232, 184, 109, 0.12)', border: '1px solid rgba(232, 184, 109, 0.3)',
              color: '#e8b86d', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e8b86d', boxShadow: '0 0 6px #e8b86d' }} />
              Activas: {activasCount}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600
            }}>
              <Clock size={12} /> Por Entregar: {porEntregarCount}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600
            }}>
              <CheckCircle size={12} /> Entregadas: {completadasCount}
            </span>
          </div>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => setShowModal(true)} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
        >
          <Plus size={18} /> Nueva Reserva
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

      {/* Grid Principal Master-Detail 7/5 */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
        
        {/* PANEL IZQUIERDO: AGENDA Y LISTADO (7 COLUMNAS) */}
        <div style={{ gridColumn: 'span 7' }} className="bookings-table-panel">
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} className="text-accent" />
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Agenda de Sesiones</span>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>({filtered.length})</span>
              </div>
              
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar sesión o cliente..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: 170, fontSize: '0.85rem', padding: '6px 10px' }}
                />
                <select 
                  className="form-input" 
                  style={{ width: 'auto', fontSize: '0.85rem', padding: '6px 10px' }} 
                  value={filterEstado} 
                  onChange={e => setFilterEstado(e.target.value)}
                >
                  {ESTADOS.map(e => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="no-data" style={{ padding: 40, textAlign: 'center' }}>
                No se encontraron reservas con los filtros aplicados.
              </div>
            ) : (
              <>
                {/* Tabla para Desktop */}
                <div className="table-wrapper desktop-only">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Servicio</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(b => {
                        const isSelected = (selected?.id_reserva || selected?.id) === (b.id_reserva || b.id)
                        const clientName = b.nombre_cliente || b.cliente_nombre || 'Cliente'
                        const serviceName = b.nombre_servicio || b.servicio_nombre || 'Servicio'

                        return (
                          <tr 
                            key={b.id_reserva || b.id} 
                            className={isSelected ? 'selected-row' : ''}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(232, 184, 109, 0.08)' : undefined,
                              borderLeft: isSelected ? '3px solid #e8b86d' : '3px solid transparent',
                              transition: 'all 0.15s ease'
                            }}
                            onClick={() => { setSelected(b); setShowCancelForm(false) }}
                          >
                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                              <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{fmtDate(b.fecha_sesion)}</div>
                              {b.ubicacion && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{b.ubicacion}</div>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%',
                                  background: 'linear-gradient(135deg, rgba(232, 184, 109, 0.25) 0%, rgba(217, 145, 54, 0.1) 100%)',
                                  border: '1px solid rgba(232, 184, 109, 0.4)',
                                  color: '#f5b955', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                                }}>
                                  {getInitials(clientName)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{clientName}</div>
                                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    {b.contrato_firmado ? (
                                      <span style={{ color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                        <ShieldCheck size={11} /> Contrato OK
                                      </span>
                                    ) : (
                                      <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                        <AlertTriangle size={11} /> Sin firmar
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, fontSize: '0.88rem', color: '#e2e8f0' }}>{serviceName}</div>
                              <div className="text-accent" style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                {fmt(b.monto_bruto)}
                              </div>
                            </td>
                            <td>
                              <StatusBadge status={b.estado} />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <ChevronRight size={18} className={isSelected ? 'text-accent' : 'text-muted'} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tarjetas Táctiles para Móvil */}
                <div className="mobile-only booking-cards-list">
                  {filtered.map(b => {
                    const isSelected = (selected?.id_reserva || selected?.id) === (b.id_reserva || b.id)
                    const clientName = b.nombre_cliente || b.cliente_nombre || 'Cliente'
                    const serviceName = b.nombre_servicio || b.servicio_nombre || 'Servicio'

                    return (
                      <div
                        key={b.id_reserva || b.id}
                        className={`booking-mobile-card ${isSelected ? 'selected' : ''}`}
                        style={{
                          background: '#161922', border: isSelected ? '1px solid #e8b86d' : '1px solid #282f42',
                          borderRadius: 12, padding: 14, marginBottom: 12, cursor: 'pointer'
                        }}
                        onClick={() => {
                          setSelected(b)
                          setShowCancelForm(false)
                          setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
                        }}
                      >
                        <div className="booking-mobile-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span className="booking-mobile-date" style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={13} className="text-accent" /> {fmtDate(b.fecha_sesion)}
                          </span>
                          <StatusBadge status={b.estado} />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(232, 184, 109, 0.2)', border: '1px solid #e8b86d',
                            color: '#e8b86d', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {getInitials(clientName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>{clientName}</div>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{serviceName}</div>
                          </div>
                          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                            <div className="text-accent" style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fmt(b.monto_bruto)}</div>
                          </div>
                        </div>

                        {b.ubicacion && (
                          <div className="booking-mobile-loc" style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} /> {b.ubicacion}
                          </div>
                        )}

                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #232a3b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: b.contrato_firmado ? '#4ade80' : '#f59e0b' }}>
                            {b.contrato_firmado ? '✓ Contrato Firmado' : '⚠ Contrato Pendiente'}
                          </span>
                          <span className="text-accent" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            Ver detalles <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: DETALLE DE SESIÓN & FLUJO HAUTE ATELIER (5 COLUMNAS) */}
        <div style={{ gridColumn: 'span 5' }} className="bookings-detail-panel" ref={detailRef}>
          {selected ? (
            <div className="card sticky" style={{ top: 20, padding: 22, border: '1px solid rgba(232, 184, 109, 0.25)' }}>
              
              {/* Header de Detalle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} className="text-accent" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                      Detalle #RES-{selected.id_reserva || selected.id}
                    </h3>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>
                    ID Cliente #{selected.id_cliente || selected.client_id}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    className="modal-close mobile-only"
                    onClick={() => setSelected(null)}
                    title="Cerrar detalle"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>

              {/* Hero Visual Session Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #1f2433 0%, #151821 100%)',
                border: '1px solid rgba(232, 184, 109, 0.25)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', top: -15, right: -15, width: 80, height: 80,
                  background: 'radial-gradient(circle, rgba(232, 184, 109, 0.15) 0%, transparent 70%)',
                  borderRadius: '50%'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e8b86d 0%, #c78d4d 100%)',
                    color: '#2a1a00', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1rem', fontWeight: 800, flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(232, 184, 109, 0.3)'
                  }}>
                    {getInitials(selected.nombre_cliente || selected.cliente_nombre)}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                      {selected.nombre_cliente || selected.cliente_nombre}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                      {selected.nombre_servicio || selected.servicio_nombre}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Monto Total</div>
                    <div className="text-accent" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                      {fmt(selected.monto_bruto)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Bento Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{
                  background: '#161922', padding: 12, borderRadius: 8,
                  border: '1px solid #262c3e'
                }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Calendar size={13} className="text-accent" /> Fecha de Sesión
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>
                    {fmtDate(selected.fecha_sesion)}
                  </div>
                </div>

                <div style={{
                  background: '#161922', padding: 12, borderRadius: 8,
                  border: '1px solid #262c3e'
                }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <MapPin size={13} className="text-accent" /> Locación
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selected.ubicacion || 'Estudio Diogo'}
                  </div>
                </div>
              </div>

              {/* Contrato Legal Toggle */}
              <div style={{
                background: selected.contrato_firmado ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: selected.contrato_firmado ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileSignature size={18} style={{ color: selected.contrato_firmado ? '#4ade80' : '#f59e0b' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                      {selected.contrato_firmado ? 'Contrato Firmado Digitalmente' : 'Contrato Pendiente de Firma'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {selected.contrato_firmado ? 'Válido para procesar y entregar' : 'Requerido para avanzar de fase'}
                    </div>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={!!selected.contrato_firmado}
                    disabled={actionLoading}
                    onChange={e => updateContrato(selected.id_reserva || selected.id, e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#e8b86d', cursor: 'pointer' }}
                  />
                  <span>{selected.contrato_firmado ? 'Firmado' : 'Marcar'}</span>
                </label>
              </div>

              {/* Flujo de Trabajo / Status Switcher */}
              <div style={{
                background: '#161922', borderRadius: 10, padding: 14,
                border: '1px solid #282f42', marginBottom: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="text-muted" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Flujo de Producción
                  </div>
                  <StatusBadge status={selected.estado} />
                </div>

                {/* Pipeline visual steps */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isActive = selected.estado?.toLowerCase() === step.id.toLowerCase()
                    return (
                      <button
                        key={step.id}
                        disabled={actionLoading}
                        onClick={() => updateEstado(selected.id_reserva || selected.id, step.id)}
                        style={{
                          flex: 1, minWidth: 60, padding: '6px 4px', fontSize: '0.72rem',
                          borderRadius: 6, border: 'none',
                          background: isActive ? 'linear-gradient(135deg, #e8b86d 0%, #c78d4d 100%)' : '#232a3b',
                          color: isActive ? '#2a1a00' : '#94a3b8',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          textAlign: 'center'
                        }}
                      >
                        {step.label}
                      </button>
                    )
                  })}
                </div>

                {/* Estado Cancelada Info o Form */}
                {selected.estado?.toLowerCase() === 'cancelada' && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: '8px 12px', color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <XCircle size={14} /> Cancelada: {selected.motivo_cancelacion || 'Sin motivo especificado'}
                  </div>
                )}

                {selected.estado?.toLowerCase() !== 'cancelada' && !showCancelForm && (
                  <button
                    onClick={() => setShowCancelForm(true)}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444',
                      fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex',
                      alignItems: 'center', gap: 4, marginTop: 4, padding: 0
                    }}
                  >
                    <XCircle size={13} /> Cancelar esta reserva
                  </button>
                )}

                {showCancelForm && (
                  <div style={{ marginTop: 10, background: '#1c202d', padding: 12, borderRadius: 8, border: '1px solid #3b4257' }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', color: '#cbd5e1' }}>
                      Motivo de cancelación:
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Ej: Reprogramado por el cliente, clima adverso..."
                      style={{ fontSize: '0.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        className="btn-danger btn-sm"
                        disabled={!cancelReason || actionLoading}
                        onClick={() => {
                          updateEstado(selected.id_reserva || selected.id, 'Cancelada', { motivo_cancelacion: cancelReason })
                          setShowCancelForm(false)
                        }}
                      >
                        Confirmar Cancelación
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setShowCancelForm(false)}>
                        Volver
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Acción Rápida */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {getWhatsAppReminderUrl(selected) && (
                  <a
                    href={getWhatsAppReminderUrl(selected)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: '#25D366', color: '#0b2b18', padding: '10px 16px',
                      borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(37, 211, 102, 0.25)', transition: 'all 0.15s ease'
                    }}
                  >
                    <MessageCircle size={18} /> Recordatorio por WhatsApp
                  </a>
                )}

                {selected.url_galeria && (
                  <a
                    href={selected.url_galeria}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.88rem' }}
                  >
                    <ExternalLink size={16} /> Abrir Galería de Fotos
                  </a>
                )}
              </div>

            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Calendar size={36} className="text-muted" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Ninguna sesión seleccionada</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                Haz clic en una reserva de la lista para ver sus detalles, gestionar su estado y enviar recordatorios.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal Nueva Reserva */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={20} className="text-accent" /> Nueva Reserva Fotográfica
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20}/></button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select 
                  className="form-input" 
                  value={newBooking.id_cliente} 
                  onChange={e => setNewBooking({...newBooking, id_cliente: e.target.value})}
                >
                  <option value="">Seleccione un cliente...</option>
                  {clients.map(c => (
                    <option key={c.id_cliente || c.id} value={c.id_cliente || c.id}>
                      {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Servicio Fotográfico *</label>
                <select 
                  className="form-input" 
                  value={newBooking.id_servicio} 
                  onChange={e => setNewBooking({...newBooking, id_servicio: e.target.value})}
                >
                  <option value="">Seleccione un servicio...</option>
                  {services.filter(s => s.activo).map(s => (
                    <option key={s.id_servicio || s.id} value={s.id_servicio || s.id}>
                      {s.nombre} — {fmt(s.precio_base)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha de Sesión *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newBooking.fecha_sesion} 
                    onChange={e => setNewBooking({...newBooking, fecha_sesion: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Locación (opcional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newBooking.ubicacion} 
                    onChange={e => setNewBooking({...newBooking, ubicacion: e.target.value})} 
                    placeholder="Estudio Diogo, Exterior, etc." 
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
                  <input
                    type="checkbox"
                    checked={newBooking.contrato_firmado}
                    onChange={e => setNewBooking({...newBooking, contrato_firmado: e.target.checked})}
                    style={{ width: 16, height: 16, accentColor: '#e8b86d' }}
                  />
                  <span style={{ fontSize: '0.88rem', color: '#e2e8f0' }}>Marcar contrato como firmado previamente</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button 
                className="btn-primary" 
                disabled={creating || !newBooking.id_cliente || !newBooking.id_servicio || !newBooking.fecha_sesion} 
                onClick={handleCreate}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle size={16} /> {creating ? 'Guardando...' : 'Crear Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
