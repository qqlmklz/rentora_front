export type PriceLike = string | number | null | undefined

export type ListingDetailsSource = {
  propertyType?: string | null
  rooms?: string | number | null
  totalArea?: string | number | null
  area?: string | number | null
}

export type ListingLocationSource = {
  city?: string | null
  district?: string | null
  address?: string | null
}

export function formatPrice(value: PriceLike): string | null {
  if (value === null || value === undefined || value === '') return null
  const num =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(num)) return String(value)
  return `${new Intl.NumberFormat('ru-RU').format(num)} ₽`
}

export function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

export function formatListingDetails(item: ListingDetailsSource): string {
  const parts: string[] = []
  if (item.propertyType) parts.push(item.propertyType)
  if (item.rooms !== null && item.rooms !== undefined && item.rooms !== '') {
    parts.push(`${item.rooms} комн.`)
  }
  const area = item.totalArea ?? item.area
  if (area !== null && area !== undefined && area !== '') {
    parts.push(`${area} м²`)
  }
  return parts.join(' · ')
}

export function formatCityDistrict(
  city?: string | null,
  district?: string | null,
  separator = ' / ',
): string | null {
  const parts = [city, district].filter(Boolean) as string[]
  return parts.length ? parts.join(separator) : null
}

export function formatListingLocation(item: ListingLocationSource): string | null {
  return formatCityDistrict(item.city, item.district)
}

export function formatAddressParts(
  parts: Array<string | null | undefined>,
  separator = ' / ',
): string {
  const filtered = parts.filter(Boolean) as string[]
  return filtered.length ? filtered.join(separator) : '—'
}

export function formatDateTimeRu(
  raw: string | null,
  fallback = 'Дата не указана',
): string {
  if (!raw) return fallback
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (isToday) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}
