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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Mail className="w-6 h-6 text-amber-500" />
            <span>Campañas & Newsletter</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Envío de promociones y boletines de alta fidelidad con diseño editorial
          </p>
        </div>

        {/* Status Badge */}
        {status && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            status.configured
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {status.configured ? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            <span>{status.message}</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-3 border transition-all ${
          feedback.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {feedback.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/[0.08] pb-3">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'compose'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          onClick={() => setActiveTab('compose')}
        >
          <Send className="w-4 h-4" /> Redactar Campaña
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-4 h-4" /> Historial de Envíos ({campaigns.length})
        </button>
      </div>

      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Controls */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Audiencia */}
            <div className="bg-[#111622]/90 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                <Users className="w-4 h-4 text-amber-500" />
                <span>1. Selecciona la Audiencia Objetivo</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {audiences && [
                  { key: 'all', icon: <Users className="w-4 h-4" />, label: 'Todos', count: audiences.all?.count || 0 },
                  { key: 'vip', icon: <Award className="w-4 h-4" />, label: 'VIPs', count: audiences.vip?.count || 0 },
                  { key: 'special_dates', icon: <Heart className="w-4 h-4" />, label: 'Fechas Esp.', count: audiences.special_dates?.count || 0 },
                  { key: 'inactive', icon: <Clock className="w-4 h-4" />, label: 'Inactivos', count: audiences.inactive?.count || 0 }
                ].map(aud => {
                  const isSel = selectedAudience === aud.key
                  return (
                    <button
                      key={aud.key}
                      type="button"
                      onClick={() => setSelectedAudience(aud.key)}
                      className={`p-3.5 rounded-xl text-left border transition-all ${
                        isSel
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/10'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isSel ? 'text-amber-400' : 'text-slate-400'}`}>
                        {aud.icon} {aud.label}
                      </div>
                      <div className="text-lg font-bold text-white mt-1">
                        {aud.count} <span className="text-xs font-normal text-slate-400">dest.</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Plantillas Rápidas */}
            <div className="bg-[#111622]/90 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>2. Cargar Plantilla Editorial</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Redacción del Mensaje */}
            <div className="bg-[#111622]/90 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Edit className="w-4 h-4 text-amber-500" />
                <span>3. Redacción del Mensaje</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Asunto del Correo (Subject)
                </label>
                <input
                  className="w-full bg-[#0b0f19] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  value={asunto}
                  onChange={e => setAsunto(e.target.value)}
                  placeholder="Ej: ✨ Promoción Exclusiva en Diogo Studio..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Título Principal del Correo
                </label>
                <input
                  className="w-full bg-[#0b0f19] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ej: Sesiones Especiales de Temporada"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Cuerpo del Mensaje
                </label>
                <textarea
                  className="w-full bg-[#0b0f19] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors leading-relaxed"
                  rows={6}
                  value={contenido}
                  onChange={e => setContenido(e.target.value)}
                  placeholder="Escribe el contenido de tu boletín aquí..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Texto del Botón (CTA)
                  </label>
                  <input
                    className="w-full bg-[#0b0f19] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                    value={botonTexto}
                    onChange={e => setBotonTexto(e.target.value)}
                    placeholder="Ej: Reservar Mi Sesión"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Enlace del Botón (URL / WhatsApp)
                  </label>
                  <input
                    className="w-full bg-[#0b0f19] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                    value={botonUrl}
                    onChange={e => setBotonUrl(e.target.value)}
                    placeholder="https://wa.me/..."
                  />
                </div>
              </div>
            </div>

            {/* 4. Enviar Prueba y Enviar Campaña */}
            <div className="bg-[#111622]/90 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Send className="w-4 h-4 text-amber-500" />
                <span>4. Despacho de Campaña</span>
              </div>

              {/* Envío de prueba */}
              <div className="pb-4 border-b border-white/[0.08]">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Enviar prueba directa a mi correo:
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-[#0b0f19] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-white hover:bg-white/[0.1] transition-all flex items-center gap-1.5 disabled:opacity-50"
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
                  >
                    <Send className="w-3.5 h-3.5" /> {sendingTest ? 'Enviando...' : 'Probar'}
                  </button>
                </div>
              </div>

              {/* Botón Masivo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Audiencia: {currentAudienceInfo?.label || 'Todos'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {currentAudienceInfo?.count || 0} destinatario(s) elegible(s) para este envío
                  </div>
                </div>

                <button
                  type="button"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                  onClick={handleSendCampaign}
                  disabled={sendingCampaign || (currentAudienceInfo?.count || 0) === 0}
                >
                  <Send className="w-4 h-4" /> {sendingCampaign ? 'Enviando Campaña...' : `Enviar a ${currentAudienceInfo?.count || 0} Clientes`}
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Live Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Eye className="w-4 h-4 text-amber-500" />
                <span>Vista Previa en Tiempo Real</span>
              </div>
              <span className="text-xs text-slate-400">Renderizado responsivo</span>
            </div>

            <div className="bg-[#0b0f19] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
              {previewHtml ? (
                <iframe
                  title="Email Preview"
                  srcDoc={previewHtml}
                  className="w-full h-[640px] border-none bg-[#0b0f19]"
                />
              ) : (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Generando vista previa...
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Historial de Campañas */
        <div className="bg-[#111622]/90 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 text-base font-semibold text-white mb-4">
            <History className="w-4 h-4 text-amber-500" />
            <span>Registro Histórico de Campañas</span>
          </div>

          {campaigns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No se han registrado envíos de campañas aún
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-4">Fecha</th>
                    <th className="pb-3 px-4">Título & Asunto</th>
                    <th className="pb-3 px-4">Audiencia</th>
                    <th className="pb-3 px-4">Destinatarios</th>
                    <th className="pb-3 px-4">Estado</th>
                    <th className="pb-3 px-4">Proveedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {campaigns.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {new Date(c.fecha_envio).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{c.titulo}</div>
                        <div className="text-xs text-slate-400 truncate max-w-xs">{c.asunto}</div>
                      </td>
                      <td className="py-3 px-4 text-xs capitalize text-slate-300">
                        {c.audiencia === 'all' ? 'Todos' : (c.audiencia === 'vip' ? 'VIP' : (c.audiencia === 'special_dates' ? 'Fechas Especiales' : c.audiencia))}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {c.destinatarios_count}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
                          c.estado === 'enviado'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs uppercase text-slate-400 font-mono">
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

