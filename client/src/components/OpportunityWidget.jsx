import { Target, Calendar, MessageCircle, Heart, Cake, Clock, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'

function OpportunityWidget({ opportunities = [] }) {
  const navigate = useNavigate()

  if (!opportunities.length) {
    return (
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20} className="text-accent" /> Oportunidades & Recontacto
        </div>
        <div className="widget-empty">Sin oportunidades pendientes de recontacto</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Target size={20} className="text-accent" /> Oportunidades & Recontacto ({opportunities.length})
      </div>
      <div className="widget-list">
        {opportunities.map((o, i) => {
          const phone = (o.telefono || '').replace(/\D/g, '')
          const pitch = o.whatsapp_pitch || `¡Hola ${o.nombre}! Te saludamos de Diogo Studio...`
          const isAniv = o.tipo === 'aniversario'
          const isBday = o.tipo === 'cumpleanos'

          return (
            <div key={i} className="opportunity-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isAniv ? 'rgba(217, 119, 6, 0.15)' : (isBday ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                  color: isAniv ? '#f59e0b' : (isBday ? '#22c55e' : '#60a5fa')
                }}>
                  {isAniv ? <Heart size={18} /> : (isBday ? <Cake size={18} /> : <Clock size={18} />)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div 
                    className="opportunity-name" 
                    onClick={() => o.id && navigate(`/clients/${o.id}`)}
                    style={{ cursor: o.id ? 'pointer' : 'default', fontWeight: 600, color: '#f3f4f6', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    {o.nombre || o.nombre_cliente}
                  </div>
                  <div className="opportunity-reason" style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {o.motivo_recontacto}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {phone && (
                  <a 
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(pitch)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '6px 10px', fontSize: '0.8rem' }}
                    title="Enviar mensaje personalizado por WhatsApp"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
                {o.id && (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => navigate(`/clients/${o.id}`)}
                    style={{ padding: '6px 8px' }}
                    title="Ver perfil completo del cliente"
                  >
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OpportunityWidget
