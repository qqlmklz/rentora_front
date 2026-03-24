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
  title?: string | null
  propertyType?: string | null
  rooms?: number | string | null
  totalArea?: number | string | null
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

export async function fetchCatalog(filters: CatalogFilters): Promise<CatalogItem[]> {
  const base = getApiBase()
  const url = new URL((base || '') + '/api/properties', base || window.location.origin)

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
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.properties) ? data.properties : []

  return list.map((raw) => {
    const p = raw?.property ?? raw
    const id = p?.id ?? p?._id ?? raw?.id

    // Debug: логируем photos для диагностики
    if (p?.photos !== undefined) {
      console.log('[Catalog] property.photos:', p.photos)
    }

    let photo: string | null = null

    // Приоритет: photos[0]
    if (Array.isArray(p?.photos) && p.photos.length > 0) {
      const first = p.photos[0]
      if (typeof first === 'string') {
        photo = first
      } else if (first && typeof first === 'object') {
        photo = first.url ?? first.image_url ?? first.path ?? first.src ?? first.filename ?? null
      }
    }

    // Fallback на другие поля
    if (!photo && p?.photoUrl) photo = p.photoUrl
    if (!photo && p?.image) photo = p.image
    if (!photo && p?.image_url) photo = p.image_url
    if (!photo && p?.photo) photo = p.photo
    if (!photo && p?.cover) photo = p.cover
    if (!photo && Array.isArray(p?.images) && p.images.length > 0) {
      const first = p.images[0]
      if (typeof first === 'string') {
        photo = first
      } else if (first && typeof first === 'object') {
        photo = first.url ?? first.image_url ?? first.path ?? first.src ?? first.filename ?? null
      }
    }

    const resolvedPhoto = resolveAssetUrl(photo)
    console.log('[Catalog] resolved photo URL:', resolvedPhoto)

    return {
      id: String(id),
      photoUrl: resolvedPhoto,
      price: p?.price ?? null,
      title: p?.title ?? null,
      propertyType: p?.propertyType ?? p?.subcategory ?? p?.type ?? null,
      rooms: p?.rooms ?? p?.roomsCount ?? null,
      totalArea: p?.totalArea ?? p?.area ?? p?.square ?? null,
      city: p?.city ?? null,
      district: p?.district ?? p?.region ?? null,
    } as CatalogItem
  })
}

