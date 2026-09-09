import { useState, useEffect } from 'react'
import { 
  Mail, Send, Sparkles, Users, Award, Heart, Clock, CheckCircle, 
  AlertTriangle, RefreshCw, Eye, History, ExternalLink, ShieldAlert, Edit
} from 'lucide-react'

const PRESETS = [
  {
    id: 'temporada',
    name: 'Promoción de Temporada',
    asunto: 'Nueva temporada en Diogo Studio: Cupos limitados para sesiones especiales',
    titulo: 'Sesiones Exclusivas de Temporada',
    contenido: `Queremos invitarte a capturar recuerdos únicos en nuestras locaciones especiales de esta temporada.\n\nHemos preparado escenarios y dinámicas pensadas para familias, parejas y retratos personales que buscan una estética cálida y atemporal.\n\nLos cupos son limitados por semana para garantizar una experiencia personalizada de alta calidad. ¡Reserva con anticipación y asegura tu fecha favorita!`,
    boton_texto: 'Reservar Fecha por WhatsApp',
    boton_url: 'https://wa.me/?text=Hola%20Diogo%20Studio,%20quiero%20informacion%20de%20la%20sesion%20de%20temporada'
  },
  {
    id: 'vip',
    name: 'Beneficio Exclusivo VIP',
    asunto: 'Regalo exclusivo para ti: Descuento especial de lealtad en Diogo Studio',
    titulo: 'Gracias por ser parte de nuestra comunidad VIP',
    contenido: `Porque valoramos profundamente la confianza que has depositado en nuestro lente, queremos ofrecerte un beneficio exclusivo para tu próxima sesión fotográfica.\n\nDisfruta de tu descuento de lealtad preferencial aplicable a cualquiera de nuestros paquetes (Bodas, Maternidad, Recuerdos Familiares o Retrato Profesional).\n\nEste beneficio es transferible a un familiar directo si deseas hacer un regalo inolvidable.`,
    boton_texto: 'Hacer Válido Mi Descuento',
    boton_url: 'https://wa.me/?text=Hola%20Diogo%20Studio,%20quiero%20hacer%20valido%20mi%20descuento%20VIP'
  },
  {
    id: 'especial',
    name: 'Celebración & Fechas Especiales',
    asunto: 'Se acerca una fecha muy especial: Conmemórala con Diogo Studio',
    titulo: 'Momentos que merecen ser recordados para siempre',
    contenido: `Sabemos que se aproxima una fecha muy significativa en tu calendario: un aniversario, un cumpleaños o un hito familiar que merece quedar guardado en imágenes.\n\nEn Diogo Studio nos encargamos de que disfrutes la experiencia al máximo, con entrega de galería digital en alta resolución y opciones de impresión fina.\n\nCuéntanos tu idea y crearemos una sesión a la medida de tu celebración.`,
    boton_texto: 'Cotizar Sesión Especial',
    boton_url: 'https://wa.me/?text=Hola%20Diogo%20Studio,%20quisiera%20cotizar%20una%20sesion%20para%20nuestra%20fecha%20especial'
  },
  {
    id: 'reactivacion',
    name: 'Reactivación de Clientes',
    asunto: 'Cuánto tiempo hace que no renuevas tus fotos familiares',
    titulo: 'El tiempo vuela, pero los recuerdos se quedan',
    contenido: `Ha pasado algún tiempo desde que nos vimos en el estudio y sabemos lo rápido que cambian las etapas de la vida.\n\nNos encantaría volver a encontrarnos para actualizar tus retratos y crear nuevas memorias juntos. Tenemos paquetes renovados y nuevas opciones de entregables.\n\nPor reencontrarnos, te obsequiamos 5 fotografías adicionales editadas en tu próxima sesión.`,
    boton_texto: 'Ver Nuevos Paquetes',
    boton_url: 'https://wa.me/?text=Hola%20Diogo%20Studio,%20quiero%20aprovechar%20la%20promocion%20de%20fotos%20adicionales'
  }
]

