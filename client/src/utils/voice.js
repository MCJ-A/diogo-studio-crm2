// Asistente de Voz Inteligente (TTS & Dictado por Voz STT) para Diogo Studio

export function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeaking() {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel()
  }
}

export function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!isTTSSupported()) {
    if (onError) onError('Tu navegador no soporta lectura por voz (TTS).')
    return false
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'es-ES'
  utterance.rate = 1.02
  utterance.pitch = 1.0

  const voices = window.speechSynthesis.getVoices()
  const preferredVoice =
    voices.find(v => v.lang.startsWith('es') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Microsoft'))) ||
    voices.find(v => v.lang.startsWith('es')) ||
    voices.find(v => v.lang.startsWith('pt'))

  if (preferredVoice) {
    utterance.voice = preferredVoice
  }

  utterance.onstart = () => {
    if (onStart) onStart()
  }
  utterance.onend = () => {
    if (onEnd) onEnd()
  }
  utterance.onerror = (e) => {
    if (onEnd) onEnd()
    if (onError && e.error !== 'canceled') onError('Error al reproducir voz')
  }

  window.speechSynthesis.speak(utterance)
  return true
}

const fmtDateSpoken = (d) => {
  if (!d) return ''
  const dateObj = new Date(d.includes('T') ? d : d + 'T00:00:00')
  if (isNaN(dateObj.getTime())) return d
  return dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function buildDailyBriefingSpeech({ bookings = [], calendarNotes = [], alerts = [] }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const nextWeekDate = new Date()
  nextWeekDate.setDate(nextWeekDate.getDate() + 14)
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0]

  const parts = ['Hola Diogo. Aquí tienes el resumen operativo de tu estudio.']

  // 1. Sesiones de hoy
  const todayBookings = bookings.filter(b => b.fecha_sesion === todayStr && b.estado !== 'Cancelada')
  if (todayBookings.length > 0) {
    parts.push(`Para hoy tienes ${todayBookings.length} ${todayBookings.length === 1 ? 'sesión programada' : 'sesiones programadas'}.`)
    todayBookings.forEach(b => {
      const cname = b.nombre_cliente || b.cliente_nombre || 'Cliente'
      const sname = b.nombre_servicio || b.servicio_nombre || 'sesión'
      const hora = b.hora_sesion || '10:00'
      parts.push(`A las ${hora}, ${sname} con ${cname} en ${b.ubicacion || 'el estudio central'}.`)
    })
  } else {
    parts.push('Hoy no tienes sesiones de rodaje programadas.')
  }

  // 2. Días marcados / Recordatorios anti-olvido pendientes
  const pendingNotes = calendarNotes.filter(n => !n.completado)
  if (pendingNotes.length > 0) {
    parts.push(`Atención a tus fechas marcadas y recordatorios para que no se te pase nada: tienes ${pendingNotes.length} ${pendingNotes.length === 1 ? 'fecha marcada pendiente' : 'fechas marcadas pendientes'}.`)
    pendingNotes.slice(0, 4).forEach(n => {
      const fText = n.fecha === todayStr ? 'para hoy' : `para el ${fmtDateSpoken(n.fecha)}`
      const tipoLabel = n.tipo === 'bloqueo' ? 'Día bloqueado' : n.tipo === 'pre_reserva' ? 'Pre-reserva tentativa' : n.tipo === 'entrega' ? 'Entrega programada' : 'Recordatorio'
      parts.push(`${tipoLabel} ${fText} a las ${n.hora || '09:00'}: ${n.titulo}. ${n.notas ? n.notas : ''}`)
    })
  }

  // 3. Próximas sesiones agendadas
  const upcomingBookings = bookings
    .filter(b => b.fecha_sesion > todayStr && b.fecha_sesion <= nextWeekStr && b.estado === 'Agendada')
    .sort((a, b) => (a.fecha_sesion || '').localeCompare(b.fecha_sesion || ''))

  if (upcomingBookings.length > 0) {
    parts.push(`En los próximos días tienes ${upcomingBookings.length} ${upcomingBookings.length === 1 ? 'sesión agendada' : 'sesiones agendadas'}.`)
    upcomingBookings.slice(0, 3).forEach(b => {
      const cname = b.nombre_cliente || b.cliente_nombre || 'Cliente'
      parts.push(`El ${fmtDateSpoken(b.fecha_sesion)} a las ${b.hora_sesion || '10:00'} con ${cname}.`)
    })
  }

  // 4. Alertas operativas (contratos o cobros)
  if (alerts && alerts.length > 0) {
    parts.push(`Por último, recuerda revisar ${alerts.length} ${alerts.length === 1 ? 'alerta operativa pendiente' : 'alertas operativas pendientes'} de contrato o saldo por liquidar.`)
  }

  parts.push('Que tengas una excelente jornada en el atelier.')
  return parts.join(' ')
}

export function buildSessionBriefingSpeech(booking, dayNotes = []) {
  if (!booking) return ''
  const cname = booking.nombre_cliente || booking.cliente_nombre || 'Cliente'
  const sname = booking.nombre_servicio || booking.servicio_nombre || 'Sesión fotográfica'
  const fText = fmtDateSpoken(booking.fecha_sesion)
  const hora = booking.hora_sesion || '10:00'
  const ubic = booking.ubicacion || 'Estúdio Central Diogo'

  const parts = [
    `Ficha de rodaje para ${cname}.`,
    `Servicio: ${sname}, programado el ${fText} a las ${hora} horas en ${ubic}.`,
    booking.contrato_firmado ? 'El contrato legal ya está firmado.' : 'Atención: el contrato legal aún está pendiente de firma.',
    booking.autoriza_redes_sociales ? 'El cliente autoriza publicar las fotografías en Instagram y portafolio.' : 'Atención confidencialidad: no publicar fotografías en redes sociales.'
  ]

  if (booking.cliente_notas_estilo) {
    parts.push(`Estilo y preferencias del cliente: ${booking.cliente_notas_estilo}.`)
  }
  if (booking.notas_internas) {
    parts.push(`Notas internas del rodaje: ${booking.notas_internas}.`)
  }

  const sameDayNotes = dayNotes.filter(n => n.fecha === booking.fecha_sesion && !n.completado)
  if (sameDayNotes.length > 0) {
    parts.push(`Además, en esta misma fecha tienes marcado: ${sameDayNotes.map(n => n.titulo).join(', ')}.`)
  }

  return parts.join(' ')
}

export function isSTTSupported() {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
}

export function startVoiceDictation({ onResult, onError, onEnd } = {}) {
  if (!isSTTSupported()) {
    if (onError) onError('Tu navegador no soporta dictado por voz. Usa Chrome, Edge o Safari.')
    return null
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.lang = 'es-ES'
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || ''
    if (transcript && onResult) onResult(transcript)
  }
  recognition.onerror = (event) => {
    if (onError) onError(`Error de micrófono: ${event.error}`)
  }
  recognition.onend = () => {
    if (onEnd) onEnd()
  }

  recognition.start()
  return recognition
}
