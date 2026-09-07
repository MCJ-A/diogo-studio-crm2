import { Target, Calendar, MessageCircle } from 'lucide-react'

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX') : '—'

function OpportunityWidget({ opportunities = [] }) {
  if (!opportunities.length) {
    return (
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20} className="text-accent" /> Oportunidades
        </div>
        <div className="widget-empty">Sin oportunidades pendientes</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Target size={20} className="text-accent" /> Oportunidades
      </div>
      <div className="widget-list">
        {opportunities.map((o, i) => {
          // Format phone number for WhatsApp
          const phone = (o.telefono || '').replace(/\D/g, '');
          
          return (
            <div key={i} className="opportunity-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="opportunity-name">{o.nombre || o.nombre_cliente}</div>
                <div className="opportunity-reason">{o.motivo_recontacto}</div>
                {o.fecha_opcion_recontacto && (
                  <div className="opportunity-date" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {fmtDate(o.fecha_opcion_recontacto)}
                  </div>
                )}
              </div>
              {phone && (
                <a 
                  href={`https://wa.me/${phone}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  <MessageCircle size={14} /> Contactar
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OpportunityWidget
