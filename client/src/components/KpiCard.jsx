function KpiCard({ icon, label, value, color }) {
  return (
    <div className={`kpi-card kpi-color-${color || 'accent'}`}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className={`kpi-icon-badge ${color || ''}`}>{icon}</div>
      </div>
      <div className={`kpi-value ${color || ''}`}>{value}</div>
    </div>
  )
}

export default KpiCard
