import { getApiBase, getAuthHeaders, getProfileUrl } from './api'

export type ProfilePropertyItem = {
  id: string
  photoUrl: string | null
  title: string | null
  price: number | string | null
  propertyType: string | null
  rooms: number | string | null
  totalArea: number | string | null
  city: string | null
  district: string | null
}

function resolveAssetUrl(value?: string | null): string | null {
  if (!value) return null
  if (/^https?:\/\//.test(value)) return value
  const base = getApiBase()
  if (value.startsWith('/uploads')) {
    const apiBase = base || 'http://localhost:8080'
    return `${apiBase}${value}`
  }
  if (!base) return value
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`
}

function extractFirstPhoto(p: Record<string, unknown>): string | null {
  const photos = p.photos
  if (Array.isArray(photos) && photos.length > 0) {
    const first = photos[0]
    if (typeof first === 'string') return resolveAssetUrl(first)
    if (first && typeof first === 'object') {
      const o = first as Record<string, unknown>
      const path = String(o.url ?? o.path ?? o.src ?? o.filename ?? '')
      return path ? resolveAssetUrl(path) : null
    }
  }
  const single = p.photoUrl ?? p.cover ?? p.image
  if (typeof single === 'string') return resolveAssetUrl(single)
  return null
}

function normalizeItem(raw: unknown): ProfilePropertyItem | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const id = p.id ?? p._id
  if (id === undefined || id === null) return null
  return {
    id: String(id),
    photoUrl: extractFirstPhoto(p),
    title: (p.title as string) ?? null,
    price: (p.price as ProfilePropertyItem['price']) ?? null,
    propertyType:
      (p.propertyType as string) ??
      (p.subcategory as string) ??
      (p.type as string) ??
      null,
    rooms: (p.rooms ?? p.roomsCount) as ProfilePropertyItem['rooms'],
    totalArea: (p.totalArea ?? p.area ?? p.square) as ProfilePropertyItem['totalArea'],
    city: (p.city as string) ?? null,
    district: (p.district ?? p.region) as string | null,
  }
}

export async function fetchProfileProperties(): Promise<ProfilePropertyItem[]> {
  const url = getProfileUrl('/api/profile/properties')
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Ошибка загрузки: ${res.status}`))
  }
  const data = await res.json()
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown }).items)
      ? ((data as { items: unknown[] }).items ?? [])
      : Array.isArray((data as { properties?: unknown }).properties)
        ? ((data as { properties: unknown[] }).properties ?? [])
        : []
  return list.map(normalizeItem).filter(Boolean) as ProfilePropertyItem[]
}

export async function deleteUserProperty(propertyId: string): Promise<void> {
  const url = getProfileUrl(`/api/properties/${encodeURIComponent(propertyId)}`)
  const res = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Не удалось удалить: ${res.status}`))
  }
}