export default function Newsletter() {
  const [status, setStatus] = useState(null)
  const [audiences, setAudiences] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('compose') // 'compose' | 'history'

  // Form State
  const [selectedAudience, setSelectedAudience] = useState('all')
  const [asunto, setAsunto] = useState(PRESETS[0].asunto)
  const [titulo, setTitulo] = useState(PRESETS[0].titulo)
  const [contenido, setContenido] = useState(PRESETS[0].contenido)
  const [botonTexto, setBotonTexto] = useState(PRESETS[0].boton_texto)
  const [botonUrl, setBotonUrl] = useState(PRESETS[0].boton_url)
  const [testEmail, setTestEmail] = useState('')

  // Action states
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [stRes, audRes, campRes] = await Promise.all([
        fetch('/api/newsletter/status'),
        fetch('/api/newsletter/audiences'),
        fetch('/api/newsletter/campaigns')
      ])

      if (stRes.ok) setStatus(await stRes.json())
      if (audRes.ok) setAudiences(await audRes.json())
      if (campRes.ok) setCampaigns(await campRes.json())
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Update preview whenever form changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/newsletter/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo,
            contenido,
            boton_texto: botonTexto,
            boton_url: botonUrl,
            nombre_ejemplo: 'María González'
          })
        })
        if (res.ok) {
          const data = await res.json()
          setPreviewHtml(data.html)
        }
      } catch (e) {
        // Silent fail for preview
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [titulo, contenido, botonTexto, botonUrl])

  const applyPreset = (preset) => {
    setAsunto(preset.asunto)
    setTitulo(preset.titulo)
    setContenido(preset.contenido)
    setBotonTexto(preset.boton_texto)
    setBotonUrl(preset.boton_url)
    setFeedback({ type: 'success', text: `Plantilla "${preset.name}" cargada` })
    setTimeout(() => setFeedback(null), 2500)
  }

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setFeedback({ type: 'error', text: 'Por favor ingresa un correo electrónico válido para la prueba' })
      return
    }
    setSendingTest(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          asunto,
          contenido,
          boton_texto: botonTexto,
          boton_url: botonUrl,
          test_email: testEmail
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar prueba')
      setFeedback({ type: 'success', text: data.message || `Prueba enviada a ${testEmail}` })
    } catch (e) {
      setFeedback({ type: 'error', text: e.message })
    } finally {
      setSendingTest(false)
    }
  }

  const handleSendCampaign = async () => {
    const audInfo = audiences ? audiences[selectedAudience] : null
    const count = audInfo?.count || 0
    if (count === 0) {
      setFeedback({ type: 'error', text: 'No hay destinatarios en la audiencia seleccionada' })
      return
    }

    const confirmed = window.confirm(`¿Estás seguro de enviar esta campaña a ${count} cliente(s)?`)
    if (!confirmed) return

    setSendingCampaign(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          asunto,
          contenido,
          boton_texto: botonTexto,
          boton_url: botonUrl,
          audience: selectedAudience
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar campaña')

      setFeedback({ 
        type: 'success', 
        text: `¡Campaña enviada con éxito! ${data.enviados} mensajes procesados (${data.simulated ? 'Modo Simulado Sandbox' : data.provider})` 
      })

      // Refrescar historial
      const campRes = await fetch('/api/newsletter/campaigns')
      if (campRes.ok) setCampaigns(await campRes.json())
      setActiveTab('history')

    } catch (e) {
      setFeedback({ type: 'error', text: e.message })
    } finally {
      setSendingCampaign(false)
    }
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  const currentAudienceInfo = audiences ? audiences[selectedAudience] : null

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={24} className="text-accent" /> Campañas & Newsletter
          </div>
          <div className="page-subtitle">Envío de promociones y boletines por correo con diseño profesional</div>
        </div>

        {/* Status Badge */}
        {status && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: '0.8rem',
            background: status.configured ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${status.configured ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            color: status.configured ? '#22c55e' : '#fbbf24'
          }}>
            {status.configured ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
            <span>{status.message}</span>
          </div>
        )}
      </div>

      {feedback && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
          color: feedback.type === 'error' ? 'var(--danger)' : 'var(--success)'
        }}>
          {feedback.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {feedback.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
        <button
          className={activeTab === 'compose' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={() => setActiveTab('compose')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Send size={15} /> Redactar Campaña
        </button>
        <button
          className={activeTab === 'history' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={() => setActiveTab('history')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <History size={15} /> Historial de Envíos ({campaigns.length})
        </button>
      </div>

      {activeTab === 'compose' ? (
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)', gap: 24 }}>
          
          {/* Columna Izquierda: Configuración & Redacción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Segmentación de Audiencia */}
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', marginBottom: 12 }}>
                <Users size={18} className="text-accent" /> 1. Selecciona tu Audiencia
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {audiences && [
                  { key: 'all', icon: <Users size={16} />, label: 'Todos los Clientes', count: audiences.all?.count || 0 },
                  { key: 'vip', icon: <Award size={16} />, label: 'Clientes VIP', count: audiences.vip?.count || 0 },
                  { key: 'special_dates', icon: <Heart size={16} />, label: 'Fechas Especiales', count: audiences.special_dates?.count || 0 },
                  { key: 'inactive', icon: <Clock size={16} />, label: 'Inactivos (>6m)', count: audiences.inactive?.count || 0 }
                ].map(aud => {
                  const isSel = selectedAudience === aud.key
                  return (
                    <div
                      key={aud.key}
                      onClick={() => setSelectedAudience(aud.key)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: isSel ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isSel ? '#d97706' : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isSel ? '#f59e0b' : '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>
                        {aud.icon} {aud.label}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: 4 }}>
                        {aud.count} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9ca3af' }}>emails</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Plantillas Rápidas */}
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', marginBottom: 12 }}>
                <Sparkles size={18} className="text-accent" /> 2. Cargar Plantilla Rápida
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className="btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Formulario de Redacción */}
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', marginBottom: 14 }}>
                <Edit size={18} className="text-accent" /> 3. Redacción del Mensaje
              </div>

              <div className="form-group">
                <label className="form-label">Asunto del Correo (Subject)</label>
                <input
                  className="form-input"
                  value={asunto}
                  onChange={e => setAsunto(e.target.value)}
                  placeholder="Ej: ✨ Promoción Exclusiva en Diogo Studio..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Título Principal del Correo (Encabezado)</label>
                <input
                  className="form-input"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ej: Sesiones Especiales de Temporada"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuerpo del Mensaje (Párrafos)</label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  value={contenido}
                  onChange={e => setContenido(e.target.value)}
                  placeholder="Escribe el mensaje de tu correo aquí..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Texto del Botón (CTA)</label>
                  <input
                    className="form-input"
                    value={botonTexto}
                    onChange={e => setBotonTexto(e.target.value)}
                    placeholder="Ej: Reservar Mi Sesión"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Enlace del Botón (URL / WhatsApp)</label>
                  <input
                    className="form-input"
                    value={botonUrl}
                    onChange={e => setBotonUrl(e.target.value)}
                    placeholder="https://wa.me/..."
                  />
                </div>
              </div>
            </div>

            {/* Enviar Prueba y Enviar Campaña */}
            <div className="card" style={{ border: '1px solid rgba(217, 119, 6, 0.3)' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', marginBottom: 12 }}>
                <Send size={18} className="text-accent" /> 4. Enviar Campaña
              </div>

              {/* Envío de prueba */}
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <label className="form-label">Enviar prueba a mi correo:</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                  >
                    <Send size={14} /> {sendingTest ? 'Enviando...' : 'Probar'}
                  </button>
                </div>
              </div>

              {/* Botón Masivo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f3f4f6' }}>
                    Audiencia: {currentAudienceInfo?.label}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {currentAudienceInfo?.count || 0} destinatario(s) recibirán este correo
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleSendCampaign}
                  disabled={sendingCampaign || (currentAudienceInfo?.count || 0) === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: '0.95rem' }}
                >
                  <Send size={16} /> {sendingCampaign ? 'Enviando Campaña...' : `Enviar a ${currentAudienceInfo?.count || 0} Clientes`}
                </button>
              </div>
            </div>

          </div>

          {/* Columna Derecha: Vista Previa en Vivo (Live Preview) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#f3f4f6' }}>
                <Eye size={18} className="text-accent" /> Vista Previa en Vivo
              </div>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Renderizado HTML responsivo</span>
            </div>

            <div style={{
              background: '#0b0f19',
              border: '1px solid #1f2937',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              minHeight: '480px'
            }}>
              {previewHtml ? (
                <iframe
                  title="Email Preview"
                  srcDoc={previewHtml}
                  style={{
                    width: '100%',
                    height: '620px',
                    border: 'none',
                    background: '#0b0f19'
                  }}
                />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  Generando vista previa...
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Historial de Campañas */
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <History size={18} className="text-accent" /> Historial de Campañas Realizadas
          </div>

          {campaigns.length === 0 ? (
            <div className="no-data">No se han registrado envíos de campañas aún</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Título & Asunto</th>
                    <th>Audiencia</th>
                    <th>Destinatarios</th>
                    <th>Estado</th>
                    <th>Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id}>
                      <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                        {new Date(c.fecha_envio).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{c.titulo}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>{c.asunto}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                          {c.audiencia === 'all' ? 'Todos' : (c.audiencia === 'vip' ? 'VIP' : (c.audiencia === 'special_dates' ? 'Fechas Especiales' : c.audiencia))}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {c.destinatarios_count}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: c.estado === 'enviado' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: c.estado === 'enviado' ? '#22c55e' : '#fbbf24',
                          border: `1px solid ${c.estado === 'enviado' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          textTransform: 'capitalize'
                        }}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        {c.proveedor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

