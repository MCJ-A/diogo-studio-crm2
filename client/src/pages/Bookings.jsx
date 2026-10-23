import { useState, useEffect, useRef } from 'react'
import { 
  Calendar, Users, Camera, Edit, MapPin, CheckCircle, Clock, Save, 
  XCircle, ChevronRight, ChevronLeft, FileText, FileSignature, CheckSquare, 
  MessageCircle, AlertTriangle, Plus, Printer, ExternalLink, 
  Sparkles, DollarSign, ArrowRight, ShieldCheck, PhoneCall,
  PackageCheck, RefreshCw, Download, Send, Layers, Image as ImageIcon,
  UserPlus, Volume2, VolumeX, Mic, Bookmark, Bell, List, Trash2
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { formatWhatsAppUrl } from '../utils/whatsapp'
import { 
  speakText, stopSpeaking, buildDailyBriefingSpeech, 
  buildSessionBriefingSpeech, startVoiceDictation 
} from '../utils/voice'

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0)
const fmtDate = d => {
  if (!d) return '—'
  const dateObj = new Date(d.includes('T') ? d : d + 'T00:00:00')
  return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ESTADOS = [
  { id: '', label: 'Todos los estados' },
  { id: 'Agendada', label: 'Agendada' },
  { id: 'Realizada', label: 'Realizada' },
  { id: 'Seleccion_pendiente', label: 'Selección' },
  { id: 'En_edicion', label: 'En Edición' },
  { id: 'Entregada', label: 'Entregada' },
  { id: 'Cancelada', label: 'Cancelada' }
]

const PIPELINE_STEPS = [
  { id: 'Agendada', label: 'Agendada' },
  { id: 'Realizada', label: 'Realizada' },
  { id: 'Seleccion_pendiente', label: 'Selección' },
  { id: 'En_edicion', label: 'En Edición' },
  { id: 'Entregada', label: 'Entregada' }
]

const EMPTY_BOOKING = {
  id_cliente: '', id_servicio: '', fecha_sesion: '', hora_sesion: '10:00', ubicacion: 'Estúdio Central Diogo, Lisboa',
  contrato_firmado: false, notas_internas: '', isFastNewClient: false,
  fastNombre: '', fastTelefono: '', fastEmail: ''
}

const EMPTY_NOTE = {
  fecha: new Date().toISOString().split('T')[0],
  hora: '10:00',
  titulo: '',
  tipo: 'recordatorio',
  prioridad: 'alta',
  notas: ''
}

const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'DS'
}

