import { useState, useEffect } from 'react'
import { Calendar, DollarSign, Users, AlertTriangle, LayoutDashboard, XCircle } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import AlertsWidget from '../components/AlertsWidget'
import LoyaltyWidget from '../components/LoyaltyWidget'
import OpportunityWidget from '../components/OpportunityWidget'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v ?? 0)

function Dashboard() {
  const [kpis, setKpis] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [loyalty, setLoyalty] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [kRes, aRes, oRes, lRes] = await Promise.all([
          fetch('/api/dashboard/kpis'),
          fetch('/api/dashboard/alerts'),
          fetch('/api/dashboard/opportunities'),
          fetch('/api/dashboard/loyalty'),
        ])
        if (!kRes.ok) throw new Error('Error al cargar KPIs')
        const [kData, aData, oData, lData] = await Promise.all([
          kRes.json(), aRes.json(), oRes.json(), lRes.json()
        ])
        setKpis(kData)
        setAlerts(Array.isArray(aData) ? aData : aData.alerts || [])
        setOpportunities(Array.isArray(oData) ? oData : oData.opportunities || [])
        setLoyalty(Array.isArray(lData) ? lData : lData.loyalty || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="loading-spinner">
      <div className="spinner" />
      <span>Cargando dashboard...</span>
    </div>
  )

  if (error) return (
    <div style={{padding:'40px'}}>
      <div className="alert-danger-card">
        <XCircle size={24} className="text-danger" style={{flexShrink:0}}/>
        <div className="alert-text">
          <div className="alert-name">Error de conexión</div>
          <div className="alert-msg">{error}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{display:'flex', alignItems:'center', gap:8}}>
            <LayoutDashboard size={24} className="text-accent" /> Dashboard
          </div>
          <div className="page-subtitle">Resumen general de tu estudio fotográfico</div>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard
          icon={<Calendar size={28} className="text-info" />}
          label="Reservas Agendadas"
          value={kpis?.reservas_agendadas ?? 0}
          color="info"
        />
        <KpiCard
          icon={<DollarSign size={28} className="text-accent" />}
          label="Ingreso Total"
          value={fmt(kpis?.ingreso_total)}
          color="accent"
        />
        <KpiCard
          icon={<Users size={28} className="text-success" />}
          label="Clientes Activos"
          value={kpis?.clientes_activos ?? 0}
          color="success"
        />
        <KpiCard
          icon={<AlertTriangle size={28} className={alerts.length > 0 ? "text-danger" : "text-success"} />}
          label="Alertas Pendientes"
          value={kpis?.alertas_pendientes ?? alerts.length}
          color={alerts.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-left">
          <AlertsWidget alerts={alerts} />
          <OpportunityWidget opportunities={opportunities} />
        </div>
        <div className="dashboard-right">
          <LoyaltyWidget data={loyalty} />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
