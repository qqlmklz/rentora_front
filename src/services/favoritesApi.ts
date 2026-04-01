import { getProfileUrl, getAuthHeaders, getApiBase } from './api'

/** Событие после изменения избранного (добавление/удаление на других страницах). */
export const FAVORITES_CHANGED_EVENT = 'rentora:favorites-changed'

export type FavoriteProperty = {
  id: string
  photoUrl?: string | null
  price?: number | string | null
  propertyType?: string | null
  rooms?: number | string | null
  area?: number | string | null
  city?: string | null
  district?: string | null
}

function resolveAssetUrl(value?: string | null): string | null {
  if (!value) return null
  if (/^https?:\/\//.test(value)) return value

  const base = getApiBase()

  // Для путей /uploads/... всегда добавляем base URL
  if (value.startsWith('/uploads')) {
    const apiBase = base || 'http://localhost:8080'
    return `${apiBase}${value}`
  }

  if (!base) return value
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`
}

function normalizeItem(item: any): FavoriteProperty | null {
  const p = item?.property ?? item
  const id = p?.id ?? p?._id ?? item?.propertyId ?? item?.id
  if (!id) return null
  const photo = p?.photoUrl ?? p?.image ?? p?.photo ?? p?.cover ?? p?.photos?.[0]
  return {
    id: String(id),
    photoUrl: resolveAssetUrl(photo ?? null),
    price: p?.price ?? null,
    propertyType: p?.propertyType ?? p?.type ?? null,
    rooms: p?.rooms ?? p?.roomsCount ?? null,
    area: p?.area ?? p?.square ?? null,
    city: p?.city ?? null,
    district: p?.district ?? p?.region ?? null,
  }
}

export async function fetchFavorites(): Promise<FavoriteProperty[]> {
  const url = getProfileUrl('/api/favorites')
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await res.text().catch(() => `Favorites fetch failed: ${res.status}`))
  const data = await res.json()
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.favorites) ? data.favorites : []
  return list.map(normalizeItem).filter(Boolean) as FavoriteProperty[]
}

export async function addFavorite(propertyId: string): Promise<void> {
  const url = getProfileUrl(`/api/favorites/${encodeURIComponent(propertyId)}`)
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { method: 'POST', headers })
  if (!res.ok) throw new Error(await res.text().catch(() => `Favorite add failed: ${res.status}`))
}

export async function deleteFavorite(propertyId: string): Promise<void> {
  const url = getProfileUrl(`/api/favorites/${encodeURIComponent(propertyId)}`)
  const res = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await res.text().catch(() => `Favorite delete failed: ${res.status}`))
}

/** Проверка, есть ли объявление в списке избранного (после GET /api/favorites). */
export function isFavoritePropertyId(items: FavoriteProperty[], propertyId: string): boolean {
  return items.some((item) => String(item.id) === String(propertyId))
}

