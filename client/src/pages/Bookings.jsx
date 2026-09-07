import { useState, useEffect } from 'react'
import { Calendar, Users, Camera, Edit, MapPin, CheckCircle, Clock, Save, XCircle, ChevronRight, FileText, FileSignature, CheckSquare, MessageCircle, AlertTriangle } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v ?? 0)
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX') : '—'

const ESTADOS = ['', 'Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion', 'Entregada', 'Cancelada']

const EMPTY_BOOKING = {
  id_cliente: '', id_servicio: '', fecha_sesion: '', ubicacion: '',
  contrato_firmado: false, notas_internas: ''
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterEstado, setFilterEstado] = useState('')
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
      setBookings(Array.isArray(bd) ? bd : bd.bookings || [])
      setClients(Array.isArray(cd) ? cd : cd.clients || [])
      setServices(Array.isArray(sd) ? sd : sd.services || [])
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false))
  }, [])

  const refetchBookings = async () => {
    const res = await fetch('/api/bookings')
    const data = await res.json()
    const arr = Array.isArray(data) ? data : data.bookings || []
    setBookings(arr)
    if (selected) {
      const updated = arr.find(b => b.id_reserva === selected.id_reserva)
      if (updated) setSelected(updated)
    }
  }

  const updateEstado = async (id, estado, extra = {}) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, ...extra }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || err.message || 'Error al actualizar')
      }
      await refetchBookings()
      setSuccessMsg(`Estado actualizado a: ${estado}`)
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
      await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrato_firmado: val }),
      })
      await refetchBookings()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      })
      if (!res.ok) throw new Error('Error al crear reserva')
      await refetchBookings()
      setNewBooking(EMPTY_BOOKING)
      setShowModal(false)
      setSuccessMsg('Reserva creada correctamente')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const filtered = filterEstado
    ? bookings.filter(b => b.estado?.toLowerCase() === filterEstado.toLowerCase())
    : bookings

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  const renderStatusFlow = (b) => {
    const estado = b.estado?.toLowerCase()
    return (
      <div className="status-flow" style={{ marginTop: '16px' }}>
        {estado === 'agendada' && (
          <>
            <div className="checkbox-group" style={{marginBottom:12}}>
              <input
                type="checkbox"
                id="contrato"
                checked={!!b.contrato_firmado}
                onChange={e => updateContrato(b.id_reserva, e.target.checked)}
              />
              <label htmlFor="contrato" style={{display:'flex', alignItems:'center', gap:4}}>
                <FileSignature size={16}/> Contrato Firmado
              </label>
            </div>
            <div className="status-flow-actions">
              <button
                className="btn-success btn-sm"
                disabled={!b.contrato_firmado || actionLoading}
                onClick={() => updateEstado(b.id_reserva, 'Realizada')}
                title={!b.contrato_firmado ? 'Firma el contrato primero' : ''}
                style={{display:'flex', alignItems:'center', gap:4}}
              >
                <CheckCircle size={16}/> Marcar como Realizada
              </button>
            </div>
            {!b.contrato_firmado && <div className="text-muted" style={{fontSize:'0.8rem', display:'flex', alignItems:'center', gap:4, marginTop:4}}><AlertTriangle size={12}/> Requiere contrato para avanzar</div>}
          </>
        )}
        {estado === 'realizada' && (
          <div className="status-flow-actions">
            <button className="btn-secondary btn-sm" disabled={actionLoading} onClick={() => updateEstado(b.id_reserva, 'Seleccion_pendiente')} style={{display:'flex', alignItems:'center', gap:4}}><Clock size={16}/> Selección Pendiente</button>
            <button className="btn-secondary btn-sm" disabled={actionLoading} onClick={() => updateEstado(b.id_reserva, 'En_edicion')} style={{display:'flex', alignItems:'center', gap:4}}><Edit size={16}/> En Edición</button>
          </div>
        )}
        {estado === 'seleccion_pendiente' && (
          <div className="status-flow-actions">
            <button className="btn-secondary btn-sm" disabled={actionLoading} onClick={() => updateEstado(b.id_reserva, 'En_edicion')} style={{display:'flex', alignItems:'center', gap:4}}><Edit size={16}/> Pasar a Edición</button>
          </div>
        )}
        {estado === 'en_edicion' && (
          <div className="status-flow-actions">
            <button className="btn-success btn-sm" disabled={actionLoading} onClick={() => updateEstado(b.id_reserva, 'Entregada')} style={{display:'flex', alignItems:'center', gap:4}}><CheckSquare size={16}/> Finalizar y Entregar</button>
          </div>
        )}
        {estado === 'entregada' && (
          <div className="text-success" style={{ fontWeight: 'bold', display:'flex', alignItems:'center', gap:4 }}>
            <CheckCircle size={16}/> Trabajo Completado
          </div>
        )}
        {estado === 'cancelada' && (
          <div className="text-danger" style={{ fontWeight: 'bold', display:'flex', alignItems:'center', gap:4 }}>
            <XCircle size={16}/> Cancelada: {b.motivo_cancelacion || 'Sin motivo especificado'}
          </div>
        )}

        {!['entregada', 'cancelada'].includes(estado) && !showCancelForm && (
          <div style={{ marginTop: '16px' }}>
            <button className="btn-danger btn-sm" style={{display:'flex', alignItems:'center', gap:4}} onClick={() => setShowCancelForm(true)}>
              <XCircle size={16}/> Cancelar Reserva
            </button>
          </div>
        )}
        {showCancelForm && (
          <div style={{ marginTop: '16px', background: 'var(--bg-main)', padding: '12px', borderRadius: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Motivo de cancelación:</label>
            <textarea
              className="form-textarea"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Ej: Cliente no se presentó..."
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                className="btn-danger btn-sm"
                disabled={!cancelReason || actionLoading}
                onClick={() => {
                  updateEstado(b.id_reserva, 'Cancelada', { motivo_cancelacion: cancelReason })
                  setShowCancelForm(false)
                }}
              >
                Confirmar Cancelación
              </button>
              <button className="btn-secondary btn-sm" onClick={() => setShowCancelForm(false)}>Atrás</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{display:'flex', alignItems:'center', gap:8}}>
            <Calendar size={24} className="text-accent"/> Reservas
          </div>
          <div className="page-subtitle">Gestiona tu agenda de sesiones fotográficas</div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Nueva Reserva</button>
      </div>

      {error && <div className="alert-danger-card">{error}</div>}
      {successMsg && <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'var(--success)'}}>{successMsg}</div>}

      <div className="dashboard-grid">
        <div className="dashboard-left" style={{ flex: '2' }}>
          <div className="card">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{display:'flex', alignItems:'center', gap:8}}><Calendar size={18} className="text-accent"/> Agenda</span>
              <select className="form-input" style={{ width: 'auto' }} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                {ESTADOS.filter(Boolean).map(e => (
                  <option key={e} value={e}>{e.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            
            {filtered.length === 0 ? (
              <div className="no-data">No hay reservas {filterEstado ? `en estado ${filterEstado}` : 'registradas'}</div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Servicio</th>
                      <th>Estado</th>
                      <th style={{textAlign:'right'}}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(b => (
                      <tr 
                        key={b.id_reserva} 
                        className={selected?.id_reserva === b.id_reserva ? 'selected-row' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setSelected(b); setShowCancelForm(false) }}
                      >
                        <td>{fmtDate(b.fecha_sesion)}</td>
                        <td style={{fontWeight:500}}>{b.nombre_cliente}</td>
                        <td className="text-muted">{b.nombre_servicio}</td>
                        <td><StatusBadge status={b.estado} /></td>
                        <td style={{textAlign:'right'}}>
                          <ChevronRight size={18} className="text-muted" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-right" style={{ flex: '1' }}>
          {selected ? (
            <div className="card sticky" style={{ top: '24px' }}>
              <div className="card-title" style={{display:'flex', alignItems:'center', gap:8}}><FileText size={18} className="text-accent"/> Detalle de Reserva</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>Cliente</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{selected.nombre_cliente}</div>
                  {/* Whatsapp link si se tuviera en el listado, pero si no está en el endpoint bookings, no podemos. Asumamos que tenemos id_cliente */}
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>Servicio</div>
                  <div>{selected.nombre_servicio} <span className="text-accent" style={{fontWeight:700}}>({fmt(selected.monto_bruto)})</span></div>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Fecha</div>
                    <div style={{display:'flex', alignItems:'center', gap:4}}><Calendar size={14}/> {fmtDate(selected.fecha_sesion)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Ubicación</div>
                    <div style={{display:'flex', alignItems:'center', gap:4}}><MapPin size={14}/> {selected.ubicacion || '—'}</div>
                  </div>
                </div>
                
                <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>Flujo de Trabajo</div>
                  <StatusBadge status={selected.estado} />
                  {renderStatusFlow(selected)}
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="widget-empty">Selecciona una reserva para ver sus detalles y cambiar su estado</div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nueva Reserva</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <select className="form-input" value={newBooking.id_cliente} onChange={e => setNewBooking({...newBooking, id_cliente: e.target.value})}>
                  <option value="">Seleccione un cliente...</option>
                  {clients.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Servicio</label>
                <select className="form-input" value={newBooking.id_servicio} onChange={e => setNewBooking({...newBooking, id_servicio: e.target.value})}>
                  <option value="">Seleccione un servicio...</option>
                  {services.filter(s => s.activo).map(s => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre} ({fmt(s.precio_base)})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha de Sesión</label>
                  <input type="date" className="form-input" value={newBooking.fecha_sesion} onChange={e => setNewBooking({...newBooking, fecha_sesion: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ubicación (opcional)</label>
                  <input type="text" className="form-input" value={newBooking.ubicacion} onChange={e => setNewBooking({...newBooking, ubicacion: e.target.value})} placeholder="Estudio, Exterior..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={creating || !newBooking.id_cliente || !newBooking.id_servicio || !newBooking.fecha_sesion} onClick={handleCreate}>
                {creating ? 'Guardando...' : 'Crear Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
