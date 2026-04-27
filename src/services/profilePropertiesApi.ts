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
  isArchived: boolean
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
  const contracts = p.contracts
  const hasActiveContract =
    Boolean(p.hasActiveContract ?? p.has_active_contract ?? p.activeContract ?? p.active_contract) ||
    (Array.isArray(contracts) &&
      contracts.some((c) => {
        if (!c || typeof c !== 'object') return false
        const status = String((c as Record<string, unknown>).status ?? '').toLowerCase()
        return status === 'active'
      }))
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
    isArchived: Boolean(p.isArchived ?? p.is_archived) || hasActiveContract,
  }
}

export async function fetchProfileProperties(): Promise<ProfilePropertyItem[]> {
  const url = getProfileUrl('/api/profile/properties')
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Ошибка загрузки: ${res.status}`))
  }
  const data = await res.json()
  if (Array.isArray(data)) {
    return data.map(normalizeItem).filter(Boolean) as ProfilePropertyItem[]
  }

  const obj = (data && typeof data === 'object' ? (data as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >
  const activeRaw = Array.isArray(obj.activeListings)
    ? obj.activeListings
    : Array.isArray(obj.active_listings)
      ? obj.active_listings
      : []
  const archivedRaw = Array.isArray(obj.archivedListings)
    ? obj.archivedListings
    : Array.isArray(obj.archived_listings)
      ? obj.archived_listings
      : []

  if (activeRaw.length > 0 || archivedRaw.length > 0) {
    const active = activeRaw
      .map((row) => normalizeItem(row))
      .filter(Boolean)
      .map((item) => ({ ...(item as ProfilePropertyItem), isArchived: false }))
    const archived = archivedRaw
      .map((row) => normalizeItem(row))
      .filter(Boolean)
      .map((item) => ({ ...(item as ProfilePropertyItem), isArchived: true }))
    return [...active, ...archived]
  }

  const list: unknown[] = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.properties)
      ? obj.properties
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
