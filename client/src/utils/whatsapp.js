export function normalizePhone(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  // If 9 digits (Portuguese mobile or landline starting with 9 or 2), prefix with Portugal country code 351
  if (digits.length === 9) {
    return '351' + digits
  }
  return digits
}

export function formatWhatsAppUrl(phone, message = '') {
  const normalized = normalizePhone(phone)
  if (!normalized) return null
  if (!message) return `https://wa.me/${normalized}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
