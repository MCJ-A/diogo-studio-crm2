function StatusBadge({ status }) {
  if (!status) return null
  const key = status.toLowerCase().replace(/\s+/g, '_')
  const labels = {
    agendada: 'Agendada',
    realizada: 'Realizada',
    seleccion_pendiente: 'Seleccion Pendiente',
    en_edicion: 'En Edicion',
    entregada: 'Entregada',
    cancelada: 'Cancelada',
    pendiente: 'Pendiente',
    pagado: 'Pagado',
    parcial: 'Parcial',
  }
  return (
    <span className={`badge badge-${key}`}>
      {labels[key] || status}
    </span>
  )
}

export default StatusBadge
