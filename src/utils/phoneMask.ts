export const PHONE_FOCUS_PREFIX = '+7 ('

export function extractPhoneDigits(value: string): string {
  return (value.match(/\d/g) ?? []).join('')
}

export function normalizeRussianPhoneDigits(input: string): string {
  let digits = extractPhoneDigits(input)
  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  } else if (digits.length > 0 && !digits.startsWith('7')) {
    digits = `7${digits}`
  }
  return digits.slice(0, 11)
}

/** Форматирование по мере ввода: +7 (999) 123-45-67 */
export function formatPhoneFromDigits(digits: string): string {
  const d = normalizeRussianPhoneDigits(digits)
  if (!d) return ''

  const rest = d.slice(1)
  let out = '+7 ('
  out += rest.slice(0, 3)
  if (rest.length > 3) {
    out += `) ${rest.slice(3, 6)}`
  }
  if (rest.length > 6) {
    out += `-${rest.slice(6, 8)}`
  }
  if (rest.length > 8) {
    out += `-${rest.slice(8, 10)}`
  }
  return out
}

export function applyPhoneMaskInput(raw: string): string {
  return formatPhoneFromDigits(normalizeRussianPhoneDigits(raw))
}

/** Российский номер: 11 цифр, первая — 7 */
export function isRussianPhoneComplete(value: string): boolean {
  const digits = extractPhoneDigits(value)
  return digits.length === 11 && digits.startsWith('7')
}

export function formatPhoneForMask(phone: string | null | undefined): string {
  if (!phone) return ''
  return formatPhoneFromDigits(normalizeRussianPhoneDigits(phone))
}

export function getPhoneValidationError(value: string): string | null {
  if (isRussianPhoneComplete(value)) return null
  return 'Введите номер полностью'
}