export default function Bookings() {
  const detailRef = useRef(null)
  const [bookings, setBookings] = useState([])
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [calendarNotes, setCalendarNotes] = useState([])
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'list'
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date().toISOString().split('T')[0])
  const [showMarkDateModal, setShowMarkDateModal] = useState(false)
  const [newNoteForm, setNewNoteForm] = useState(EMPTY_NOTE)
  const [speaking, setSpeaking] = useState(false)
  const [dictatingField, setDictatingField] = useState(null)

  const [selected, setSelected] = useState(null)
  const [filterEstado, setFilterEstado] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newBooking, setNewBooking] = useState(EMPTY_BOOKING)
  const [creating, setCreating] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/bookings').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/services').then(r => r.json()),
      fetch('/api/bookings/calendar-notes').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([bd, cd, sd, nd]) => {
      const bArr = Array.isArray(bd) ? bd : bd.bookings || []
      setBookings(bArr)
      setClients(Array.isArray(cd) ? cd : cd.clients || [])
      setServices(Array.isArray(sd) ? sd : sd.services || [])
      setCalendarNotes(Array.isArray(nd) ? nd : [])
      if (bArr.length > 0 && !selected) {
        setSelected(bArr[0])
        if (bArr[0].fecha_sesion) {
          const dStr = bArr[0].fecha_sesion.split('T')[0]
          setSelectedCalendarDate(dStr)
        }
      }
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false))

    return () => stopSpeaking()
  }, [])

  const refetchCalendarNotes = async () => {
    try {
      const res = await fetch('/api/bookings/calendar-notes')
      if (res.ok) {
        const data = await res.json()
        setCalendarNotes(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateCalendarNote = async () => {
    if (!newNoteForm.fecha || !newNoteForm.titulo.trim()) {
      setError('Fecha y título son obligatorios para marcar una fecha')
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch('/api/bookings/calendar-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNoteForm)
      })
      if (!res.ok) throw new Error('Error al guardar fecha marcada')
      await refetchCalendarNotes()
      setSelectedCalendarDate(newNoteForm.fecha)
      setShowMarkDateModal(false)
      setNewNoteForm(EMPTY_NOTE)
      setSuccessMsg('📌 Fecha marcada y recordatorio activado en el Radar Anti-Olvido')
      setTimeout(() => setSuccessMsg(null), 3500)
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleCalendarNote = async (note) => {
    try {
      await fetch(`/api/bookings/calendar-notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completado: !note.completado })
      })
      await refetchCalendarNotes()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteCalendarNote = async (id) => {
    try {
      await fetch(`/api/bookings/calendar-notes/${id}`, { method: 'DELETE' })
      await refetchCalendarNotes()
    } catch (e) {
      console.error(e)
    }
  }

  const handleSpeakDailyBriefing = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    const text = buildDailyBriefingSpeech({ bookings, calendarNotes })
    speakText(text, {
      lang: 'es-ES',
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    })
  }

  const handleSpeakSessionBriefing = (booking) => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    const text = buildSessionBriefingSpeech(booking)
    speakText(text, {
      lang: 'es-ES',
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    })
  }

  const handleDictate = (fieldTarget) => {
    if (dictatingField) return
    setDictatingField(fieldTarget)
    startVoiceDictation({
      lang: 'es-ES',
      onResult: (transcript) => {
        if (fieldTarget === 'detailNotes') {
          setEditingNotes(true)
          setNotesVal(prev => (prev ? `${prev} ${transcript}` : transcript))
        } else if (fieldTarget === 'newBookingNotes') {
          setNewBooking(prev => ({
            ...prev,
            notas_internas: prev.notas_internas ? `${prev.notas_internas} ${transcript}` : transcript
          }))
        } else if (fieldTarget === 'markDateTitle') {
          setNewNoteForm(prev => ({
            ...prev,
            titulo: prev.titulo ? `${prev.titulo} ${transcript}` : transcript
          }))
        } else if (fieldTarget === 'markDateNotes') {
          setNewNoteForm(prev => ({
            ...prev,
            notas: prev.notas ? `${prev.notas} ${transcript}` : transcript
          }))
        }
      },
      onEnd: () => setDictatingField(null),
      onError: (msg) => {
        setDictatingField(null)
        setError(msg)
        setTimeout(() => setError(null), 3500)
      }
    })
  }

  const refetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings')
      const data = await res.json()
      const arr = Array.isArray(data) ? data : data.bookings || []
      setBookings(arr)
      if (selected) {
        const updated = arr.find(b => (b.id_reserva || b.id) === (selected.id_reserva || selected.id))
        if (updated) setSelected(updated)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const updateEstado = async (id, estado, extra = {}) => {
    setActionLoading(true)
    try {
      const bId = id || selected?.id_reserva || selected?.id
      const res = await fetch(`/api/bookings/${bId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado,
          razon_cancelacion: extra.motivo_cancelacion || extra.razon_cancelacion,
          ...extra
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || err.message || 'Error al actualizar estado')
      }
      await refetchBookings()
      setSuccessMsg(`Estado actualizado a: ${estado.replace('_', ' ')}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 4000)
    } finally {
      setActionLoading(false)
    }
  }

  const updateBookingField = async (id, fields) => {
    setActionLoading(true)
    try {
      const bId = id || selected?.id_reserva || selected?.id
      const res = await fetch(`/api/bookings/${bId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar reserva')
      }
      await refetchBookings()
      setSuccessMsg('Reserva actualizada')
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 3500)
    } finally {
      setActionLoading(false)
    }
  }

  const updateContrato = async (id, val) => {
    await updateBookingField(id, { contrato_firmado: val })
  }

  const handleSaveNotes = async () => {
    const bId = activeFocusBooking?.id_reserva || activeFocusBooking?.id
    if (!bId) return
    await updateBookingField(bId, { notas_internas: notesVal })
    setEditingNotes(false)
  }

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const serviceId = parseInt(newBooking.id_servicio || newBooking.service_id)
      if (!serviceId) throw new Error('Selecciona un servicio fotográfico')
      if (!newBooking.fecha_sesion) throw new Error('Indica la fecha de la sesión')

      const bodyPayload = {
        service_id: serviceId,
        id_servicio: serviceId,
        fecha_sesion: newBooking.fecha_sesion,
        hora_sesion: newBooking.hora_sesion || '10:00',
        ubicacion: newBooking.ubicacion || 'Estudio Central',
        contrato_firmado: !!newBooking.contrato_firmado,
        notas_internas: newBooking.notas_internas || ''
      }

      if (newBooking.isFastNewClient) {
        if (!newBooking.fastNombre.trim()) {
          throw new Error('El nombre del nuevo cliente es obligatorio')
        }
        bodyPayload.nuevo_cliente = {
          nombre: newBooking.fastNombre.trim(),
          telefono: newBooking.fastTelefono.trim(),
          email: newBooking.fastEmail.trim()
        }
      } else {
        const clientId = parseInt(newBooking.id_cliente || newBooking.client_id)
        if (!clientId) throw new Error('Selecciona un cliente o usa creación rápida')
        bodyPayload.client_id = clientId
        bodyPayload.id_cliente = clientId
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear reserva')
      }
      
      await Promise.all([
        refetchBookings(),
        fetch('/api/clients').then(r => r.json()).then(cd => setClients(Array.isArray(cd) ? cd : cd.clients || []))
      ])

      setNewBooking(EMPTY_BOOKING)
      setShowModal(false)
      setSuccessMsg('Reserva creada exitosamente con beneficios aplicados')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const exportCSV = () => {
    if (bookings.length === 0) return
    const headers = ['ID Reserva', 'Cliente', 'WhatsApp', 'Servicio', 'Fecha Sesión', 'Ubicación', 'Estado', 'Monto', 'Contrato Firmado']
    const rows = bookings.map(b => [
      `"#RES-${b.id_reserva || b.id}"`,
      `"${b.nombre_cliente || b.cliente_nombre || ''}"`,
      `"${b.telefono_cliente || b.cliente_telefono || ''}"`,
      `"${b.nombre_servicio || b.servicio_nombre || ''}"`,
      b.fecha_sesion || '',
      `"${b.ubicacion || 'Estudio Central'}"`,
      b.estado || 'Agendada',
      b.monto_bruto || 0,
      b.contrato_firmado ? 'SÍ' : 'NO'
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `reservas_diogo_atelier_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Métricas
  const activasCount = bookings.filter(b => ['Agendada', 'Realizada', 'Seleccion_pendiente', 'En_edicion'].includes(b.estado)).length
  const porEntregarCount = bookings.filter(b => b.estado === 'En_edicion').length
  const agendadasCount = bookings.filter(b => b.estado === 'Agendada').length
  const entregadasCount = bookings.filter(b => b.estado === 'Entregada').length

  const filtered = bookings.filter(b => {
    const matchesEstado = filterEstado ? b.estado?.toLowerCase() === filterEstado.toLowerCase() : true
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch = !term || (
      (b.nombre_cliente || b.cliente_nombre || '').toLowerCase().includes(term) ||
      (b.nombre_servicio || b.servicio_nombre || '').toLowerCase().includes(term) ||
      (b.ubicacion || '').toLowerCase().includes(term)
    )
    return matchesEstado && matchesSearch
  })

  const getWhatsAppReminderUrl = (booking) => {
    if (!booking) return null
    const clientName = (booking?.nombre_cliente || booking?.cliente_nombre || 'Estimado/a').split(' ')[0]
    const dateStr = fmtDate(booking?.fecha_sesion)
    const timeStr = booking?.hora_sesion ? ` a las ${booking.hora_sesion}` : ''
    const serviceName = booking?.nombre_servicio || booking?.servicio_nombre || 'tu sesión'
    const msg = `¡Hola ${clientName}! ✨ Te saludamos desde Diogo Studio. Te enviamos este recordatorio de tu sesión fotográfica (${serviceName}) programada para el ${dateStr}${timeStr}. ¿Todo listo para tu experiencia en el atelier? 📸`
    return formatWhatsAppUrl(booking?.telefono_cliente || booking?.cliente_telefono, msg)
  }

  // Primer elemento activo si no hay seleccionado
  const activeFocusBooking = selected || (bookings.length > 0 ? bookings[0] : null)

  useEffect(() => {
    if (activeFocusBooking) {
      setNotesVal(activeFocusBooking.notas_internas || '')
      setEditingNotes(false)
    }
  }, [activeFocusBooking?.id_reserva, activeFocusBooking?.id])

  // Calendar Helpers
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const monthLabel = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const firstDayOfMonth = new Date(year, month, 1)
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayIso = new Date().toISOString().split('T')[0]

  const calendarCells = []
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push({ empty: true, key: `empty-${i}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayBookings = filtered.filter(b => (b.fecha_sesion || '').split('T')[0] === iso)
    const dayNotes = calendarNotes.filter(n => (n.fecha || '').split('T')[0] === iso)
    calendarCells.push({
      empty: false,
      day: d,
      iso,
      isToday: iso === todayIso,
      isSelected: iso === selectedCalendarDate,
      bookings: dayBookings,
      notes: dayNotes
    })
  }

  const selectedDayBookings = bookings.filter(b => (b.fecha_sesion || '').split('T')[0] === selectedCalendarDate)
  const selectedDayNotes = calendarNotes.filter(n => (n.fecha || '').split('T')[0] === selectedCalendarDate)
  const pendingNotes = calendarNotes.filter(n => !n.completado)

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div className="bookings-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Top Header & Season Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
            Agenda & Reservas
          </h1>
          <span style={{
            fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '3px 10px', borderRadius: 20, background: '#282a30',
            color: '#e8b072', fontWeight: 700
          }}>
            Atelier Portugal
          </span>

          {/* View Mode Switcher: Calendario vs Lista */}
          <div style={{
            display: 'inline-flex', background: '#131B2A', padding: 3, borderRadius: 10,
            border: '1px solid #282f42', marginLeft: 4
          }}>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                background: viewMode === 'calendar' ? '#e8b072' : 'transparent',
                color: viewMode === 'calendar' ? '#482900' : '#94A3B8',
                transition: 'all 0.15s ease'
              }}
            >
              <Calendar size={14} /> Calendario
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                background: viewMode === 'list' ? '#e8b072' : 'transparent',
                color: viewMode === 'list' ? '#482900' : '#94A3B8',
                transition: 'all 0.15s ease'
              }}
            >
              <List size={14} /> Lista
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* TTS Audio Briefing Button */}
          <button
            type="button"
            onClick={handleSpeakDailyBriefing}
            title="Escuchar resumen hablado de tu agenda y fechas marcadas (Manos libres)"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 13px',
              background: speaking ? 'rgba(239, 68, 68, 0.18)' : '#191b22',
              color: speaking ? '#f87171' : '#e8b072',
              border: speaking ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(232, 176, 114, 0.35)',
              borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{speaking ? 'Detener Voz' : 'Escuchar Agenda'}</span>
          </button>

          {/* Marcar Fecha X / Recordatorio Anti-Olvido */}
          <button
            type="button"
            onClick={() => {
              setNewNoteForm({ ...EMPTY_NOTE, fecha: selectedCalendarDate || todayIso })
              setShowMarkDateModal(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 13px', background: '#1e222e', color: '#F8FAFC',
              border: '1px solid #3b4257', borderRadius: 8, fontSize: '0.82rem',
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Bookmark size={16} style={{ color: '#F5B955' }} />
            <span>+ Marcar Fecha</span>
          </button>

          {/* Nueva Reserva */}
          <button 
            onClick={() => {
              setNewBooking({ ...EMPTY_BOOKING, fecha_sesion: selectedCalendarDate || todayIso })
              setShowModal(true)
            }} 
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#e8b072', color: '#482900',
              border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 0 16px rgba(232,176,114,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={18} /> Nueva Reserva
          </button>
        </div>
      </div>

      {error && <div className="alert-danger-card">{error}</div>}
      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8, padding: '12px 16px', color: '#4ade80',
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* RADAR ANTI-OLVIDO: Fechas Marcadas, Pre-Reservas & Bloqueos Activos */}
      {pendingNotes.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 34, 46, 0.95) 0%, rgba(21, 24, 33, 0.95) 100%)',
          border: '1px solid rgba(245, 185, 85, 0.35)',
          borderRadius: 14, padding: '14px 18px',
          display: 'flex', flexDirection: 'column', gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} style={{ color: '#F5B955' }} />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}>
                Radar Anti-Olvido: {pendingNotes.length} {pendingNotes.length === 1 ? 'Fecha Marcada Pendiente' : 'Fechas Marcadas Pendientes'}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                (Pre-reservas de palabra, bloqueos o entregas comprometidas)
              </span>
            </div>
            <button
              type="button"
              onClick={handleSpeakDailyBriefing}
              style={{
                background: 'rgba(245, 185, 85, 0.12)', border: '1px solid rgba(245, 185, 85, 0.3)',
                color: '#F5B955', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
              }}
            >
              <Volume2 size={13} /> Leer en voz alta
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {pendingNotes.slice(0, 4).map(note => {
              const badgeColor = note.tipo === 'bloqueo' ? '#ef4444' : (note.tipo === 'pre_reserva' ? '#F5B955' : (note.tipo === 'entrega' ? '#38bdf8' : '#a855f7'))
              const badgeLabel = note.tipo === 'bloqueo' ? '⛔ Bloqueo' : (note.tipo === 'pre_reserva' ? '⏳ Pre-Reserva' : (note.tipo === 'entrega' ? '📦 Entrega' : '📌 Recordatorio'))
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    if (note.fecha) {
                      setSelectedCalendarDate(note.fecha)
                      const d = new Date(note.fecha + 'T00:00:00')
                      if (!isNaN(d.getTime())) setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
                    }
                  }}
                  style={{
                    background: '#131722', border: '1px solid #282f42', borderLeft: `3px solid ${badgeColor}`,
                    borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: badgeColor, textTransform: 'uppercase' }}>
                      {badgeLabel} • {fmtDate(note.fecha)} {note.hora ? `(${note.hora})` : ''}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {(note.tipo === 'pre_reserva' || note.tipo === 'recordatorio') && (
                        <button
                          type="button"
                          title="Convertir en Reserva Formal"
                          onClick={() => {
                            setNewBooking({
                              ...EMPTY_BOOKING,
                              fecha_sesion: note.fecha,
                              hora_sesion: note.hora || '10:00',
                              notas_internas: `${note.titulo}${note.notas ? ' — ' + note.notas : ''}`
                            })
                            setShowModal(true)
                          }}
                          style={{
                            background: 'rgba(232,176,114,0.15)', border: 'none', color: '#e8b072',
                            borderRadius: 4, padding: '2px 6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          + Agendar
                        </button>
                      )}
                      <button
                        type="button"
                        title="Marcar como resuelto"
                        onClick={() => handleToggleCalendarNote(note)}
                        style={{
                          background: 'rgba(34,197,94,0.15)', border: 'none', color: '#4ade80',
                          borderRadius: 4, padding: '2px 6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        ✓ Hecho
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() => handleDeleteCalendarNote(note.id)}
                        style={{
                          background: 'transparent', border: 'none', color: '#64748B',
                          padding: 2, cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#F8FAFC' }}>{note.titulo}</div>
                  {note.notas && <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{note.notas}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Metric Capsules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{
          background: '#191b22', borderRadius: 14, padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid #282f42', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>En producción</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>
              {activasCount} Activas
            </span>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#282a30',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8b072'
          }}>
            <Sparkles size={22} />
          </div>
        </div>

        <div style={{
          background: '#191b22', borderRadius: 14, padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid #282f42', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Listas para envío</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F5B955', marginTop: 2 }}>
              {porEntregarCount} Por entregar
            </span>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#282a30',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5B955'
          }}>
            <PackageCheck size={22} />
          </div>
        </div>
      </div>

      {/* Interactive Filter Chips & Search Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, background: '#191b22', padding: 10, borderRadius: 12
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar sesión o cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px', width: '100%', background: '#131B2A',
              border: '1px solid #282f42', color: '#F8FAFC', borderRadius: 8, fontSize: '0.85rem'
            }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
          <button
            onClick={() => setFilterEstado('')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: filterEstado === '' ? '#e8b072' : '#282a30',
              color: filterEstado === '' ? '#482900' : '#94A3B8',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Todos ({bookings.length})
          </button>
          <button
            onClick={() => setFilterEstado('Agendada')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: filterEstado === 'Agendada' ? '#e8b072' : '#282a30',
              color: filterEstado === 'Agendada' ? '#482900' : '#94A3B8',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Agendadas ({agendadasCount})
          </button>
          <button
            onClick={() => setFilterEstado('En_edicion')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: filterEstado === 'En_edicion' ? '#e8b072' : '#282a30',
              color: filterEstado === 'En_edicion' ? '#482900' : '#94A3B8',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            En Edición ({porEntregarCount})
          </button>
          <button
            onClick={() => setFilterEstado('Entregada')}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: filterEstado === 'Entregada' ? '#e8b072' : '#282a30',
              color: filterEstado === 'Entregada' ? '#482900' : '#94A3B8',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Entregadas ({entregadasCount})
          </button>
        </div>
      </div>

      {/* Grid Principal Master-Detail 7/5 (Desktop & Responsive Mobile) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
        
        {/* PANEL IZQUIERDO: CALENDARIO INTERACTIVO O LISTA CRONOLÓGICA (7 COLS) */}
        <div style={{ gridColumn: 'span 7' }} className="bookings-table-panel">
          <div style={{ background: '#191b22', borderRadius: 14, padding: 18, border: '1px solid #282f42', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            
            {viewMode === 'calendar' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Calendar Month Navigation Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} className="text-accent" />
                    <span style={{ fontWeight: 700, fontSize: '1.08rem', color: '#F8FAFC', textTransform: 'capitalize' }}>
                      {monthLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                      style={{
                        background: '#282a30', border: '1px solid #3b4257', color: '#F8FAFC',
                        borderRadius: 8, padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                      }}
                      title="Mes anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date()
                        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                        setSelectedCalendarDate(todayIso)
                      }}
                      style={{
                        background: '#282a30', border: '1px solid #3b4257', color: '#e8b072',
                        borderRadius: 8, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                      style={{
                        background: '#282a30', border: '1px solid #3b4257', color: '#F8FAFC',
                        borderRadius: 8, padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                      }}
                      title="Mes siguiente"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Color Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: '0.72rem', color: '#94A3B8' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e8b072' }} /> Sesión Confirmada
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5B955' }} /> Pre-Reserva / Hold
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Día Bloqueado
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} /> Entrega / Recordatorio
                  </span>
                </div>

                {/* Weekday Headers */}
                <div className="atelier-calendar-grid" style={{ marginBottom: -8 }}>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dayName => (
                    <div
                      key={dayName}
                      style={{
                        textAlign: 'center', fontSize: '0.72rem', fontWeight: 700,
                        color: '#64748B', textTransform: 'uppercase', paddingBottom: 4
                      }}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Monthly Days Grid */}
                <div className="atelier-calendar-grid">
                  {calendarCells.map(cell => {
                    if (cell.empty) {
                      return (
                        <div
                          key={cell.key}
                          className="calendar-day-cell"
                          style={{ background: 'rgba(13, 16, 23, 0.35)', border: '1px solid rgba(40,47,66,0.3)', cursor: 'default' }}
                        />
                      )
                    }

                    const hasBlocked = cell.notes.some(n => n.tipo === 'bloqueo' && !n.completado)
                    return (
                      <div
                        key={cell.iso}
                        className="calendar-day-cell"
                        onClick={() => {
                          setSelectedCalendarDate(cell.iso)
                          if (cell.bookings.length > 0) {
                            setSelected(cell.bookings[0])
                            setShowCancelForm(false)
                          }
                        }}
                        style={{
                          background: cell.isSelected
                            ? 'rgba(232, 176, 114, 0.14)'
                            : (hasBlocked ? 'rgba(239, 68, 68, 0.08)' : '#131722'),
                          border: cell.isSelected
                            ? '1.5px solid #e8b072'
                            : (cell.isToday ? '1px solid rgba(245, 185, 85, 0.6)' : '1px solid #252b3d'),
                          borderRadius: 10, padding: 6, cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', gap: 3,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.76rem', fontWeight: cell.isToday || cell.isSelected ? 800 : 600,
                            color: cell.isToday ? '#F5B955' : (cell.isSelected ? '#F8FAFC' : '#94A3B8')
                          }}>
                            {cell.day}
                          </span>
                          {(cell.bookings.length > 0 || cell.notes.length > 0) && (
                            <span style={{ fontSize: '0.62rem', color: '#e8b072', fontWeight: 700 }}>
                              {cell.bookings.length + cell.notes.length}
                            </span>
                          )}
                        </div>

                        {/* Event Pills inside Day Cell */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                          {cell.bookings.slice(0, 2).map(b => (
                            <div
                              key={`b-${b.id_reserva || b.id}`}
                              className="calendar-event-pill"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedCalendarDate(cell.iso)
                                setSelected(b)
                                setShowCancelForm(false)
                              }}
                              style={{
                                background: 'rgba(232, 176, 114, 0.2)',
                                borderLeft: '2px solid #e8b072',
                                color: '#F8FAFC'
                              }}
                              title={`${b.hora_sesion || '10:00'} - ${b.nombre_cliente || b.cliente_nombre} (${b.nombre_servicio || b.servicio_nombre})`}
                            >
                              📸 {b.hora_sesion ? b.hora_sesion.slice(0, 5) : ''} {(b.nombre_cliente || b.cliente_nombre || '').split(' ')[0]}
                            </div>
                          ))}

                          {cell.notes.filter(n => !n.completado).slice(0, 2).map(n => {
                            const pillBg = n.tipo === 'bloqueo' ? 'rgba(239, 68, 68, 0.2)' : (n.tipo === 'pre_reserva' ? 'rgba(245, 185, 85, 0.2)' : 'rgba(56, 189, 248, 0.18)')
                            const pillBorder = n.tipo === 'bloqueo' ? '#ef4444' : (n.tipo === 'pre_reserva' ? '#F5B955' : '#38bdf8')
                            return (
                              <div
                                key={`n-${n.id}`}
                                className="calendar-event-pill"
                                style={{
                                  background: pillBg,
                                  borderLeft: `2px solid ${pillBorder}`,
                                  color: '#e2e8f0'
                                }}
                                title={n.titulo}
                              >
                                📌 {n.titulo}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Day Inspector Panel for Selected Date */}
                <div style={{
                  background: '#131722', border: '1px solid #282f42', borderRadius: 12, padding: 14,
                  display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#e8b072', fontWeight: 700, letterSpacing: '0.06em' }}>
                        Día Seleccionado
                      </span>
                      <h4 style={{ margin: '2px 0 0 0', color: '#F8FAFC', fontSize: '0.98rem' }}>
                        {fmtDate(selectedCalendarDate)}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setNewNoteForm({ ...EMPTY_NOTE, fecha: selectedCalendarDate })
                          setShowMarkDateModal(true)
                        }}
                        style={{
                          padding: '5px 10px', borderRadius: 7, background: '#282a30',
                          border: '1px solid #3b4257', color: '#F8FAFC', fontSize: '0.75rem',
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Bookmark size={13} style={{ color: '#F5B955' }} /> Marcar esta fecha
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewBooking({ ...EMPTY_BOOKING, fecha_sesion: selectedCalendarDate })
                          setShowModal(true)
                        }}
                        style={{
                          padding: '5px 10px', borderRadius: 7, background: '#e8b072',
                          border: 'none', color: '#482900', fontSize: '0.75rem',
                          fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Plus size={13} /> Agendar en este día
                      </button>
                    </div>
                  </div>

                  {selectedDayBookings.length === 0 && selectedDayNotes.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: '#64748B', padding: '6px 0' }}>
                      Día libre en el estudio. Puedes agendar una sesión o marcar un recordatorio / pre-reserva.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedDayBookings.map(b => (
                        <div
                          key={b.id_reserva || b.id}
                          onClick={() => {
                            setSelected(b)
                            setShowCancelForm(false)
                            setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
                          }}
                          style={{
                            background: '#191b22', border: '1px solid rgba(232,176,114,0.35)',
                            borderRadius: 8, padding: '8px 12px', display: 'flex',
                            justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#F8FAFC' }}>
                              📸 {b.hora_sesion || '10:00'} hs — {b.nombre_cliente || b.cliente_nombre}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                              {b.nombre_servicio || b.servicio_nombre} • {b.ubicacion || 'Estúdio Central'}
                            </div>
                          </div>
                          <StatusBadge status={b.estado} />
                        </div>
                      ))}

                      {selectedDayNotes.map(n => (
                        <div
                          key={n.id}
                          style={{
                            background: '#191b22', border: '1px solid #282f42',
                            borderLeft: '3px solid #F5B955', borderRadius: 8, padding: '8px 12px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.84rem', color: n.completado ? '#64748B' : '#F8FAFC', textDecoration: n.completado ? 'line-through' : 'none' }}>
                              📌 {n.hora ? `${n.hora} hs — ` : ''}{n.titulo}
                            </div>
                            {n.notas && <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{n.notas}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleToggleCalendarNote(n)}
                              style={{
                                background: '#282a30', border: 'none', color: '#4ade80',
                                borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer'
                              }}
                            >
                              {n.completado ? 'Reabrir' : '✓ Hecho'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCalendarNote(n.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} className="text-accent" />
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>Agenda Cronológica</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{filtered.length} registros</span>
                </div>

                {filtered.length === 0 ? (
                  <div className="no-data" style={{ padding: 40, textAlign: 'center' }}>
                    No se encontraron reservas con los filtros aplicados.
                  </div>
                ) : (
                  <>
                    {/* Table for Desktop */}
                    <div className="table-wrapper desktop-only">
                      <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                          <tr style={{ background: 'rgba(40, 42, 48, 0.6)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '12px 14px' }}>Fecha</th>
                            <th style={{ padding: '12px 14px' }}>Cliente</th>
                            <th style={{ padding: '12px 14px' }}>Servicio</th>
                            <th style={{ padding: '12px 14px' }}>Estado</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Presupuesto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(b => {
                            const isSelected = activeFocusBooking && (activeFocusBooking.id_reserva || activeFocusBooking.id) === (b.id_reserva || b.id)
                            const clientName = b.nombre_cliente || b.cliente_nombre || 'Cliente'
                            const serviceName = b.nombre_servicio || b.servicio_nombre || 'Servicio'

                            return (
                              <tr
                                key={b.id_reserva || b.id}
                                onClick={() => { setSelected(b); setShowCancelForm(false) }}
                                style={{
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(30, 31, 38, 0.8)' : undefined,
                                  borderLeft: isSelected ? '3px solid #e8b072' : '3px solid transparent',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                  <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{fmtDate(b.fecha_sesion)}</div>
                                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>#RES-{b.id_reserva || b.id}</span>
                                </td>

                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                      width: 32, height: 32, borderRadius: '50%', background: '#282a30',
                                      color: '#e8b072', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                                    }}>
                                      {getInitials(clientName)}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.88rem' }}>{clientName}</div>
                                      <div style={{ fontSize: '0.72rem', color: b.contrato_firmado ? '#4ade80' : '#f59e0b' }}>
                                        {b.contrato_firmado ? '✓ Contrato OK' : '⚠ Sin firmar'}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                  {serviceName}
                                </td>

                                <td style={{ padding: '12px 14px' }}>
                                  <StatusBadge status={b.estado} />
                                </td>

                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#F5B955', fontSize: '0.9rem' }}>
                                  {fmt(b.monto_bruto)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Session List Stream for Mobile */}
                    <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {filtered.map(b => {
                        const isSelected = activeFocusBooking && (activeFocusBooking.id_reserva || activeFocusBooking.id) === (b.id_reserva || b.id)
                        const clientName = b.nombre_cliente || b.cliente_nombre || 'Cliente'
                        const serviceName = b.nombre_servicio || b.servicio_nombre || 'Servicio'

                        return (
                          <div
                            key={b.id_reserva || b.id}
                            onClick={() => {
                              setSelected(b)
                              setShowCancelForm(false)
                              setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
                            }}
                            style={{
                              background: isSelected ? '#1e222e' : '#161922',
                              border: isSelected ? '1px solid #e8b072' : '1px solid #282f42',
                              borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <div style={{
                                width: 38, height: 38, borderRadius: 10, background: '#282a30',
                                color: '#e8b072', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
                              }}>
                                {getInitials(clientName)}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {clientName}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: '#282a30', color: '#e8b072' }}>
                                    {b.estado || 'Agendada'}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                  {fmtDate(b.fecha_sesion)} • {serviceName}
                                </span>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
                              <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.92rem', display: 'block' }}>
                                {fmt(b.monto_bruto)}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#C78D4D' }}>
                                #RES-{b.id_reserva || b.id}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Studio Utilities & Sync Footer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={exportCSV}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, background: '#131B2A',
                  border: '1px solid #282f42', color: '#F8FAFC', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={16} className="text-muted" />
                  <span>Exportar Sesiones (CSV)</span>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
            </div>

          </div>
        </div>

        {/* PANEL DERECHO: DETALLE DE SESIÓN & FOCUS CARD (5 COLS) */}
        <div style={{ gridColumn: 'span 5' }} className="bookings-detail-panel" ref={detailRef}>
          {activeFocusBooking ? (
            <div style={{
              background: '#191b22', borderRadius: 16, overflow: 'hidden',
              border: '1px solid rgba(232, 176, 114, 0.25)', boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
              position: 'sticky', top: 20
            }}>
              
              {/* Card Visual Ribbon / Ambient Banner */}
              <div style={{
                position: 'relative', padding: 18,
                background: 'linear-gradient(135deg, #1f2536 0%, #151821 100%)',
                borderBottom: '1px solid #282f42'
              }}>
                <div style={{
                  position: 'absolute', right: -20, top: -20, width: 100, height: 100,
                  background: 'radial-gradient(circle, rgba(232, 184, 109, 0.15) 0%, transparent 70%)',
                  borderRadius: '50%'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 6, flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 20, background: 'rgba(11, 13, 19, 0.8)',
                    backdropFilter: 'blur(6px)', fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5B955', boxShadow: '0 0 6px #F5B955' }} />
                    <span>FICHA • #RES-{activeFocusBooking.id_reserva || activeFocusBooking.id}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* TTS Button for this Session */}
                    <button
                      type="button"
                      onClick={() => handleSpeakSessionBriefing(activeFocusBooking)}
                      title="Escuchar ficha completa de la sesión por voz"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: speaking ? 'rgba(239,68,68,0.2)' : 'rgba(11, 13, 19, 0.85)',
                        color: speaking ? '#f87171' : '#e8b072',
                        border: '1px solid rgba(232, 176, 114, 0.3)', borderRadius: 20,
                        padding: '3px 9px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{speaking ? 'Callar' : 'Escuchar'}</span>
                    </button>

                    {/* Inline Status Selector */}
                    <select
                      value={activeFocusBooking.estado || 'Agendada'}
                      onChange={e => updateEstado(activeFocusBooking.id_reserva || activeFocusBooking.id, e.target.value)}
                      disabled={actionLoading}
                      style={{
                        background: 'rgba(11, 13, 19, 0.85)', color: '#e8b072',
                        border: '1px solid rgba(232, 176, 114, 0.3)', borderRadius: 20,
                        padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
                        cursor: 'pointer', outline: 'none'
                      }}
                    >
                      {ESTADOS.filter(e => e.id).map(e => (
                        <option key={e.id} value={e.id}>{e.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#e8b072', fontWeight: 600 }}>
                      {activeFocusBooking.nombre_servicio || activeFocusBooking.servicio_nombre || 'Sesión Fotográfica'}
                    </span>
                    <h2 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {activeFocusBooking.nombre_cliente || activeFocusBooking.cliente_nombre}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>Presupuesto</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F5B955' }}>
                      {fmt(activeFocusBooking.monto_bruto)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shoot Details Body */}
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Bento Grid: Fecha, Hora y Ubicación */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#1e1f26', padding: 12, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: '0.85rem' }}>
                      <Calendar size={16} style={{ color: '#e8b072' }} />
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{fmtDate(activeFocusBooking.fecha_sesion)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8b072', fontSize: '0.85rem', background: '#282a30', padding: '2px 8px', borderRadius: 6 }}>
                      <Clock size={14} />
                      <span style={{ fontWeight: 700 }}>{activeFocusBooking.hora_sesion || '10:00'} hs</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: '0.82rem' }}>
                    <MapPin size={15} style={{ color: '#e8b072' }} />
                    <span>{activeFocusBooking.ubicacion || 'Estúdio Central Diogo'}</span>
                  </div>
                </div>

                {/* Consentimiento Redes Sociales / Instagram */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10, background: '#131B2A',
                  border: activeFocusBooking.autoriza_redes_sociales ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(245, 185, 85, 0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} style={{ color: activeFocusBooking.autoriza_redes_sociales ? '#4ade80' : '#F5B955', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F8FAFC' }}>Difusión en Redes / Portfolio</span>
                      <span style={{ fontSize: '0.72rem', color: activeFocusBooking.autoriza_redes_sociales ? '#4ade80' : '#F5B955' }}>
                        {activeFocusBooking.autoriza_redes_sociales ? '✓ Autoriza fotos en Instagram/Web' : '🔒 Confidencial (No publicar)'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => updateBookingField(activeFocusBooking.id_reserva || activeFocusBooking.id, { autoriza_redes_sociales: !activeFocusBooking.autoriza_redes_sociales })}
                    disabled={actionLoading}
                    style={{
                      padding: '4px 10px', borderRadius: 6, background: '#282a30',
                      border: 'none', color: '#e8b072', fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {activeFocusBooking.autoriza_redes_sociales ? 'Hacer Privado' : 'Autorizar'}
                  </button>
                </div>

                {/* Estilo y Preferencias del Cliente (si existen en su perfil) */}
                {activeFocusBooking.cliente_notas_estilo && (
                  <div style={{
                    background: 'rgba(232, 176, 114, 0.08)', border: '1px solid rgba(232, 176, 114, 0.2)',
                    borderRadius: 10, padding: '10px 14px'
                  }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#e8b072', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                      Estilo & Notas del Cliente
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                      {activeFocusBooking.cliente_notas_estilo}
                    </span>
                  </div>
                )}

                {/* Contract Alert Banner */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10, background: '#131B2A',
                  border: activeFocusBooking.contrato_firmado ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(232, 176, 114, 0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileSignature size={18} style={{ color: activeFocusBooking.contrato_firmado ? '#4ade80' : '#C78D4D', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F8FAFC' }}>Contrato Legal Atelier</span>
                      <span style={{ fontSize: '0.72rem', color: activeFocusBooking.contrato_firmado ? '#4ade80' : '#C78D4D' }}>
                        {activeFocusBooking.contrato_firmado ? 'Firmado digitalmente' : 'Pendiente de firma digital'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => updateContrato(activeFocusBooking.id_reserva || activeFocusBooking.id, !activeFocusBooking.contrato_firmado)}
                    disabled={actionLoading}
                    style={{
                      padding: '4px 10px', borderRadius: 6, background: '#282a30',
                      border: 'none', color: '#e8b072', fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {activeFocusBooking.contrato_firmado ? 'Desmarcar' : 'Marcar Firmado'}
                  </button>
                </div>

                {/* Notas Internas de Producción + Dictado por Voz */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#1e1f26', padding: 12, borderRadius: 10, border: '1px solid #282f42' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', fontWeight: 600 }}>
                      Notas Internas del Rodaje
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleDictate('detailNotes')}
                        title="Dictar nota por micrófono"
                        style={{
                          background: dictatingField === 'detailNotes' ? 'rgba(239,68,68,0.2)' : '#282a30',
                          color: dictatingField === 'detailNotes' ? '#f87171' : '#e8b072',
                          border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: '0.7rem',
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Mic size={12} /> {dictatingField === 'detailNotes' ? 'Escuchando...' : 'Dictar'}
                      </button>
                      {editingNotes ? (
                        <button
                          onClick={handleSaveNotes}
                          disabled={actionLoading}
                          style={{ background: '#e8b072', color: '#482900', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Guardar
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingNotes(true)}
                          style={{ background: 'none', border: 'none', color: '#e8b072', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                  {editingNotes ? (
                    <textarea
                      rows={2}
                      value={notesVal}
                      onChange={e => setNotesVal(e.target.value)}
                      placeholder="Vestuario, atrezzo, iluminación específica..."
                      style={{ background: '#0c0e14', border: '1px solid #282f42', color: '#F8FAFC', borderRadius: 6, padding: 8, fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: activeFocusBooking.notas_internas ? '#cbd5e1' : '#64748B', fontStyle: activeFocusBooking.notas_internas ? 'normal' : 'italic' }}>
                      {activeFocusBooking.notas_internas || 'Sin notas internas registradas.'}
                    </p>
                  )}
                </div>

                {/* Motivo de Cancelación si aplica */}
                {activeFocusBooking.estado === 'Cancelada' && activeFocusBooking.razon_cancelacion && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: '0.8rem'
                  }}>
                    <strong style={{ display: 'block', color: '#ef4444', marginBottom: 2 }}>Motivo de Cancelación:</strong>
                    {activeFocusBooking.razon_cancelacion}
                  </div>
                )}

                {/* Pipeline Status Flow */}
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                  {PIPELINE_STEPS.map((step) => {
                    const isActive = activeFocusBooking.estado?.toLowerCase() === step.id.toLowerCase()
                    return (
                      <button
                        key={step.id}
                        disabled={actionLoading}
                        onClick={() => updateEstado(activeFocusBooking.id_reserva || activeFocusBooking.id, step.id)}
                        style={{
                          flex: 1, minWidth: 55, padding: '6px 4px', fontSize: '0.72rem',
                          borderRadius: 6, border: 'none',
                          background: isActive ? '#e8b072' : '#1e1f26',
                          color: isActive ? '#482900' : '#94A3B8',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        {step.label}
                      </button>
                    )
                  })}
                </div>

                {/* Quick Operational Actions Grid (3 Cols) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 4 }}>
                  {getWhatsAppReminderUrl(activeFocusBooking) ? (
                    <a
                      href={getWhatsAppReminderUrl(activeFocusBooking)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26',
                        textDecoration: 'none', color: '#94A3B8', transition: 'all 0.15s ease'
                      }}
                    >
                      <MessageCircle size={18} style={{ color: '#25D366' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>WhatsApp</span>
                    </a>
                  ) : (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26', color: '#64748B', opacity: 0.6
                    }}>
                      <MessageCircle size={18} />
                      <span style={{ fontSize: '0.75rem' }}>WhatsApp</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      alert(`Hoja de Ruta #RES-${activeFocusBooking.id_reserva || activeFocusBooking.id}\nCliente: ${activeFocusBooking.nombre_cliente || activeFocusBooking.cliente_nombre}\nFecha: ${fmtDate(activeFocusBooking.fecha_sesion)}\nLocación: ${activeFocusBooking.ubicacion || 'Estudio Central'}`)
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26',
                      border: 'none', color: '#94A3B8', cursor: 'pointer'
                    }}
                  >
                    <FileText size={18} style={{ color: '#e8b072' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Hoja de Ruta</span>
                  </button>

                  {activeFocusBooking.url_galeria ? (
                    <a
                      href={activeFocusBooking.url_galeria}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26',
                        textDecoration: 'none', color: '#94A3B8'
                      }}
                    >
                      <ImageIcon size={18} style={{ color: '#e8b072' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Ver Galería</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        const url = prompt('Ingrese URL de la galería fotográfica:')
                        if (url) {
                          fetch(`/api/bookings/${activeFocusBooking.id_reserva || activeFocusBooking.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url_galeria: url })
                          }).then(() => refetchBookings())
                        }
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 4, padding: '10px 4px', borderRadius: 10, background: '#1e1f26',
                        border: 'none', color: '#94A3B8', cursor: 'pointer'
                      }}
                    >
                      <ImageIcon size={18} style={{ color: '#64748B' }} />
                      <span style={{ fontSize: '0.75rem' }}>+ Galería</span>
                    </button>
                  )}
                </div>

                {/* Cancelar Reserva option */}
                {!showCancelForm ? (
                  <div style={{ textAlign: 'center', marginTop: 4 }}>
                    <button
                      onClick={() => setShowCancelForm(true)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Cancelar esta reserva
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#1c202d', padding: 10, borderRadius: 8, border: '1px solid #3b4257' }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.75rem', color: '#cbd5e1' }}>Motivo:</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Ej. Reprogramación..."
                      style={{ fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        className="btn-danger btn-sm"
                        disabled={!cancelReason || actionLoading}
                        onClick={() => {
                          updateEstado(activeFocusBooking.id_reserva || activeFocusBooking.id, 'Cancelada', { motivo_cancelacion: cancelReason })
                          setShowCancelForm(false)
                        }}
                      >
                        Confirmar
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setShowCancelForm(false)}>Atrás</button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div style={{ background: '#191b22', borderRadius: 14, padding: 40, textAlign: 'center', border: '1px solid #282f42' }}>
              <Calendar size={36} className="text-muted" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, color: '#F8FAFC' }}>Ninguna sesión seleccionada</div>
              <div style={{ color: '#64748B', fontSize: '0.82rem', marginTop: 4 }}>
                Selecciona una reserva para ver sus detalles.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Nueva Reserva */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={20} className="text-accent" /> Nueva Reserva Fotográfica
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><XCircle size={20}/></button>
            </div>
            
            <div className="modal-body">
              {/* Client Toggle: Existente vs Rápido */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: '#131B2A', padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setNewBooking({ ...newBooking, isFastNewClient: false })}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600,
                    background: !newBooking.isFastNewClient ? '#282a30' : 'transparent',
                    color: !newBooking.isFastNewClient ? '#F5B955' : '#94A3B8'
                  }}
                >
                  <Users size={14} style={{ display: 'inline', marginRight: 5 }} /> Cliente Existente
                </button>
                <button
                  type="button"
                  onClick={() => setNewBooking({ ...newBooking, isFastNewClient: true })}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600,
                    background: newBooking.isFastNewClient ? '#282a30' : 'transparent',
                    color: newBooking.isFastNewClient ? '#F5B955' : '#94A3B8'
                  }}
                >
                  <UserPlus size={14} style={{ display: 'inline', marginRight: 5 }} /> + Alta Rápida de Cliente
                </button>
              </div>

              {!newBooking.isFastNewClient ? (
                <div className="form-group">
                  <label className="form-label">Cliente *</label>
                  <select 
                    className="form-input" 
                    value={newBooking.id_cliente} 
                    onChange={e => setNewBooking({...newBooking, id_cliente: e.target.value})}
                  >
                    <option value="">Seleccione un cliente...</option>
                    {clients.map(c => (
                      <option key={c.id_cliente || c.id} value={c.id_cliente || c.id}>
                        {c.nombre} {c.telefono ? `(${c.telefono})` : ''} {c.descuento_sugerido_pct ? `— [VIP ${c.descuento_sugerido_pct}%]` : ''}
                      </option>
                    ))}
                  </select>

                  {/* VIP Benefit Callout if client has discount */}
                  {(() => {
                    const selClient = clients.find(c => String(c.id_cliente || c.id) === String(newBooking.id_cliente))
                    const discount = selClient?.descuento_sugerido_pct || 0
                    if (discount > 0) {
                      const selService = services.find(s => String(s.id_servicio || s.id) === String(newBooking.id_servicio))
                      const basePrice = selService ? parseFloat(selService.precio_base) : null
                      const finalPrice = basePrice ? basePrice * (1 - discount / 100) : null
                      return (
                        <div style={{
                          marginTop: 8, padding: '8px 12px', borderRadius: 8,
                          background: 'rgba(245, 185, 85, 0.1)', border: '1px solid rgba(245, 185, 85, 0.25)',
                          fontSize: '0.78rem', color: '#F5B955'
                        }}>
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Sparkles size={14} /> Beneficio Fidelidad VIP ({discount}% Descuento)
                          </div>
                          <div style={{ color: '#cbd5e1', marginTop: 2 }}>
                            {selService 
                              ? `Tarifa Original: ${fmt(basePrice)} → Final con VIP: ${fmt(finalPrice)}`
                              : 'El descuento del ' + discount + '% se aplicará automáticamente al total.'}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#191b22', padding: 12, borderRadius: 8, border: '1px solid #282f42', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e8b072', textTransform: 'uppercase' }}>
                    Alta Rápida de Cliente
                  </span>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Nombre Completo *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Sofia Loren"
                      value={newBooking.fastNombre}
                      onChange={e => setNewBooking({ ...newBooking, fastNombre: e.target.value })}
                    />
                  </div>
                  <div className="form-row" style={{ margin: 0 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Teléfono (WhatsApp)</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="912345678"
                        value={newBooking.fastTelefono}
                        onChange={e => setNewBooking({ ...newBooking, fastTelefono: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Email (Opcional)</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="cliente@email.com"
                        value={newBooking.fastEmail}
                        onChange={e => setNewBooking({ ...newBooking, fastEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Servicio Fotográfico *</label>
                <select 
                  className="form-input" 
                  value={newBooking.id_servicio} 
                  onChange={e => setNewBooking({...newBooking, id_servicio: e.target.value})}
                >
                  <option value="">Seleccione un servicio...</option>
                  {services.filter(s => s.activo !== 0).map(s => (
                    <option key={s.id_servicio || s.id} value={s.id_servicio || s.id}>
                      {s.nombre} — {fmt(s.precio_base)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha de Sesión *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newBooking.fecha_sesion} 
                    onChange={e => setNewBooking({...newBooking, fecha_sesion: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora de Sesión</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={newBooking.hora_sesion} 
                    onChange={e => setNewBooking({...newBooking, hora_sesion: e.target.value})} 
                  />
                </div>
              </div>

              {/* DETECTOR DE COLISIONES Y FECHAS MARCADAS */}
              {newBooking.fecha_sesion && (() => {
                const sameDayBookings = bookings.filter(b => b.estado !== 'Cancelada' && (b.fecha_sesion || '').split('T')[0] === newBooking.fecha_sesion)
                const sameDayNotes = calendarNotes.filter(n => !n.completado && (n.fecha || '').split('T')[0] === newBooking.fecha_sesion)
                if (sameDayBookings.length === 0 && sameDayNotes.length === 0) return null
                return (
                  <div style={{
                    marginBottom: 14, padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)',
                    fontSize: '0.78rem', color: '#fca5a5'
                  }}>
                    <div style={{ fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <AlertTriangle size={15} /> ¡Atención! Ya tienes actividad marcada en esta fecha ({fmtDate(newBooking.fecha_sesion)}):
                    </div>
                    {sameDayBookings.map(b => (
                      <div key={`col-b-${b.id_reserva || b.id}`}>
                        • 📸 Sesión {b.hora_sesion || '10:00'} hs: <strong>{b.nombre_cliente || b.cliente_nombre}</strong> ({b.nombre_servicio || b.servicio_nombre})
                      </div>
                    ))}
                    {sameDayNotes.map(n => (
                      <div key={`col-n-${n.id}`}>
                        • 📌 {n.tipo.toUpperCase()} {n.hora ? `(${n.hora})` : ''}: <strong>{n.titulo}</strong>
                      </div>
                    ))}
                  </div>
                )
              })()}

              <div className="form-group">
                <label className="form-label">Locación (opcional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newBooking.ubicacion} 
                  onChange={e => setNewBooking({...newBooking, ubicacion: e.target.value})} 
                  placeholder="Estúdio Central, Lisboa, Sintra, Cascais..." 
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>Notas Internas de Rodaje (Opcional)</label>
                  <button
                    type="button"
                    onClick={() => handleDictate('newBookingNotes')}
                    style={{
                      background: dictatingField === 'newBookingNotes' ? 'rgba(239,68,68,0.2)' : '#282a30',
                      color: dictatingField === 'newBookingNotes' ? '#f87171' : '#e8b072',
                      border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem',
                      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Mic size={12} /> {dictatingField === 'newBookingNotes' ? 'Escuchando...' : 'Dictar por voz'}
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={newBooking.notas_internas}
                  onChange={e => setNewBooking({ ...newBooking, notas_internas: e.target.value })}
                  placeholder="Detalles de estilismo, vestuario, ideas..."
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={newBooking.contrato_firmado}
                    onChange={e => setNewBooking({...newBooking, contrato_firmado: e.target.checked})}
                    style={{ width: 16, height: 16, accentColor: '#e8b072' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>Marcar contrato como firmado digitalmente</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button 
                className="btn-primary" 
                disabled={creating || (!newBooking.isFastNewClient && !newBooking.id_cliente) || (newBooking.isFastNewClient && !newBooking.fastNombre.trim()) || !newBooking.id_servicio || !newBooking.fecha_sesion} 
                onClick={handleCreate}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle size={16} /> {creating ? 'Guardando...' : 'Crear Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Marcar Fecha X / Recordatorio Anti-Olvido */}
      {showMarkDateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bookmark size={20} style={{ color: '#F5B955' }} /> Marcar Fecha / Recordatorio
              </h3>
              <button className="modal-close" onClick={() => setShowMarkDateModal(false)}><XCircle size={20}/></button>
            </div>

            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                ¿Un cliente te pidió guardar una fecha de palabra, tienes mantenimiento de equipo o debes entregar un álbum? Márcalo aquí en 5 segundos (o díctalo por voz) para que el sistema te avise y evite dobles reservas.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha Marcada *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newNoteForm.fecha}
                    onChange={e => setNewNoteForm({ ...newNoteForm, fecha: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora (Opcional)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newNoteForm.hora}
                    onChange={e => setNewNoteForm({ ...newNoteForm, hora: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Marca</label>
                <select
                  className="form-input"
                  value={newNoteForm.tipo}
                  onChange={e => setNewNoteForm({ ...newNoteForm, tipo: e.target.value })}
                >
                  <option value="pre_reserva">⏳ Pre-Reserva / Fecha hablada sin señal</option>
                  <option value="bloqueo">⛔ Día Bloqueado (No agendar sesiones)</option>
                  <option value="entrega">📦 Compromiso de Entrega / Álbum</option>
                  <option value="recordatorio">📌 Recordatorio Operativo</option>
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>Título / Qué no debes olvidar *</label>
                  <button
                    type="button"
                    onClick={() => handleDictate('markDateTitle')}
                    style={{
                      background: dictatingField === 'markDateTitle' ? 'rgba(239,68,68,0.2)' : '#282a30',
                      color: dictatingField === 'markDateTitle' ? '#f87171' : '#e8b072',
                      border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem',
                      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Mic size={12} /> {dictatingField === 'markDateTitle' ? 'Escuchando...' : 'Dictar'}
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Pre-reserva Boda Inês & Tiago en Sintra"
                  value={newNoteForm.titulo}
                  onChange={e => setNewNoteForm({ ...newNoteForm, titulo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>Detalles adicionales (Opcional)</label>
                  <button
                    type="button"
                    onClick={() => handleDictate('markDateNotes')}
                    style={{
                      background: dictatingField === 'markDateNotes' ? 'rgba(239,68,68,0.2)' : '#282a30',
                      color: dictatingField === 'markDateNotes' ? '#f87171' : '#e8b072',
                      border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem',
                      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Mic size={12} /> {dictatingField === 'markDateNotes' ? 'Escuchando...' : 'Dictar'}
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Ej: Confirmar pago de señal por MB WAY antes del viernes..."
                  value={newNoteForm.notas}
                  onChange={e => setNewNoteForm({ ...newNoteForm, notas: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowMarkDateModal(false)}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={actionLoading || !newNoteForm.fecha || !newNoteForm.titulo.trim()}
                onClick={handleCreateCalendarNote}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Bookmark size={16} /> Guardar Fecha Marcada
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
