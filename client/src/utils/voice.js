// Assistente de Voz Inteligente (TTS & Ditado por Voz STT) para Diogo Studio (Portugal)

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
    if (onError) onError('O seu navegador não suporta leitura por voz (TTS).')
    return false
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'pt-PT'
  utterance.rate = 1.02
  utterance.pitch = 1.0

  const voices = window.speechSynthesis.getVoices()
  const preferredVoice =
    voices.find(v => (v.lang === 'pt-PT' || v.lang.startsWith('pt')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Portugal') || v.name.includes('Microsoft'))) ||
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
    if (onError && e.error !== 'canceled') onError('Erro ao reproduzir voz')
  }

  window.speechSynthesis.speak(utterance)
  return true
}

const fmtDateSpoken = (d) => {
  if (!d) return ''
  const dateObj = new Date(d.includes('T') ? d : d + 'T00:00:00')
  if (isNaN(dateObj.getTime())) return d
  return dateObj.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function buildDailyBriefingSpeech({ bookings = [], calendarNotes = [], alerts = [] }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const nextWeekDate = new Date()
  nextWeekDate.setDate(nextWeekDate.getDate() + 14)
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0]

  const parts = ['Olá Diogo. Aqui tens o resumo operacional do teu atelier.']

  // 1. Sessões de hoje
  const todayBookings = bookings.filter(b => b.fecha_sesion === todayStr && b.estado !== 'Cancelada')
  if (todayBookings.length > 0) {
    parts.push(`Para hoje tens ${todayBookings.length} ${todayBookings.length === 1 ? 'sessão agendada' : 'sessões agendadas'}.`)
    todayBookings.forEach(b => {
      const cname = b.nombre_cliente || b.cliente_nombre || 'Cliente'
      const sname = b.nombre_servicio || b.servicio_nombre || 'sessão'
      const hora = b.hora_sesion || '10:00'
      parts.push(`Às ${hora}, ${sname} com ${cname} em ${b.ubicacion || 'o estúdio central'}.`)
    })
  } else {
    parts.push('Hoje não tens sessões de estúdio agendadas.')
  }

  // 2. Datas marcadas / Lembretes anti-esquecimento
  const pendingNotes = calendarNotes.filter(n => !n.completado)
  if (pendingNotes.length > 0) {
    parts.push(`Atenção às tuas datas marcadas e lembretes para não esqueceres nada: tens ${pendingNotes.length} ${pendingNotes.length === 1 ? 'marcação pendente' : 'marcações pendentes'}.`)
    pendingNotes.slice(0, 4).forEach(n => {
      const fText = n.fecha === todayStr ? 'para hoje' : `para ${fmtDateSpoken(n.fecha)}`
      const tipoLabel = n.tipo === 'bloqueo' ? 'Dia bloqueado' : n.tipo === 'pre_reserva' ? 'Pré-reserva' : n.tipo === 'entrega' ? 'Entrega agendada' : 'Lembrete'
      parts.push(`${tipoLabel} ${fText} às ${n.hora || '09:00'}: ${n.titulo}. ${n.notas ? n.notas : ''}`)
    })
  }

  // 3. Próximas sessões agendadas
  const upcomingBookings = bookings
    .filter(b => b.fecha_sesion > todayStr && b.fecha_sesion <= nextWeekStr && b.estado === 'Agendada')
    .sort((a, b) => (a.fecha_sesion || '').localeCompare(b.fecha_sesion || ''))

  if (upcomingBookings.length > 0) {
    parts.push(`Nos próximos dias tens ${upcomingBookings.length} ${upcomingBookings.length === 1 ? 'sessão agendada' : 'sessões agendadas'}.`)
    upcomingBookings.slice(0, 3).forEach(b => {
      const cname = b.nombre_cliente || b.cliente_nombre || 'Cliente'
      parts.push(`A ${fmtDateSpoken(b.fecha_sesion)} às ${b.hora_sesion || '10:00'} com ${cname}.`)
    })
  }

  // 4. Alertas operacionais
  if (alerts && alerts.length > 0) {
    parts.push(`Por fim, revê ${alerts.length} ${alerts.length === 1 ? 'alerta operacional pendente' : 'alertas operacionais pendentes'} de contrato ou saldo por liquidar.`)
  }

  parts.push('Tem uma excelente jornada de trabalho no atelier.')
  return parts.join(' ')
}

export function buildSessionBriefingSpeech(booking, dayNotes = []) {
  if (!booking) return ''
  const cname = booking.nombre_cliente || booking.cliente_nombre || 'Cliente'
  const sname = booking.nombre_servicio || booking.servicio_nombre || 'Sessão fotográfica'
  const fText = fmtDateSpoken(booking.fecha_sesion)
  const hora = booking.hora_sesion || '10:00'
  const ubic = booking.ubicacion || 'Estúdio Central Diogo'

  const parts = [
    `Ficha de sessão para ${cname}.`,
    `Serviço: ${sname}, agendado para ${fText} às ${hora} horas em ${ubic}.`,
    booking.contrato_firmado ? 'O contrato legal já se encontra assinado.' : 'Atenção: o contrato legal ainda está pendente de assinatura.',
    booking.autoriza_redes_sociales ? 'O cliente autoriza a publicação de fotografias no Instagram e portfólio.' : 'Atenção confidencialidade: não publicar fotografias nas redes sociais.'
  ]

  if (booking.cliente_notas_estilo) {
    parts.push(`Estilo e preferências do cliente: ${booking.cliente_notas_estilo}.`)
  }
  if (booking.notas_internas) {
    parts.push(`Notas internas da produção: ${booking.notas_internas}.`)
  }

  const sameDayNotes = dayNotes.filter(n => n.fecha === booking.fecha_sesion && !n.completado)
  if (sameDayNotes.length > 0) {
    parts.push(`Além disso, nesta mesma data tens marcado: ${sameDayNotes.map(n => n.titulo).join(', ')}.`)
  }

  return parts.join(' ')
}

export function isSTTSupported() {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
}

export function startVoiceDictation({ onResult, onError, onEnd } = {}) {
  if (!isSTTSupported()) {
    if (onError) onError('O seu navegador não suporta ditado por voz. Recomendamos Google Chrome, Safari ou Edge.')
    return null
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.lang = 'pt-PT'
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || ''
    if (transcript && onResult) onResult(transcript)
  }
  recognition.onerror = (event) => {
    if (onError) onError(`Erro de microfone: ${event.error}`)
  }
  recognition.onend = () => {
    if (onEnd) onEnd()
  }

  recognition.start()
  return recognition
}
