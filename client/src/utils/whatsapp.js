export function normalizePhone(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  // If 9 digits (typical Spanish mobile/landline number), prefix with Spain's country code 34
  if (digits.length === 9) {
    return '34' + digits
  }
  return digits
}

export function formatWhatsAppUrl(phone, message = '') {
  const normalized = normalizePhone(phone)
  if (!normalized) return null
  if (!message) return `https://wa.me/${normalized}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
