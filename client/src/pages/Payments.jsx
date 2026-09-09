import { useState, useEffect, useRef } from 'react'
import { 
  Euro, Save, XCircle, CreditCard, ChevronRight, Download, Plus, 
  TrendingUp, Clock, Receipt, CheckCircle, Hourglass, 
  Search, Send, FileText, ShieldCheck, Camera, Image as ImageIcon,
  Wallet, Layers, ArrowUpRight, DollarSign
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0)
const fmtDate = d => {
  if (!d) return '—'
  const dateObj = new Date(d.includes('T') ? d : d + 'T00:00:00')
  return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'DS'
}

export default function Payments() {
  const [bookings, setBookings] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Filters and search
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'Pendiente', 'Completado', 'Parcial'
  const [searchTerm, setSearchTerm] = useState('')

  // Modal registrar abono
  const [showAbonoModal, setShowAbonoModal] = useState(false)
  const [abonoAmount, setAbonoAmount] = useState('')
  const [abonoMethod, setAbonoMethod] = useState('Transferencia Bancaria Inmediata')
  const [abonoNotes, setAbonoNotes] = useState('')

  const editRef = useRef(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings')
      if (!res.ok) throw new Error('Error al cargar transacciones y pagos')
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.bookings || []
      setBookings(list)
      if (list.length > 0 && !selected) {
        setSelected(list[0])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectRow = (b) => {
    setSelected(b)
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // Cálculos agregados
  const totalMontoBruto = bookings.reduce((acc, b) => acc + (parseFloat(b.monto_bruto) || 0), 0)
  const totalRecaudado = bookings.reduce((acc, b) => acc + (parseFloat(b.anticipo_pagado || b.anticipo || 0)), 0)
  const totalPorCobrar = bookings.reduce((acc, b) => {
    const bruto = parseFloat(b.monto_bruto) || 0
    const desc = parseFloat(b.descuento_aplicado || b.descuento) || 0
    const anti = parseFloat(b.anticipo_pagado || b.anticipo) || 0
    const saldo = Math.max(0, bruto - desc - anti)
    return acc + saldo
  }, 0)
  const completadasCount = bookings.filter(b => (b.estado_pago || '').toLowerCase() === 'completado' || (b.estado_pago || '').toLowerCase() === 'pagado').length
  const pendientesCount = bookings.filter(b => {
    const st = (b.estado_pago || '').toLowerCase()
    return st === 'pendiente' || st === 'parcial'
  }).length

  // Filtrado
  const filteredBookings = bookings.filter(b => {
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch = !term || (
      (b.nombre_cliente || b.cliente_nombre || '').toLowerCase().includes(term) ||
      (b.nombre_servicio || b.servicio_nombre || '').toLowerCase().includes(term) ||
      (b.telefono_cliente || b.cliente_telefono || '').toLowerCase().includes(term)
    )

    const st = b.estado_pago || 'Pendiente'
    let matchesStatus = true
    if (filterStatus === 'Pendiente') matchesStatus = st === 'Pendiente'
    else if (filterStatus === 'Completado') matchesStatus = st === 'Completado' || st === 'Pagado'
    else if (filterStatus === 'Parcial') matchesStatus = st === 'Parcial'

    return matchesSearch && matchesStatus
  })

  // Manejador para registrar abono
  const handleAbonoSubmit = async () => {
    if (!selected || !abonoAmount) return
    const amountVal = parseFloat(abonoAmount)
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Por favor ingrese un monto válido mayor a 0.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const bId = selected.id_reserva || selected.id
      const currentAnticipo = parseFloat(selected.anticipo_pagado || selected.anticipo || 0)
      const nuevoAnticipo = currentAnticipo + amountVal
      const montoBruto = parseFloat(selected.monto_bruto || 0)
      const desc = parseFloat(selected.descuento_aplicado || selected.descuento || 0)
      const nuevoSaldo = Math.max(0, montoBruto - desc - nuevoAnticipo)

      let nuevoEstado = 'Pendiente'
      if (nuevoSaldo <= 0) nuevoEstado = 'Completado'
      else if (nuevoAnticipo > 0) nuevoEstado = 'Parcial'

      const paymentId = selected.payment_id
      let res
      if (paymentId) {
        res = await fetch(`/api/payments/${paymentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anticipo_pagado: nuevoAnticipo,
            estado_pago: nuevoEstado,
            fecha_ultimo_pago: new Date().toISOString().split('T')[0]
          })
        })
      } else {
        res = await fetch('/api/payments/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: bId,
            monto_bruto: montoBruto,
            descuento_aplicado: desc,
            anticipo_pagado: nuevoAnticipo,
            estado_pago: nuevoEstado,
            fecha_ultimo_pago: new Date().toISOString().split('T')[0]
          })
        })
      }

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Error al registrar abono')
      }

      await fetchBookings()
      setShowAbonoModal(false)
      setAbonoAmount('')
      setSuccessMsg(`Abono de ${fmt(amountVal)} registrado con éxito para ${selected.nombre_cliente || selected.cliente_nombre}`)
      setTimeout(() => setSuccessMsg(null), 3500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const exportCSV = () => {
    if (bookings.length === 0) return
    const headers = ['Ref Liquidacion', 'Cliente', 'WhatsApp', 'Servicio', 'Fecha Sesion', 'Total Presupuestado', 'Anticipo Recibido', 'Saldo Exigible', 'Estado']
    const rows = bookings.map(b => {
      const bruto = parseFloat(b.monto_bruto) || 0
      const desc = parseFloat(b.descuento_aplicado || b.descuento) || 0
      const anti = parseFloat(b.anticipo_pagado || b.anticipo) || 0
      const saldo = Math.max(0, bruto - desc - anti)
      return [
        `"#LQD-${b.id_reserva || b.id}"`,
        `"${b.nombre_cliente || b.cliente_nombre || ''}"`,
        `"${b.telefono_cliente || b.cliente_telefono || ''}"`,
        `"${b.nombre_servicio || b.servicio_nombre || ''}"`,
        b.fecha_sesion || '',
        bruto,
        anti,
        saldo,
        b.estado_pago || 'Pendiente'
      ]
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `finanzas_diogo_atelier_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getWhatsAppReminderUrl = (b) => {
    if (!b) return null
    const phone = (b.telefono_cliente || b.cliente_telefono || '').replace(/\D/g, '')
    const clientName = (b.nombre_cliente || b.cliente_nombre || 'Estimado/a').split(' ')[0]
    const bruto = parseFloat(b.monto_bruto) || 0
    const desc = parseFloat(b.descuento_aplicado || b.descuento) || 0
    const anti = parseFloat(b.anticipo_pagado || b.anticipo) || 0
    const saldo = Math.max(0, bruto - desc - anti)
    const msg = encodeURIComponent(`¡Hola ${clientName}! ✨ Te saludamos desde Diogo Studio. Te enviamos este recordatorio amistoso sobre el balance pendiente de ${fmt(saldo)} para tu próxima sesión (${b.nombre_servicio || b.servicio_nombre}). ¿Deseas que te enviemos el enlace de pago seguro? 💳`)
    return phone ? `https://wa.me/${phone}?text=${msg}` : null
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  const activeBooking = selected || (bookings.length > 0 ? bookings[0] : null)
  const activeBruto = parseFloat(activeBooking?.monto_bruto || 0)
  const activeDesc = parseFloat(activeBooking?.descuento_aplicado || activeBooking?.descuento || 0)
  const activeAnticipo = parseFloat(activeBooking?.anticipo_pagado || activeBooking?.anticipo || 0)
  const activeSaldo = Math.max(0, activeBruto - activeDesc - activeAnticipo)
  const activeStatus = activeBooking?.estado_pago || (activeSaldo <= 0 ? 'Completado' : activeAnticipo > 0 ? 'Parcial' : 'Pendiente')

  return (
    <div className="finances-page" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Page Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CreditCard size={28} className="text-accent" />
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
              Finanzas & Liquidaciones
            </h1>
          </div>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.88rem' }}>
            Control de flujos, anticipos recibidos y balances por sesión de alta gama.
          </p>
        </div>

        {/* Action Utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', background: '#282a30', color: '#F8FAFC',
              border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'all 0.15s ease'
            }}
          >
            <Download size={16} style={{ color: '#C78D4D' }} /> Exportar Libro CSV
          </button>
          <button
            onClick={() => setShowAbonoModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#e8b072', color: '#482900',
              border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 0 24px rgba(232,176,114,0.25)', transition: 'all 0.15s ease'
            }}
          >
            <Plus size={18} /> Registrar Abono / Factura
          </button>
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

      {/* Financial Summary KPI Bar (3 Cards Haute Atelier) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        
        {/* Total Recaudado */}
        <div style={{
          background: '#191b22', borderRadius: 14, padding: 20, position: 'relative',
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #282f42'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', fontWeight: 600 }}>
              Total Recaudado
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#282a30',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5B955'
            }}>
              <Wallet size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              {fmt(totalRecaudado)}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#C78D4D', fontWeight: 600 }}>EUR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#4ade80' }}>
            <TrendingUp size={14} />
            <span>{completadasCount} liquidaciones completadas</span>
          </div>
        </div>

        {/* Saldo por Cobrar */}
        <div style={{
          background: '#191b22', borderRadius: 14, padding: 20, position: 'relative',
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #282f42'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ffb4ab', fontWeight: 600 }}>
              Saldo por Cobrar
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'rgba(147, 0, 10, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb4ab'
            }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffb4ab', letterSpacing: '-0.02em' }}>
              {fmt(totalPorCobrar)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 180, 171, 0.8)', fontWeight: 600 }}>EUR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#94A3B8' }}>
            <span>{pendientesCount} sesiones con saldo pendiente</span>
          </div>
        </div>

        {/* Registros Operativos */}
        <div style={{
          background: '#191b22', borderRadius: 14, padding: 20, position: 'relative',
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #282f42'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', fontWeight: 600 }}>
              Registros Operativos
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#282a30',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adddff'
            }}>
              <Receipt size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              {bookings.length}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>sesiones activas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#94A3B8' }}>
            <CheckCircle size={14} style={{ color: '#adddff' }} />
            <span>Total presupuestado: {fmt(totalMontoBruto)}</span>
          </div>
        </div>

      </div>

      {/* Master / Detail Workstation (7/5 Desktop Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, alignItems: 'start' }}>
        
        {/* Master Panel: Tabla de Pagos (7 cols) */}
        <div style={{ gridColumn: 'span 7' }} className="bookings-table-panel">
          <div style={{ background: '#191b22', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #282f42' }}>
            
            {/* Table Header Controls */}
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} style={{ color: '#C78D4D' }} />
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>Todos los Pagos</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 20, background: '#1e1f26',
                  color: '#F5B955', fontSize: '0.72rem', fontWeight: 600
                }}>
                  {bookings.length} totales
                </span>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0c0e14', padding: 4, borderRadius: 8 }}>
                <button
                  onClick={() => setFilterStatus('all')}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: filterStatus === 'all' ? '#282a30' : 'transparent',
                    color: filterStatus === 'all' ? '#F5B955' : '#64748B'
                  }}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterStatus('Pendiente')}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: filterStatus === 'Pendiente' ? '#282a30' : 'transparent',
                    color: filterStatus === 'Pendiente' ? '#F5B955' : '#64748B'
                  }}
                >
                  Pendiente
                </button>
                <button
                  onClick={() => setFilterStatus('Completado')}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: filterStatus === 'Completado' ? '#282a30' : 'transparent',
                    color: filterStatus === 'Completado' ? '#F5B955' : '#64748B'
                  }}
                >
                  Completado
                </button>
                <button
                  onClick={() => setFilterStatus('Parcial')}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: filterStatus === 'Parcial' ? '#282a30' : 'transparent',
                    color: filterStatus === 'Parcial' ? '#F5B955' : '#64748B'
                  }}
                >
                  Parcial
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ padding: '0 20px 14px 20px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar por nombre de cliente o tipo de sesión..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    paddingLeft: 36, width: '100%', background: '#0c0e14',
                    border: '1px solid #282f42', color: '#F8FAFC', borderRadius: 8, fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="no-data" style={{ padding: 40, textAlign: 'center' }}>
                No se encontraron registros de pago.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="table-wrapper desktop-only">
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'rgba(12, 14, 20, 0.6)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '12px 18px' }}>Cliente</th>
                        <th style={{ padding: '12px 14px' }}>Fecha</th>
                        <th style={{ padding: '12px 14px' }}>Saldo</th>
                        <th style={{ padding: '12px 14px' }}>Estado</th>
                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map(b => {
                        const isSelected = activeBooking && (activeBooking.id_reserva || activeBooking.id) === (b.id_reserva || b.id)
                        const bruto = parseFloat(b.monto_bruto) || 0
                        const desc = parseFloat(b.descuento_aplicado || b.descuento) || 0
                        const anti = parseFloat(b.anticipo_pagado || b.anticipo) || 0
                        const saldo = Math.max(0, bruto - desc - anti)
                        const status = b.estado_pago || (saldo <= 0 ? 'Completado' : anti > 0 ? 'Parcial' : 'Pendiente')

                        return (
                          <tr
                            key={b.id_reserva || b.id}
                            onClick={() => selectRow(b)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(40, 42, 48, 0.6)' : undefined,
                              borderLeft: isSelected ? '3px solid #F5B955' : '3px solid transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: '50%', background: '#33343b',
                                  color: '#F5B955', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.82rem', fontWeight: 700, flexShrink: 0
                                }}>
                                  {getInitials(b.nombre_cliente || b.cliente_nombre)}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 600, color: '#F8FAFC', display: 'block', fontSize: '0.9rem' }}>
                                    {b.nombre_cliente || b.cliente_nombre}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                    {b.nombre_servicio || b.servicio_nombre}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '14px 14px', fontSize: '0.82rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                              {fmtDate(b.fecha_sesion)}
                            </td>

                            <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                fontWeight: 700, fontSize: '0.9rem',
                                color: saldo > 0 ? '#ffb4ab' : '#94A3B8'
                              }}>
                                {fmt(saldo)}
                              </span>
                            </td>

                            <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                                background: status === 'Completado' ? 'rgba(34, 197, 94, 0.15)' : status === 'Parcial' ? 'rgba(173, 221, 255, 0.15)' : 'rgba(245, 185, 85, 0.15)',
                                color: status === 'Completado' ? '#4ade80' : status === 'Parcial' ? '#adddff' : '#F5B955'
                              }}>
                                {status}
                              </span>
                            </td>

                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <ChevronRight size={18} style={{ color: isSelected ? '#F5B955' : '#64748B' }} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List */}
                <div className="mobile-only" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredBookings.map(b => {
                    const isSelected = activeBooking && (activeBooking.id_reserva || activeBooking.id) === (b.id_reserva || b.id)
                    const bruto = parseFloat(b.monto_bruto) || 0
                    const desc = parseFloat(b.descuento_aplicado || b.descuento) || 0
                    const anti = parseFloat(b.anticipo_pagado || b.anticipo) || 0
                    const saldo = Math.max(0, bruto - desc - anti)
                    const status = b.estado_pago || (saldo <= 0 ? 'Completado' : anti > 0 ? 'Parcial' : 'Pendiente')

                    return (
                      <div
                        key={b.id_reserva || b.id}
                        onClick={() => selectRow(b)}
                        style={{
                          background: isSelected ? '#1e222e' : '#161922',
                          border: isSelected ? '1px solid #F5B955' : '1px solid #282f42',
                          borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: status === 'Completado' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 185, 85, 0.15)',
                            color: status === 'Completado' ? '#4ade80' : '#F5B955',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {status === 'Completado' ? <CheckCircle size={18} /> : <Hourglass size={18} />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {b.nombre_cliente || b.cliente_nombre}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {fmtDate(b.fecha_sesion)} · {b.nombre_servicio || b.servicio_nombre}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: saldo > 0 ? '#ffb4ab' : '#F8FAFC', display: 'block' }}>
                            {fmt(saldo)}
                          </span>
                          <span style={{
                            fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
                            background: status === 'Completado' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 185, 85, 0.15)',
                            color: status === 'Completado' ? '#4ade80' : '#F5B955'
                          }}>
                            {status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Footer Note */}
            <div style={{
              padding: '12px 18px', background: '#0c0e14', borderTop: '1px solid #282f42',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: '#64748B', fontSize: '0.78rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} style={{ color: '#F5B955' }} />
                <span>Liquidación respaldada bajo contrato legal Diogo Haute Studio</span>
              </div>
              <span>Página 1 de 1</span>
            </div>

          </div>
        </div>

        {/* Detail Panel: Detalle de Pago & Cobranza (5 cols on Desktop, Sticky) */}
        <div style={{ gridColumn: 'span 5' }} className="bookings-detail-panel" ref={editRef}>
          {activeBooking ? (
            <div style={{
              background: '#191b22', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #282f42',
              position: 'sticky', top: 20
            }}>
              
              {/* Detail Card Header */}
              <div style={{
                padding: 20, background: '#1e1f26', borderBottom: '1px solid #282f42',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C78D4D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5B955', boxShadow: '0 0 6px #F5B955' }} />
                    Detalle de Liquidación
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                    background: activeStatus === 'Completado' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 185, 85, 0.15)',
                    color: activeStatus === 'Completado' ? '#4ade80' : '#F5B955'
                  }}>
                    {activeStatus}
                  </span>
                </div>

                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC' }}>
                  {activeBooking.nombre_cliente || activeBooking.cliente_nombre}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: '0.82rem', marginTop: 4 }}>
                  <Camera size={14} style={{ color: '#C78D4D' }} />
                  <span>{activeBooking.nombre_servicio || activeBooking.servicio_nombre}</span>
                  <span>•</span>
                  <span>{fmtDate(activeBooking.fecha_sesion)}</span>
                </div>
              </div>

              {/* Financial Breakdown Matrix */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: '#0c0e14', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>Total Presupuestado</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>
                      {fmt(activeBruto)}
                    </span>
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: '#0c0e14', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>Anticipo Recibido</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffcd99', marginTop: 2 }}>
                      {fmt(activeAnticipo)}
                    </span>
                  </div>
                </div>

                {/* Remaining Balance Callout Box */}
                <div style={{
                  padding: 14, borderRadius: 10, background: '#1e1f26',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  border: '1px solid #282f42'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>
                      Balance Exigible
                    </span>
                    <span style={{
                      fontSize: '1.45rem', fontWeight: 800,
                      color: activeSaldo > 0 ? '#ffb4ab' : '#4ade80'
                    }}>
                      {fmt(activeSaldo)}
                    </span>
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: activeSaldo > 0 ? 'rgba(147, 0, 10, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: activeSaldo > 0 ? '#ffb4ab' : '#4ade80'
                  }}>
                    {activeSaldo > 0 ? <Hourglass size={22} /> : <CheckCircle size={22} />}
                  </div>
                </div>

                {/* Production Moodboard Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>
                    Hoja de Contacto & Moodboard
                  </span>
                  <div style={{
                    position: 'relative', width: '100%', height: 100, borderRadius: 8,
                    overflow: 'hidden', background: '#0c0e14', border: '1px solid #282f42'
                  }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg, rgba(232, 176, 114, 0.1) 0%, rgba(11, 13, 19, 0.9) 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4
                    }}>
                      <ImageIcon size={24} style={{ color: '#F5B955', opacity: 0.8 }} />
                      <span style={{ fontSize: '0.75rem', color: '#F8FAFC', fontWeight: 600 }}>
                        {activeBooking.url_galeria ? 'Galería Entregada Disponible' : 'Galería en Producción Atelier'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accepted Payment Methods Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>
                    Canales de Pago Habilitados
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: '#282a30', fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CreditCard size={12} style={{ color: '#F5B955' }} /> Stripe / Visa
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: '#282a30', fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Wallet size={12} style={{ color: '#F5B955' }} /> Wire SEPA
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: '#282a30', fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Euro size={12} style={{ color: '#F5B955' }} /> Efectivo Estudio
                    </span>
                  </div>
                </div>

                {/* Quick Interaction Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => {
                      setAbonoAmount(activeSaldo > 0 ? activeSaldo.toString() : '')
                      setShowAbonoModal(true)
                    }}
                    style={{
                      width: '100%', padding: '10px 0', background: '#e8b072', color: '#482900',
                      border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700,
                      cursor: 'pointer', boxShadow: '0 0 20px rgba(232,176,114,0.25)', transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <CreditCard size={16} /> Registrar Pago / Abono (€)
                  </button>

                  {getWhatsAppReminderUrl(activeBooking) && (
                    <a
                      href={getWhatsAppReminderUrl(activeBooking)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '100%', padding: '8px 0', background: '#282a30', color: '#F8FAFC',
                        border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                        textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <Send size={15} style={{ color: '#F5B955' }} /> Recordatorio WhatsApp
                    </a>
                  )}

                  <button
                    onClick={() => {
                      window.print()
                    }}
                    style={{
                      width: '100%', padding: '8px 0', background: '#0c0e14', color: '#94A3B8',
                      border: '1px solid #282f42', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <FileText size={15} /> Descargar / Imprimir Recibo
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div style={{ background: '#191b22', borderRadius: 14, padding: 40, textAlign: 'center', border: '1px solid #282f42' }}>
              <CreditCard size={32} className="text-muted" style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <div style={{ color: '#F8FAFC', fontWeight: 600 }}>Selecciona una liquidación</div>
              <div style={{ color: '#64748B', fontSize: '0.82rem', marginTop: 4 }}>
                Haz clic en una sesión para inspeccionar sus pagos o abonar.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Registrar Abono a Reserva */}
      {showAbonoModal && activeBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={20} className="text-accent" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#F8FAFC' }}>Abonar a Reserva</h3>
              </div>
              <button className="modal-close" onClick={() => setShowAbonoModal(false)}><XCircle size={20} /></button>
            </div>
            
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                Registrar ingreso formal para <strong style={{ color: '#F8FAFC' }}>{activeBooking.nombre_cliente || activeBooking.cliente_nombre}</strong> ({activeBooking.nombre_servicio || activeBooking.servicio_nombre}).
              </p>

              <div className="form-group">
                <label className="form-label">Monto Recibido (€) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#F5B955', fontWeight: 700 }}>€</span>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={abonoAmount}
                    onChange={e => setAbonoAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ paddingLeft: 30, fontSize: '1.1rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Método de Cobro</label>
                <select
                  className="form-select"
                  value={abonoMethod}
                  onChange={e => setAbonoMethod(e.target.value)}
                >
                  <option value="Transferencia Bancaria Inmediata">Transferencia Bancaria Inmediata</option>
                  <option value="Terminal POS / Tarjeta en Estudio">Terminal POS / Tarjeta en Estudio</option>
                  <option value="Efectivo en Recepción">Efectivo en Recepción</option>
                  <option value="Stripe Link">Stripe Link</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notas del Pago (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={abonoNotes}
                  onChange={e => setAbonoNotes(e.target.value)}
                  placeholder="Ej: Comprobante #98231..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAbonoModal(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleAbonoSubmit}
                disabled={saving || !abonoAmount}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle size={16} /> {saving ? 'Guardando...' : 'Confirmar Abono'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
