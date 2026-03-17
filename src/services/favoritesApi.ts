import { getProfileUrl, getAuthHeaders, getApiBase } from './api'

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

export async function deleteFavorite(propertyId: string): Promise<void> {
  const url = getProfileUrl(`/api/favorites/${encodeURIComponent(propertyId)}`)
  const res = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await res.text().catch(() => `Favorite delete failed: ${res.status}`))
}

