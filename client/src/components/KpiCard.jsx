function KpiCard({ icon, label, value, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value${color ? ` ${color}` : ''}`}>{value}</div>
    </div>
  )
}

export default KpiCard
