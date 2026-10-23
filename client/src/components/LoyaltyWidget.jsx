import { Trophy, Medal, Award } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0)

function getLoyaltyBadge(pct) {
  if (pct >= 20) return { icon: <Trophy size={14} />, label: 'Ouro', cls: 'loyalty-oro' }
  if (pct >= 15) return { icon: <Medal size={14} />, label: 'Prata', cls: 'loyalty-plata' }
  return { icon: <Award size={14} />, label: 'Bronze', cls: 'loyalty-bronce' }
}

function LoyaltyWidget({ data = [] }) {
  if (!data.length) {
    return (
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={20} className="text-accent" /> Fidelização
        </div>
        <div className="widget-empty">Sem dados de fidelização</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Trophy size={20} className="text-accent" /> Fidelização de Clientes
      </div>
      <div className="widget-list">
        {data.slice(0, 5).map((c, i) => { // Limitar a top 5
          const badge = getLoyaltyBadge(c.descuento_sugerido_pct)
          return (
            <div key={i} className="loyalty-item">
              <div className="loyalty-item-name">{c.nombre || c.nombre_cliente}</div>
              <span className={`loyalty-badge ${badge.cls}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {badge.icon} {badge.label}
              </span>
              <div className="loyalty-item-stats">
                <div style={{fontWeight:700, color:'var(--accent)'}}>{fmt(c.total_gastado)}</div>
                <div style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{c.sesiones_completadas} sessão(ões)</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LoyaltyWidget
