import { useState, useEffect, useRef } from 'react'
import { DollarSign, Save, XCircle, CreditCard, ChevronRight } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v ?? 0)
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX') : '—'

const ESTADOS_PAGO = ['Pendiente', 'Parcial', 'Pagado']

export default function Payments() {
  const [bookings, setBookings] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [payData, setPayData] = useState({
    monto_bruto: '',
    descuento: '',
    motivo_descuento: '',
    anticipo: '',
    estado_pago: 'Pendiente',
  })

  useEffect(() => { fetchBookings() }, [])

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings')
      if (!res.ok) throw new Error('Error al cargar reservas')
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : data.bookings || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const editRef = useRef(null)

  const selectRow = (b) => {
    setSelected(b)
    setPayData({
      monto_bruto: b.monto_bruto ?? '',
      descuento: b.descuento ?? '',
      motivo_descuento: b.motivo_descuento ?? '',
      anticipo: b.anticipo_pagado ?? b.anticipo ?? '',
      estado_pago: b.estado_pago || 'Pendiente',
    })
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const saldo = () => {
    const bruto = parseFloat(payData.monto_bruto) || 0
    const desc = parseFloat(payData.descuento) || 0
    const anti = parseFloat(payData.anticipo) || 0
    return bruto - desc - anti
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        monto_bruto: parseFloat(payData.monto_bruto) || 0,
        descuento: parseFloat(payData.descuento) || 0,
        motivo_descuento: payData.motivo_descuento,
        anticipo_pagado: parseFloat(payData.anticipo) || 0,
        saldo_pendiente: saldo(),
        estado_pago: payData.estado_pago,
      }
      const res = await fetch(`/api/payments/${selected.id_reserva}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const fallback = await fetch(`/api/bookings/${selected.id_reserva}/payment`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!fallback.ok) throw new Error('Error al guardar pago')
      }
      await fetchBookings()
      setSuccessMsg('Pago actualizado correctamente')
      setTimeout(() => setSuccessMsg(null), 3000)
      setSelected(prev => prev ? { ...prev, ...body } : null)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  const saldoVal = selected ? saldo() : 0
  const isPositive = saldoVal <= 0

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{display:'flex', alignItems:'center', gap:8}}>
            <DollarSign size={24} className="text-accent" /> Finanzas
          </div>
          <div className="page-subtitle">Gestión de pagos por reserva</div>
        </div>
      </div>

      {error && <div className="alert-danger-card">{error}</div>}
      {successMsg && <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'var(--success)'}}>{successMsg}</div>}

      <div className="dashboard-grid">
        <div className="dashboard-left" style={{ flex: '2' }}>
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} className="text-accent" /> Todos los pagos
            </div>

            {/* Tabla para escritorio */}
            <div className="table-wrapper desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Saldo</th>
                    <th>Estado de Pago</th>
                    <th style={{textAlign:'right'}}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan={5} className="no-data">Sin reservas registradas</td></tr>
                  ) : bookings.map(b => {
                    const saldoB = (b.monto_bruto || 0) - (b.descuento || 0) - (b.anticipo_pagado || b.anticipo || 0)
                    return (
                      <tr
                        key={b.id_reserva}
                        onClick={() => selectRow(b)}
                        className={selected?.id_reserva === b.id_reserva ? 'selected-row' : ''}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{fontWeight:600}}>
                          {b.nombre_cliente}
                          <div style={{fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:'normal'}}>{b.nombre_servicio}</div>
                        </td>
                        <td>{fmtDate(b.fecha_sesion)}</td>
                        <td style={{fontWeight:700, color: saldoB > 0 ? 'var(--danger)' : saldoB <= 0 && b.monto_bruto ? 'var(--success)' : 'var(--text-muted)'}}>
                          {b.monto_bruto ? fmt(Math.max(0, saldoB)) : '—'}
                        </td>
                        <td><StatusBadge status={b.estado_pago || 'Pendiente'} /></td>
                        <td style={{textAlign:'right'}}>
                          <ChevronRight size={18} className="text-muted" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas móviles */}
            <div className="mobile-only payment-cards-list">
              {bookings.length === 0 ? (
                <div className="no-data">Sin reservas registradas</div>
              ) : bookings.map(b => {
                const saldoB = (b.monto_bruto || 0) - (b.descuento || 0) - (b.anticipo_pagado || b.anticipo || 0)
                return (
                  <div
                    key={b.id_reserva}
                    className={`payment-mobile-card ${selected?.id_reserva === b.id_reserva ? 'selected' : ''}`}
                    onClick={() => selectRow(b)}
                  >
                    <div className="payment-mobile-top">
                      <div>
                        <div className="payment-mobile-client">{b.nombre_cliente}</div>
                        <div className="payment-mobile-service">{b.nombre_servicio}</div>
                      </div>
                      <StatusBadge status={b.estado_pago || 'Pendiente'} />
                    </div>

                    <div className="payment-mobile-middle">
                      <div className="payment-mobile-stat">
                        <span className="payment-stat-label">Fecha:</span>
                        <span>{fmtDate(b.fecha_sesion)}</span>
                      </div>
                      <div className="payment-mobile-stat">
                        <span className="payment-stat-label">Saldo Pendiente:</span>
                        <strong style={{ color: saldoB > 0 ? 'var(--danger)' : saldoB <= 0 && b.monto_bruto ? 'var(--success)' : 'var(--text-muted)' }}>
                          {b.monto_bruto ? fmt(Math.max(0, saldoB)) : '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="payment-mobile-footer">
                      <span className="text-accent" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        Editar pago <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="dashboard-right" style={{ flex: '1' }} ref={editRef}>
          {selected ? (
            <div className="card sticky" style={{ top: '24px' }}>
              <div className="modal-header" style={{marginBottom:16}}>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={20} className="text-accent" /> Editar Pago
                </div>
                <button className="modal-close" onClick={() => setSelected(null)}><XCircle size={20}/></button>
              </div>

              <div style={{marginBottom:16, padding:'12px', background:'rgba(15,17,23,0.5)', borderRadius:8, border:'1px solid var(--border)'}}>
                <div style={{fontWeight:700, color:'var(--accent)', fontSize:'1rem', marginBottom:4}}>{selected.nombre_cliente}</div>
                <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>{selected.nombre_servicio} · {fmtDate(selected.fecha_sesion)}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Monto Bruto (MXN)</label>
                <input type="number" className="form-input" value={payData.monto_bruto} onChange={e => setPayData({...payData, monto_bruto: e.target.value})} placeholder="0.00" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Descuento</label>
                  <input type="number" className="form-input" value={payData.descuento} onChange={e => setPayData({...payData, descuento: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Anticipo Pagado</label>
                  <input type="number" className="form-input" value={payData.anticipo} onChange={e => setPayData({...payData, anticipo: e.target.value})} placeholder="0.00" />
                </div>
              </div>

              {parseFloat(payData.descuento) > 0 && (
                <div className="form-group">
                  <label className="form-label">Motivo del Descuento</label>
                  <input className="form-input" value={payData.motivo_descuento} onChange={e => setPayData({...payData, motivo_descuento: e.target.value})} placeholder="Ej: Cliente fiel, descuento por lealtad..." />
                </div>
              )}

              <div className={`payment-highlight ${isPositive ? 'positive' : 'negative'}`} style={{marginBottom:16}}>
                <div>
                  <div className="payment-highlight-label">Saldo Pendiente</div>
                  <div className="text-muted" style={{fontSize:'0.75rem', marginTop:2}}>Bruto - Descuento - Anticipo</div>
                </div>
                <div className="payment-highlight-value">{fmt(saldo())}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Estado de Pago</label>
                <select className="form-select" value={payData.estado_pago} onChange={e => setPayData({...payData, estado_pago: e.target.value})}>
                  {ESTADOS_PAGO.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              <button className="btn-primary w-full" onClick={handleSave} disabled={saving} style={{marginTop:8, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
                <Save size={16}/> {saving ? 'Guardando...' : 'Guardar Pago'}
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="widget-empty">Selecciona una reserva para editar los detalles de su pago</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
