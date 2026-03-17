import { getApiBase, getAuthHeaders } from './api'

export type CatalogFilters = {
  category?: string
  propertyType?: string
  rooms?: string
  priceFrom?: string
  priceTo?: string
  location?: string
  sort?: string
}

export type CatalogItem = {
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

export async function fetchCatalog(filters: CatalogFilters): Promise<CatalogItem[]> {
  const base = getApiBase()
  const url = new URL((base || '') + '/api/catalog', base || window.location.origin)

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Catalog fetch failed: ${res.status}`))
  }

  const data = await res.json()
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []

  return list.map((raw) => {
    const p = raw?.property ?? raw
    const id = p?.id ?? p?._id ?? raw?.id
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
    } as CatalogItem
  })
}

