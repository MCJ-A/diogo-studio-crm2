function StatusBadge({ status }) {
  if (!status) return null
  const key = status.toLowerCase().replace(/\s+/g, '_')
  const labels = {
    agendada: 'Agendada',
    realizada: 'Realizada',
    seleccion_pendiente: 'Seleção Pendente',
    en_edicion: 'Em Edição',
    entregada: 'Entregue',
    cancelada: 'Cancelada',
    pendiente: 'Pendente',
    pagado: 'Pago',
    parcial: 'Parcial',
  }
  return (
    <span className={`badge badge-${key}`}>
      {labels[key] || status}
    </span>
  )
}

export default StatusBadge
