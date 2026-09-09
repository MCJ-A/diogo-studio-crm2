import { useNavigate } from 'react-router-dom'
import { AlertCircle, AlertTriangle, BellRing } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

function AlertsWidget({ alerts = [] }) {
  const navigate = useNavigate()

  if (!alerts.length) {
    return (
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BellRing size={20} className="text-warning" /> Alertas
        </div>
        <div className="widget-empty">Sin alertas pendientes</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BellRing size={20} className="text-warning" /> Alertas 
        <span className="badge badge-cancelada" style={{marginLeft:'auto'}}>{alerts.length}</span>
      </div>
      <div className="widget-list">
        {alerts.map((a, i) => {
          const hasPending = a.saldo_pendiente > 0
          return (
            <div key={i} className={hasPending ? 'alert-danger-card' : 'alert-warning-card'}>
              <div style={{ flexShrink: 0 }}>
                {hasPending ? <AlertCircle className="text-danger" size={24} /> : <AlertTriangle className="text-warning" size={24} />}
              </div>
              <div className="alert-text">
                <div className="alert-name">{a.cliente || a.nombre_cliente} — {a.servicio || a.nombre_servicio}</div>
                <div className="alert-msg">{a.alerta || a.mensaje_alerta}</div>
                {hasPending && (
                  <div className="alert-amount text-danger">{fmt(a.saldo_pendiente)} pendiente</div>
                )}
              </div>
              <button
                className="btn-secondary btn-sm"
                onClick={() => navigate(`/bookings`)}
              >
                Ver
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AlertsWidget
