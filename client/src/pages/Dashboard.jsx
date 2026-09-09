import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, Euro, Users, AlertTriangle, LayoutDashboard, XCircle, 
  Plus, ArrowUpRight, TrendingUp, ShieldAlert, Sparkles, MessageCircle, 
  ChevronRight, ExternalLink, Camera, Clock, Trophy, Award, Medal, CheckCircle2,
  FileSignature, Target, Send, ArrowRight
} from 'lucide-react'

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0)

export default function Dashboard() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [loyalty, setLoyalty] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('all')

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
      <span>Cargando dashboard atelier...</span>
    </div>
  )

  if (error) return (
    <div style={{ padding: '30px' }}>
      <div className="alert-danger-card">
        <XCircle size={24} className="text-danger" style={{ flexShrink: 0 }} />
        <div className="alert-text">
          <div className="alert-name">Error de conexión</div>
          <div className="alert-msg">{error}</div>
        </div>
      </div>
    </div>
  )

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(o => {
    if (selectedFilter === 'all') return true
    const text = ((o.nombre || '') + ' ' + (o.motivo_recontacto || '') + ' ' + (o.tipo || '')).toLowerCase()
    if (selectedFilter === 'bodas') return text.includes('boda') || text.includes('novio') || text.includes('matrimonial') || text.includes('aniversario')
    if (selectedFilter === 'editorial') return text.includes('editorial') || text.includes('estudio') || text.includes('comercial') || text.includes('retrato') || text.includes('producto')
    return true
  })

  // Initials generator
  const getInitials = (name = '') => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'DS'
  }

  // Calculate revenue total
  const totalRevenue = kpis?.weekly_revenue ?? kpis?.ingreso_total ?? (loyalty.reduce((acc, c) => acc + (c.total_gastado || 0), 0) || 6650)
  const bookingsCount = kpis?.bookings_today ?? kpis?.reservas_agendadas ?? 2
  const activeClientsCount = kpis?.active_clients ?? kpis?.clientes_activos ?? (loyalty.length || 4)
  const criticalCount = alerts.length || (kpis?.pending_alerts ?? 1)

  return (
    <div className="dashboard-luxury-container">
      
      {/* 1. Context Banner / Editorial Top Bar */}
      <div className="dashboard-context-banner">
        <div>
          <div className="editorial-tag">
            <span>Resumen Ejecutivo</span>
            <span className="pulse-dot" />
            <span>Temporada Activa 2025</span>
          </div>
          <h1 className="dashboard-title">Panorama de Operaciones</h1>
          <p className="dashboard-subtitle">
            Control de contrataciones, fidelización de clientes y acciones críticas de recontacto.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="sync-badge">
            <Sparkles size={14} style={{ color: 'var(--accent-gold-bright)' }} />
            <span>Sincronizado</span>
          </div>
          <button 
            className="btn-luxury-primary"
            onClick={() => navigate('/bookings')}
          >
            <Plus size={16} />
            <span>Nueva Reserva</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Highlights Grid (2x2 on mobile, 4 columns on desktop) */}
      <section className="kpi-luxury-grid grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Card 1: Reservas */}
        <div className="kpi-luxury-card">
          <div className="kpi-card-top">
            <span className="kpi-card-title">Reservas del Mes</span>
            <div className="kpi-icon-box">
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="kpi-luxury-value">{bookingsCount}</span>
            <span className="kpi-trend-pill gold">
              <ArrowUpRight size={12} /> +15% mes
            </span>
          </div>
          <div className="kpi-card-footer">
            <span>Próxima: Sesión Novios</span>
          </div>
        </div>

        {/* Card 2: Ingresos Totales (High Importance Gold) */}
        <div className="kpi-luxury-card" style={{ borderColor: 'rgba(245, 185, 85, 0.25)' }}>
          <div className="kpi-card-top">
            <span className="kpi-card-title gold">Ingresos Totales</span>
            <div className="kpi-icon-box gold">
              <Euro size={18} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="kpi-luxury-value gold">{fmt(totalRevenue)}</span>
            <span className="kpi-trend-pill gold">
              <TrendingUp size={12} /> +22.4%
            </span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill-gold" style={{ width: '82%' }} />
          </div>
          <div className="kpi-card-footer">
            <span>Facturación neta cerrada</span>
            <span style={{ color: 'var(--accent-gold-muted)', fontWeight: 600 }}>Meta 82%</span>
          </div>
        </div>

        {/* Card 3: Cartera Activa */}
        <div className="kpi-luxury-card">
          <div className="kpi-card-top">
            <span className="kpi-card-title">Cartera Activa</span>
            <div className="kpi-icon-box">
              <Users size={18} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="kpi-luxury-value">{activeClientsCount}</span>
            <span className="kpi-trend-pill neutral">1 VIP • 3 Standard</span>
          </div>
          <div className="kpi-card-footer">
            <span>Ratio retención alto</span>
            <span style={{ color: '#bcc7de', fontWeight: 600 }}>100% NPS</span>
          </div>
        </div>

        {/* Card 4: Acciones Críticas */}
        <div className="kpi-luxury-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <div className="kpi-card-top">
            <span className="kpi-card-title error">Acciones Críticas</span>
            <div className="kpi-icon-box error">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="kpi-luxury-value error">{criticalCount}</span>
            <span className="kpi-trend-pill error">Requerida</span>
          </div>
          <div className="kpi-card-footer">
            <span style={{ color: 'var(--error)' }}>Contrato pendiente</span>
            <span style={{ color: 'var(--text-muted)' }}>Prioridad Alta</span>
          </div>
        </div>

      </section>

      {/* 3. Central Work Area: Asymmetric 2-Column Split */}
      <div className="dashboard-split-grid">
        
        {/* Left Column (7 cols): Alertas & Oportunidades */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Section: Alertas Operativas */}
          <div className="luxury-card">
            <div className="luxury-card-header">
              <div className="luxury-card-title-group">
                <div style={{
                  width: 32, height: 32, borderRadius: 8, 
                  background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="luxury-card-title">Alertas Operativas</h2>
                  <p className="luxury-card-subtitle">Seguimiento de contratos y cobros pendientes</p>
                </div>
              </div>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontWeight: 700
              }}>
                {alerts.length || 1}
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="alert-luxury-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <FileSignature size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>María González</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sesión Matrimonial</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <AlertTriangle size={12} /> Sin contrato firmado (Vence en 48 horas)
                    </div>
                  </div>
                </div>

                <button 
                  className="btn-secondary btn-sm"
                  onClick={() => navigate('/bookings')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                >
                  <span>Ver contrato</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="alert-luxury-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <FileSignature size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{a.cliente || a.nombre_cliente}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{a.servicio || a.nombre_servicio}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <AlertTriangle size={12} /> {a.alerta || a.mensaje_alerta}
                        {a.saldo_pendiente > 0 && ` (${fmt(a.saldo_pendiente)} saldo)`}
                      </div>
                    </div>
                  </div>

                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => navigate('/bookings')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                  >
                    <span>Ver detalle</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Section: Oportunidades & Recontacto */}
          <div className="luxury-card">
            <div className="luxury-card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div className="luxury-card-title-group">
                <div style={{
                  width: 32, height: 32, borderRadius: 8, 
                  background: 'rgba(232, 176, 114, 0.15)', color: 'var(--accent-gold-bright)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="luxury-card-title">Oportunidades & Recontacto</h2>
                  <p className="luxury-card-subtitle">Clientes durmientes para reactivación y fechas especiales</p>
                </div>
              </div>
              <span className="sync-badge" style={{ color: 'var(--accent-gold-bright)', borderColor: 'rgba(245, 185, 85, 0.2)' }}>
                {opportunities.length || 4} Candidatos
              </span>
            </div>

            {/* Filter Pills */}
            <div className="filter-pills-row">
              <button 
                className={`filter-pill ${selectedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('all')}
              >
                Todos ({opportunities.length || 4})
              </button>
              <button 
                className={`filter-pill ${selectedFilter === 'bodas' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('bodas')}
              >
                Bodas & Eventos
              </button>
              <button 
                className={`filter-pill ${selectedFilter === 'editorial' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('editorial')}
              >
                Retrato Editorial
              </button>
            </div>

            {/* Contact Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(filteredOpportunities.length > 0 ? filteredOpportunities : opportunities).slice(0, 4).map((o, idx) => {
                const phone = (o.telefono || '555-0101').replace(/\D/g, '')
                const pitch = o.whatsapp_pitch || `¡Hola ${o.nombre}! Te saludamos del atelier Diogo Studio...`
                const initials = getInitials(o.nombre || (idx === 0 ? 'María González' : (idx === 1 ? 'Ana Martínez' : 'Carlos Rodríguez')))
                const tier = idx === 0 ? 'VIP' : (idx === 1 ? 'Studio' : 'Comercial')
                const reason = o.motivo_recontacto || (idx === 0 ? 'Inactivo: 760 días • Boda 2023' : (idx === 1 ? 'Inactivo: 830 días • Headshots' : 'Inactivo: 837 días • Campaña Moda'))

                return (
                  <div key={idx} className="opportunity-luxury-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div className="client-avatar-circle">
                        {initials}
                        <span className="online-dot" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {o.nombre || (idx === 0 ? 'María González' : (idx === 1 ? 'Ana Martínez' : 'Carlos Rodríguez'))}
                          </span>
                          <span style={{
                            fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4,
                            background: tier === 'VIP' ? 'rgba(232, 176, 114, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            color: tier === 'VIP' ? 'var(--primary-container)' : 'var(--text-secondary)',
                            fontWeight: 700, textTransform: 'uppercase'
                          }}>
                            {tier}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} />
                          <span>{reason}</span>
                        </div>
                      </div>
                    </div>

                    <a 
                      href={`https://wa.me/${phone}?text=${encodeURIComponent(pitch)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-whatsapp-luxury"
                      title="Enviar mensaje personalizado por WhatsApp"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )
              })}
            </div>

            {/* Micro-banner prompt */}
            <div className="atelier-tip-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} style={{ color: 'var(--accent-gold-muted)', flexShrink: 0 }} />
                <span>
                  <strong>Recomendación Atelier:</strong> Ofrece a María González una pre-venta exclusiva de álbum fine-art antes de finalizar el trimestre.
                </span>
              </div>
              <button 
                onClick={() => navigate('/newsletter')}
                style={{ 
                  background: 'none', border: 'none', color: 'var(--accent-gold-bright)', 
                  fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' 
                }}
              >
                Ver plantillas
              </button>
            </div>

          </div>

        </div>

        {/* Right Column (5 cols): Fidelidad LTV Ranking & Capacidad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Section: Fidelidad de Clientes (LTV Ranking) */}
          <div className="luxury-card">
            <div className="luxury-card-header">
              <div className="luxury-card-title-group">
                <div style={{
                  width: 32, height: 32, borderRadius: 8, 
                  background: 'rgba(232, 176, 114, 0.15)', color: 'var(--accent-gold-bright)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Trophy size={18} />
                </div>
                <div>
                  <h2 className="luxury-card-title">Fidelidad de Clientes</h2>
                  <p className="luxury-card-subtitle">Valor de ciclo de vida acumulado (LTV)</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/clients')}
                style={{ 
                  background: 'none', border: 'none', color: 'var(--text-secondary)', 
                  fontSize: '0.78rem', cursor: 'pointer' 
                }}
              >
                Ver Todos
              </button>
            </div>

            {/* Ranking List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(loyalty.length > 0 ? loyalty : [
                { id: 1, nombre: 'María González', total_gastado: 5050, sesiones_completadas: 2, descuento_sugerido_pct: 15 },
                { id: 2, nombre: 'Carlos Rodríguez', total_gastado: 3000, sesiones_completadas: 1, descuento_sugerido_pct: 0 },
                { id: 3, nombre: 'Ana Martínez', total_gastado: 1100, sesiones_completadas: 1, descuento_sugerido_pct: 0 },
                { id: 4, nombre: 'Luis Fernández', total_gastado: 0, sesiones_completadas: 0, descuento_sugerido_pct: 0 }
              ]).slice(0, 4).map((c, index) => {
                const rank = index + 1
                const isTop1 = rank === 1
                const tier = isTop1 ? 'Plata' : (rank <= 3 ? 'Bronce' : 'Nuevo')
                const rankClass = isTop1 ? 'gold' : (rank === 2 ? 'silver' : 'bronze')

                return (
                  <div 
                    key={c.id || index} 
                    className="loyalty-rank-row"
                    onClick={() => c.id && navigate(`/clients/${c.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div className={`rank-badge-num ${rankClass}`}>
                        {rank}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.nombre || c.nombre_cliente}
                          </span>
                          <span style={{
                            fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4,
                            background: isTop1 ? 'rgba(188, 199, 222, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            color: isTop1 ? '#bcc7de' : 'var(--accent-gold-muted)',
                            fontWeight: 600
                          }}>
                            {tier}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {c.sesiones_completadas || (isTop1 ? 2 : (rank <= 3 ? 1 : 0))} {c.sesiones_completadas === 1 ? 'sesión contratada' : 'sesiones contratadas'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ 
                        fontFamily: 'var(--font-display)', 
                        fontWeight: 600, 
                        fontSize: '1rem', 
                        color: isTop1 ? 'var(--accent-gold-bright)' : 'var(--text-primary)' 
                      }}>
                        {fmt(c.total_gastado)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {isTop1 ? '76% del total' : (c.total_gastado > 0 ? 'Completado' : 'Prospección')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section: Capacidad de Estudio / Plató */}
          <div className="luxury-card">
            <div className="luxury-card-header">
              <div className="luxury-card-title-group">
                <div style={{
                  width: 32, height: 32, borderRadius: 8, 
                  background: 'rgba(245, 185, 85, 0.15)', color: 'var(--accent-gold-bright)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="luxury-card-title">Capacidad de Estudio</h3>
                  <p className="luxury-card-subtitle">Ocupación y flujo de producción</p>
                </div>
              </div>
              <span className="sync-badge" style={{ color: 'var(--accent-gold-muted)', borderColor: 'rgba(245, 185, 85, 0.2)' }}>
                Noviembre 2025
              </span>
            </div>

            {/* Occupancy Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ocupación de plató principal</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>65%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill-gold" style={{ width: '65%' }} />
              </div>
            </div>

            {/* Stat Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="studio-stat-box">
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Entregas pendientes
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  3 Galerías
                </span>
              </div>
              <div className="studio-stat-box">
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Próximo Shooting
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-gold-bright)' }}>
                  Mañana 10:00
                </span>
              </div>
            </div>

            {/* Production pulse footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.04)',
              fontSize: '0.8rem', color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Camera size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Próximo shooting: Lookbook Editorial Studio
                </span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

