import { useState, useEffect, useRef } from 'react'
import { 
  Calendar, Users, Camera, Edit, MapPin, CheckCircle, Clock, Save, 
  XCircle, ChevronRight, FileText, FileSignature, CheckSquare, 
  MessageCircle, AlertTriangle, Plus, Printer, ExternalLink, 
  Sparkles, DollarSign, ArrowRight, ShieldCheck, PhoneCall,
  PackageCheck, RefreshCw, Download, Send, Layers, Image as ImageIcon,
  UserPlus
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { formatWhatsAppUrl } from '../utils/whatsapp'

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
  { id: 'Seleccion_pendiente', label: 'Selección' },
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
  id_cliente: '', id_servicio: '', fecha_sesion: '', hora_sesion: '10:00', ubicacion: 'Estudio Central',
  contrato_firmado: false, notas_internas: '', isFastNewClient: false,
  fastNombre: '', fastTelefono: '', fastEmail: ''
}

const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'DS'
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
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')

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

  const updateBookingField = async (id, fields) => {
    setActionLoading(true)
    try {
      const bId = id || selected?.id_reserva || selected?.id
      const res = await fetch(`/api/bookings/${bId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar reserva')
      }
      await refetchBookings()
      setSuccessMsg('Reserva actualizada')
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 3500)
    } finally {
      setActionLoading(false)
    }
  }

  const updateContrato = async (id, val) => {
    await updateBookingField(id, { contrato_firmado: val })
  }

  const handleSaveNotes = async () => {
    const bId = activeFocusBooking?.id_reserva || activeFocusBooking?.id
    if (!bId) return
    await updateBookingField(bId, { notas_internas: notesVal })
    setEditingNotes(false)
  }

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const serviceId = parseInt(newBooking.id_servicio || newBooking.service_id)
      if (!serviceId) throw new Error('Selecciona un servicio fotográfico')
      if (!newBooking.fecha_sesion) throw new Error('Indica la fecha de la sesión')

      const bodyPayload = {
        service_id: serviceId,
        id_servicio: serviceId,
        fecha_sesion: newBooking.fecha_sesion,
        hora_sesion: newBooking.hora_sesion || '10:00',
        ubicacion: newBooking.ubicacion || 'Estudio Central',
        contrato_firmado: !!newBooking.contrato_firmado,
        notas_internas: newBooking.notas_internas || ''
      }

      if (newBooking.isFastNewClient) {
        if (!newBooking.fastNombre.trim()) {
          throw new Error('El nombre del nuevo cliente es obligatorio')
        }
        bodyPayload.nuevo_cliente = {
          nombre: newBooking.fastNombre.trim(),
          telefono: newBooking.fastTelefono.trim(),
          email: newBooking.fastEmail.trim()
        }
      } else {
        const clientId = parseInt(newBooking.id_cliente || newBooking.client_id)
        if (!clientId) throw new Error('Selecciona un cliente o usa creación rápida')
        bodyPayload.client_id = clientId
        bodyPayload.id_cliente = clientId
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear reserva')
      }
      
      await Promise.all([
        refetchBookings(),
        fetch('/api/clients').then(r => r.json()).then(cd => setClients(Array.isArray(cd) ? cd : cd.clients || []))
      ])

      setNewBooking(EMPTY_BOOKING)
      setShowModal(false)
      setSuccessMsg('Reserva creada exitosamente con beneficios aplicados')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const exportCSV = () => {
    if (bookings.length === 0) return
    const headers = ['ID Reserva', 'Cliente', 'WhatsApp', 'Servicio', 'Fecha Sesión', 'Ubicación', 'Estado', 'Monto', 'Contrato Firmado']
    const rows = bookings.map(b => [
      `"#RES-${b.id_reserva || b.id}"`,
      `"${b.nombre_cliente || b.cliente_nombre || ''}"`,
      `"${b.telefono_cliente || b.cliente_telefono || ''}"`,
      `"${b.nombre_servicio || b.servicio_nombre || ''}"`,
      b.fecha_sesion || '',
      `"${b.ubicacion || 'Estudio Central'}"`,
      b.estado || 'Agendada',
      b.monto_bruto || 0,
      b.contrato_firmado ? 'SÍ' : 'NO'
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `reservas_diogo_atelier_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Métricas
  const activasCount = bookings.filter(b => ['Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion'].includes(b.estado)).length
  const porEntregarCount = bookings.filter(b => b.estado === 'En_edicion').length
  const agendadasCount = bookings.filter(b => b.estado === 'Agendada').length
  const entregadasCount = bookings.filter(b => b.estado === 'Entregada').length

  const filtered = bookings.filter(b => {
    const matchesEstado = filterEstado ? b.estado?.toLowerCase() === filterEstado.toLowerCase() : true
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch = !term || (
      (b.nombre_cliente || b.cliente_nombre || '').toLowerCase().includes(term) ||
      (b.nombre_servicio || b.servicio_nombre || '').toLowerCase().includes(term) ||
      (b.ubicacion || '').toLowerCase().includes(term)
    )
    return matchesEstado && matchesSearch
  })

  const getWhatsAppReminderUrl = (booking) => {
    if (!booking) return null
    const clientName = (booking?.nombre_cliente || booking?.cliente_nombre || 'Estimado/a').split(' ')[0]
    const dateStr = fmtDate(booking?.fecha_sesion)
    const timeStr = booking?.hora_sesion ? ` a las ${booking.hora_sesion}` : ''
    const serviceName = booking?.nombre_servicio || booking?.servicio_nombre || 'tu sesión'
    const msg = `¡Hola ${clientName}! ✨ Te saludamos desde Diogo Studio. Te enviamos este recordatorio de tu sesión fotográfica (${serviceName}) programada para el ${dateStr}${timeStr}. ¿Todo listo para tu experiencia en el atelier? 📸`
    return formatWhatsAppUrl(booking?.telefono_cliente || booking?.cliente_telefono, msg)
  }

  // Primer elemento activo si no hay seleccionado
  const activeFocusBooking = selected || (bookings.length > 0 ? bookings[0] : null)

  useEffect(() => {
    if (activeFocusBooking) {
      setNotesVal(activeFocusBooking.notas_internas || '')
      setEditingNotes(false)
    }
  }, [activeFocusBooking?.id_reserva, activeFocusBooking?.id])

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div className="bookings-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Top Header & Season Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
            Reservas
          </h1>
          <span style={{
            fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '3px 10px', borderRadius: 20, background: '#282a30',
            color: '#e8b072', fontWeight: 700
          }}>
            Atelier 2024
          </span>
        </div>

        <button 
          onClick={() => setShowModal(true)} 
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: '#e8b072', color: '#482900',
            border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 0 16px rgba(232,176,114,0.25)',
            transition: 'all 0.15s ease'
          }}
        >
          <Plus size={18} /> Nueva Reserva
        </button>
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

      {/* Metric Capsules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{
          background: '#191b22', borderRadius: 14, padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid #282f42', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>En producción</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>
              {activasCount} Activas
            </span>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#282a30',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8b072'
          }}>
            <Sparkles size={22} />
          </div>
        </div>

        <div style={{
          background: '#191b22', borderRadius: 14, padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid #282f42', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Listas para envío</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F5B955', marginTop: 2 }}>
              {porEntregarCount} Por entregar
            </span>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#282a30',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5B955'
          }}>
            <PackageCheck size={22} />
          </div>
        </div>
      </div>

      {/* Interactive Filter Chips & Search Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, background: '#191b22', padding: 10, borderRadius: 12
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar sesión o cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px', width: '100%', background: '#131B2A',
              border: '1px solid #282f42', color: '#F8FAFC', borderRadius: 8, fontSize: '0.85rem'
            }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
          <button
            onClick={() => setFilterEstado('')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: filterEstado === '' ? '#e8b072' : '#282a30',
              color: filterEstado === '' ? '#482900' : '#94A3B8',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Todos ({bookings.length})
          </button>
          <button
            onClick={() => setFilterEstado('Agendada')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: filterEstado === 'Agendada' ? '#e8b072' : '#282a30',
              color: filterEstado === 'Agendada' ? '#482900' : '#94A3B8',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Agendadas ({agendadasCount})
          </button>
          <button
            onClick={() => setFilterEstado('En_edicion')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: filterEstado === 'En_edicion' ? '#e8b072' : '#282a30',
              color: filterEstado === 'En_edicion' ? '#482900' : '#94A3B8',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            En Edición ({porEntregarCount})
          </button>
          <button
            onClick={() => setFilterEstado('Entregada')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: filterEstado === 'Entregada' ? '#e8b072' : '#282a30',
              color: filterEstado === 'Entregada' ? '#482900' : '#94A3B8',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Entregadas ({entregadasCount})
          </button>
        </div>
      </div>

      {/* Grid Principal Master-Detail 7/5 (Desktop & Responsive Mobile) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
        
        {/* PANEL IZQUIERDO: AGENDA CRONOLÓGICA (7 COLS) */}
        <div style={{ gridColumn: 'span 7' }} className="bookings-table-panel">
          <div style={{ background: '#191b22', borderRadius: 14, padding: 18, border: '1px solid #282f42', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} className="text-accent" />
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>Agenda Cronológica</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{filtered.length} registros</span>
            </div>

            {filtered.length === 0 ? (
              <div className="no-data" style={{ padding: 40, textAlign: 'center' }}>
                No se encontraron reservas con los filtros aplicados.
              </div>
            ) : (
              <>
                {/* Table for Desktop */}
                <div className="table-wrapper desktop-only">
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'rgba(40, 42, 48, 0.6)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '12px 14px' }}>Fecha</th>
                        <th style={{ padding: '12px 14px' }}>Cliente</th>
                        <th style={{ padding: '12px 14px' }}>Servicio</th>
                        <th style={{ padding: '12px 14px' }}>Estado</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Presupuesto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(b => {
                        const isSelected = activeFocusBooking && (activeFocusBooking.id_reserva || activeFocusBooking.id) === (b.id_reserva || b.id)
                        const clientName = b.nombre_cliente || b.cliente_nombre || 'Cliente'
                        const serviceName = b.nombre_servicio || b.servicio_nombre || 'Servicio'

                        return (
                          <tr
                            key={b.id_reserva || b.id}
                            onClick={() => { setSelected(b); setShowCancelForm(false) }}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(30, 31, 38, 0.8)' : undefined,
                              borderLeft: isSelected ? '3px solid #e8b072' : '3px solid transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{fmtDate(b.fecha_sesion)}</div>
                              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>#RES-{b.id_reserva || b.id}</span>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%', background: '#282a30',
                                  color: '#e8b072', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                                }}>
                                  {getInitials(clientName)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.88rem' }}>{clientName}</div>
                                  <div style={{ fontSize: '0.72rem', color: b.contrato_firmado ? '#4ade80' : '#f59e0b' }}>
                                    {b.contrato_firmado ? '✓ Contrato OK' : '⚠ Sin firmar'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                              {serviceName}
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <StatusBadge status={b.estado} />
                            </td>

                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#F5B955', fontSize: '0.9rem' }}>
                              {fmt(b.monto_bruto)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Session List Stream for Mobile */}
                <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map(b => {
                    const isSelected = activeFocusBooking && (activeFocusBooking.id_reserva || activeFocusBooking.id) === (b.id_reserva || b.id)
                    const clientName = b.nombre_cliente || b.cliente_nombre || 'Cliente'
                    const serviceName = b.nombre_servicio || b.servicio_nombre || 'Servicio'

                    return (
                      <div
                        key={b.id_reserva || b.id}
                        onClick={() => {
                          setSelected(b)
                          setShowCancelForm(false)
                          setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
                        }}
                        style={{
                          background: isSelected ? '#1e222e' : '#161922',
                          border: isSelected ? '1px solid #e8b072' : '1px solid #282f42',
                          borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10, background: '#282a30',
                            color: '#e8b072', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
                          }}>
                            {getInitials(clientName)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {clientName}
                              </span>
                              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: '#282a30', color: '#e8b072' }}>
                                {b.estado || 'Agendada'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {fmtDate(b.fecha_sesion)} • {serviceName}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
                          <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.92rem', display: 'block' }}>
                            {fmt(b.monto_bruto)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#C78D4D' }}>
                            #RES-{b.id_reserva || b.id}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Studio Utilities & Sync Footer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={exportCSV}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, background: '#131B2A',
                  border: '1px solid #282f42', color: '#F8FAFC', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={16} className="text-muted" />
                  <span>Exportar Sesiones (CSV)</span>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
            </div>

          </div>
        </div>

        {/* PANEL DERECHO: DETALLE DE SESIÓN & FOCUS CARD (5 COLS) */}
        <div style={{ gridColumn: 'span 5' }} className="bookings-detail-panel" ref={detailRef}>
          {activeFocusBooking ? (
            <div style={{
              background: '#191b22', borderRadius: 16, overflow: 'hidden',
              border: '1px solid rgba(232, 176, 114, 0.25)', boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
              position: 'sticky', top: 20
            }}>
              
              {/* Card Visual Ribbon / Ambient Banner */}
              <div style={{
                position: 'relative', padding: 18,
                background: 'linear-gradient(135deg, #1f2536 0%, #151821 100%)',
                borderBottom: '1px solid #282f42'
              }}>
                <div style={{
                  position: 'absolute', right: -20, top: -20, width: 100, height: 100,
                  background: 'radial-gradient(circle, rgba(232, 184, 109, 0.15) 0%, transparent 70%)',
                  borderRadius: '50%'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 20, background: 'rgba(11, 13, 19, 0.8)',
                    backdropFilter: 'blur(6px)', fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5B955', boxShadow: '0 0 6px #F5B955' }} />
                    <span>PRÓXIMA SESIÓN • #RES-{activeFocusBooking.id_reserva || activeFocusBooking.id}</span>
                  </div>

                  {/* Inline Status Selector */}
                  <select
                    value={activeFocusBooking.estado || 'Agendada'}
                    onChange={e => updateEstado(activeFocusBooking.id_reserva || activeFocusBooking.id, e.target.value)}
                    disabled={actionLoading}
                    style={{
                      background: 'rgba(11, 13, 19, 0.85)', color: '#e8b072',
                      border: '1px solid rgba(232, 176, 114, 0.3)', borderRadius: 20,
                      padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer', outline: 'none'
                    }}
                  >
                    {ESTADOS.filter(e => e.id).map(e => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#e8b072', fontWeight: 600 }}>
                      {activeFocusBooking.nombre_servicio || activeFocusBooking.servicio_nombre || 'Sesión Fotográfica'}
                    </span>
                    <h2 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {activeFocusBooking.nombre_cliente || activeFocusBooking.cliente_nombre}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>Presupuesto</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F5B955' }}>
                      {fmt(activeFocusBooking.monto_bruto)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shoot Details Body */}
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Bento Grid: Fecha, Hora y Ubicación */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#1e1f26', padding: 12, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: '0.85rem' }}>
                      <Calendar size={16} style={{ color: '#e8b072' }} />
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{fmtDate(activeFocusBooking.fecha_sesion)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8b072', fontSize: '0.85rem', background: '#282a30', padding: '2px 8px', borderRadius: 6 }}>
                      <Clock size={14} />
                      <span style={{ fontWeight: 700 }}>{activeFocusBooking.hora_sesion || '10:00'} hs</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: '0.82rem' }}>
                    <MapPin size={15} style={{ color: '#e8b072' }} />
                    <span>{activeFocusBooking.ubicacion || 'Estúdio Central Diogo'}</span>
                  </div>
                </div>

                {/* Consentimiento Redes Sociales / Instagram */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10, background: '#131B2A',
                  border: activeFocusBooking.autoriza_redes_sociales ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(245, 185, 85, 0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} style={{ color: activeFocusBooking.autoriza_redes_sociales ? '#4ade80' : '#F5B955', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F8FAFC' }}>Difusión en Redes / Portfolio</span>
                      <span style={{ fontSize: '0.72rem', color: activeFocusBooking.autoriza_redes_sociales ? '#4ade80' : '#F5B955' }}>
                        {activeFocusBooking.autoriza_redes_sociales ? '✓ Autoriza fotos en Instagram/Web' : '🔒 Confidencial (No publicar)'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => updateBookingField(activeFocusBooking.id_reserva || activeFocusBooking.id, { autoriza_redes_sociales: !activeFocusBooking.autoriza_redes_sociales })}
                    disabled={actionLoading}
                    style={{
                      padding: '4px 10px', borderRadius: 6, background: '#282a30',
                      border: 'none', color: '#e8b072', fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {activeFocusBooking.autoriza_redes_sociales ? 'Hacer Privado' : 'Autorizar'}
                  </button>
                </div>

                {/* Estilo y Preferencias del Cliente (si existen en su perfil) */}
                {activeFocusBooking.cliente_notas_estilo && (
                  <div style={{
                    background: 'rgba(232, 176, 114, 0.08)', border: '1px solid rgba(232, 176, 114, 0.2)',
                    borderRadius: 10, padding: '10px 14px'
                  }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#e8b072', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                      Estilo & Notas del Cliente
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                      {activeFocusBooking.cliente_notas_estilo}
                    </span>
                  </div>
                )}

                {/* Contract Alert Banner */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10, background: '#131B2A',
                  border: activeFocusBooking.contrato_firmado ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(232, 176, 114, 0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileSignature size={18} style={{ color: activeFocusBooking.contrato_firmado ? '#4ade80' : '#C78D4D', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F8FAFC' }}>Contrato Legal Atelier</span>
                      <span style={{ fontSize: '0.72rem', color: activeFocusBooking.contrato_firmado ? '#4ade80' : '#C78D4D' }}>
                        {activeFocusBooking.contrato_firmado ? 'Firmado digitalmente' : 'Pendiente de firma digital'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => updateContrato(activeFocusBooking.id_reserva || activeFocusBooking.id, !activeFocusBooking.contrato_firmado)}
                    disabled={actionLoading}
                    style={{
                      padding: '4px 10px', borderRadius: 6, background: '#282a30',
                      border: 'none', color: '#e8b072', fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {activeFocusBooking.contrato_firmado ? 'Desmarcar' : 'Marcar Firmado'}
                  </button>
                </div>

                {/* Notas Internas de Producción */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#1e1f26', padding: 12, borderRadius: 10, border: '1px solid #282f42' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', fontWeight: 600 }}>
                      Notas Internas del Rodaje
                    </span>
                    {editingNotes ? (
                      <button
                        onClick={handleSaveNotes}
                        disabled={actionLoading}
                        style={{ background: '#e8b072', color: '#482900', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Guardar
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingNotes(true)}
                        style={{ background: 'none', border: 'none', color: '#e8b072', fontSize: '0.72rem', cursor: 'pointer' }}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <textarea
                      rows={2}
                      value={notesVal}
                      onChange={e => setNotesVal(e.target.value)}
                      placeholder="Vestuario, atrezzo, iluminación específica..."
                      style={{ background: '#0c0e14', border: '1px solid #282f42', color: '#F8FAFC', borderRadius: 6, padding: 8, fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: activeFocusBooking.notas_internas ? '#cbd5e1' : '#64748B', fontStyle: activeFocusBooking.notas_internas ? 'normal' : 'italic' }}>
                      {activeFocusBooking.notas_internas || 'Sin notas internas registradas.'}
                    </p>
                  )}
                </div>

                {/* Motivo de Cancelación si aplica */}
                {activeFocusBooking.estado === 'Cancelada' && activeFocusBooking.razon_cancelacion && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: '0.8rem'
                  }}>
                    <strong style={{ display: 'block', color: '#ef4444', marginBottom: 2 }}>Motivo de Cancelación:</strong>
                    {activeFocusBooking.razon_cancelacion}
                  </div>
                )}

                {/* Pipeline Status Flow */}
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                  {PIPELINE_STEPS.map((step) => {
                    const isActive = activeFocusBooking.estado?.toLowerCase() === step.id.toLowerCase()
                    return (
                      <button
                        key={step.id}
                        disabled={actionLoading}
                        onClick={() => updateEstado(activeFocusBooking.id_reserva || activeFocusBooking.id, step.id)}
                        style={{
                          flex: 1, minWidth: 55, padding: '6px 4px', fontSize: '0.72rem',
                          borderRadius: 6, border: 'none',
                          background: isActive ? '#e8b072' : '#1e1f26',
                          color: isActive ? '#482900' : '#94A3B8',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        {step.label}
                      </button>
                    )
                  })}
                </div>

                {/* Quick Operational Actions Grid (3 Cols) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 4 }}>
                  {getWhatsAppReminderUrl(activeFocusBooking) ? (
                    <a
                      href={getWhatsAppReminderUrl(activeFocusBooking)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26',
                        textDecoration: 'none', color: '#94A3B8', transition: 'all 0.15s ease'
                      }}
                    >
                      <MessageCircle size={18} style={{ color: '#25D366' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>WhatsApp</span>
                    </a>
                  ) : (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26', color: '#64748B', opacity: 0.6
                    }}>
                      <MessageCircle size={18} />
                      <span style={{ fontSize: '0.75rem' }}>WhatsApp</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      alert(`Hoja de Ruta #RES-${activeFocusBooking.id_reserva || activeFocusBooking.id}\nCliente: ${activeFocusBooking.nombre_cliente || activeFocusBooking.cliente_nombre}\nFecha: ${fmtDate(activeFocusBooking.fecha_sesion)}\nLocación: ${activeFocusBooking.ubicacion || 'Estudio Central'}`)
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26',
                      border: 'none', color: '#94A3B8', cursor: 'pointer'
                    }}
                  >
                    <FileText size={18} style={{ color: '#e8b072' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Hoja de Ruta</span>
                  </button>

                  {activeFocusBooking.url_galeria ? (
                    <a
                      href={activeFocusBooking.url_galeria}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26',
                        textDecoration: 'none', color: '#94A3B8'
                      }}
                    >
                      <ImageIcon size={18} style={{ color: '#e8b072' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Ver Galería</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        const url = prompt('Ingrese URL de la galería fotográfica:')
                        if (url) {
                          fetch(`/api/bookings/${activeFocusBooking.id_reserva || activeFocusBooking.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url_galeria: url })
                          }).then(() => refetchBookings())
                        }
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26',
                        border: 'none', color: '#94A3B8', cursor: 'pointer'
                      }}
                    >
                      <ImageIcon size={18} style={{ color: '#64748B' }} />
                      <span style={{ fontSize: '0.75rem' }}>+ Galería</span>
                    </button>
                  )}
                </div>

                {/* Cancelar Reserva option */}
                {!showCancelForm ? (
                  <div style={{ textAlign: 'center', marginTop: 4 }}>
                    <button
                      onClick={() => setShowCancelForm(true)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Cancelar esta reserva
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#1c202d', padding: 10, borderRadius: 8, border: '1px solid #3b4257' }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.75rem', color: '#cbd5e1' }}>Motivo:</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Ej. Reprogramación..."
                      style={{ fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        className="btn-danger btn-sm"
                        disabled={!cancelReason || actionLoading}
                        onClick={() => {
                          updateEstado(activeFocusBooking.id_reserva || activeFocusBooking.id, 'Cancelada', { motivo_cancelacion: cancelReason })
                          setShowCancelForm(false)
                        }}
                      >
                        Confirmar
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setShowCancelForm(false)}>Atrás</button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div style={{ background: '#191b22', borderRadius: 14, padding: 40, textAlign: 'center', border: '1px solid #282f42' }}>
              <Calendar size={36} className="text-muted" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, color: '#F8FAFC' }}>Ninguna sesión seleccionada</div>
              <div style={{ color: '#64748B', fontSize: '0.82rem', marginTop: 4 }}>
                Selecciona una reserva para ver sus detalles.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Nueva Reserva */}
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
              {/* Client Toggle: Existente vs Rápido */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: '#131B2A', padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setNewBooking({ ...newBooking, isFastNewClient: false })}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600,
                    background: !newBooking.isFastNewClient ? '#282a30' : 'transparent',
                    color: !newBooking.isFastNewClient ? '#F5B955' : '#94A3B8'
                  }}
                >
                  <Users size={14} style={{ display: 'inline', marginRight: 5 }} /> Cliente Existente
                </button>
                <button
                  type="button"
                  onClick={() => setNewBooking({ ...newBooking, isFastNewClient: true })}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600,
                    background: newBooking.isFastNewClient ? '#282a30' : 'transparent',
                    color: newBooking.isFastNewClient ? '#F5B955' : '#94A3B8'
                  }}
                >
                  <UserPlus size={14} style={{ display: 'inline', marginRight: 5 }} /> + Alta Rápida de Cliente
                </button>
              </div>

              {!newBooking.isFastNewClient ? (
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
                        {c.nombre} {c.telefono ? `(${c.telefono})` : ''} {c.descuento_sugerido_pct ? `— [VIP ${c.descuento_sugerido_pct}%]` : ''}
                      </option>
                    ))}
                  </select>

                  {/* VIP Benefit Callout if client has discount */}
                  {(() => {
                    const selClient = clients.find(c => String(c.id_cliente || c.id) === String(newBooking.id_cliente))
                    const discount = selClient?.descuento_sugerido_pct || 0
                    if (discount > 0) {
                      const selService = services.find(s => String(s.id_servicio || s.id) === String(newBooking.id_servicio))
                      const basePrice = selService ? parseFloat(selService.precio_base) : null
                      const finalPrice = basePrice ? basePrice * (1 - discount / 100) : null
                      return (
                        <div style={{
                          marginTop: 8, padding: '8px 12px', borderRadius: 8,
                          background: 'rgba(245, 185, 85, 0.1)', border: '1px solid rgba(245, 185, 85, 0.25)',
                          fontSize: '0.78rem', color: '#F5B955'
                        }}>
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Sparkles size={14} /> Beneficio Fidelidad VIP ({discount}% Descuento)
                          </div>
                          <div style={{ color: '#cbd5e1', marginTop: 2 }}>
                            {selService 
                              ? `Tarifa Original: ${fmt(basePrice)} → Final con VIP: ${fmt(finalPrice)}`
                              : 'El descuento del ' + discount + '% se aplicará automáticamente al total.'}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#191b22', padding: 12, borderRadius: 8, border: '1px solid #282f42', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e8b072', textTransform: 'uppercase' }}>
                    Alta Rápida de Cliente
                  </span>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Nombre Completo *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Sofia Loren"
                      value={newBooking.fastNombre}
                      onChange={e => setNewBooking({ ...newBooking, fastNombre: e.target.value })}
                    />
                  </div>
                  <div className="form-row" style={{ margin: 0 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Teléfono (WhatsApp)</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="912345678"
                        value={newBooking.fastTelefono}
                        onChange={e => setNewBooking({ ...newBooking, fastTelefono: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Email (Opcional)</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="cliente@email.com"
                        value={newBooking.fastEmail}
                        onChange={e => setNewBooking({ ...newBooking, fastEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Servicio Fotográfico *</label>
                <select 
                  className="form-input" 
                  value={newBooking.id_servicio} 
                  onChange={e => setNewBooking({...newBooking, id_servicio: e.target.value})}
                >
                  <option value="">Seleccione un servicio...</option>
                  {services.filter(s => s.activo !== 0).map(s => (
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
                  <label className="form-label">Hora de Sesión</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={newBooking.hora_sesion} 
                    onChange={e => setNewBooking({...newBooking, hora_sesion: e.target.value})} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Locación (opcional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newBooking.ubicacion} 
                  onChange={e => setNewBooking({...newBooking, ubicacion: e.target.value})} 
                  placeholder="Estúdio Central, Lisboa, Sintra, Cascais..." 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notas Internas de Rodaje (Opcional)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={newBooking.notas_internas}
                  onChange={e => setNewBooking({ ...newBooking, notas_internas: e.target.value })}
                  placeholder="Detalles de estilismo, vestuario, ideas..."
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={newBooking.contrato_firmado}
                    onChange={e => setNewBooking({...newBooking, contrato_firmado: e.target.checked})}
                    style={{ width: 16, height: 16, accentColor: '#e8b072' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>Marcar contrato como firmado digitalmente</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button 
                className="btn-primary" 
                disabled={creating || (!newBooking.isFastNewClient && !newBooking.id_cliente) || (newBooking.isFastNewClient && !newBooking.fastNombre.trim()) || !newBooking.id_servicio || !newBooking.fecha_sesion} 
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
