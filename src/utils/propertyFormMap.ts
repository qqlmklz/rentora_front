import { getApiBase } from '../services/api'

type RentType = '' | 'long' | 'daily'
type Category = '' | 'residential' | 'commercial'
type ResidentialSubcategory = '' | 'apartment' | 'room' | 'house' | 'cottage'
type CommercialSubcategory = '' | 'office' | 'coworking' | 'building' | 'warehouse'

export type PropertyFormState = {
  title: string
  rentType: RentType
  category: Category
  subcategory: ResidentialSubcategory | CommercialSubcategory

  address: string
  city: string
  district: string
  metro: string
  apartmentNumber: string

  rooms: string
  totalArea: string
  livingArea: string
  kitchenArea: string
  floor: string
  floorsTotal: string
  residentialType: '' | 'flat' | 'apartments'
  price: string
  utilitiesIncluded: '' | 'included' | 'not_included'
  utilitiesPrice: string
  deposit: string
  commission: '' | '25' | '50' | '75' | '100'
  prepayment: '' | '0' | '1' | '2'
  allowChildren: boolean
  allowPets: boolean
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function normalizeUtilities(raw: unknown): '' | 'included' | 'not_included' {
  if (raw === true || raw === 'true' || raw === 'included' || raw === 1 || raw === '1') return 'included'
  if (raw === false || raw === 'false' || raw === 'not_included' || raw === 0 || raw === '0') {
    return 'not_included'
  }
  const s = str(raw).trim()
  if (s === 'included' || s === 'not_included') return s as 'included' | 'not_included'
  return ''
}

function normalizeCommission(raw: unknown): PropertyFormState['commission'] {
  if (raw === null || raw === undefined || raw === '') return ''
  const n = String(raw).replace(/%/g, '').trim()
  if (n === '25' || n === '50' || n === '75' || n === '100') return n
  return ''
}

export function mapPropertyApiToForm(p: Record<string, unknown>): PropertyFormState {
  const rentRaw = str(p.rentType ?? p.rent_type).toLowerCase()
  let rentType: RentType = ''
  if (rentRaw === 'daily' || rentRaw === 'short_term') rentType = 'daily'
  else if (rentRaw === 'long' || rentRaw === 'long_term') rentType = 'long'

  const catRaw = str(p.category).toLowerCase()
  let category: Category = ''
  if (catRaw === 'residential' || catRaw === 'жилая') category = 'residential'
  else if (catRaw === 'commercial' || catRaw === 'коммерция') category = 'commercial'

  let subRaw = str(p.subcategory ?? p.subCategory ?? '').toLowerCase()
  const allowedResidential = new Set(['apartment', 'room', 'house', 'cottage'])
  const allowedCommercial = new Set(['office', 'coworking', 'building', 'warehouse'])
  if (!subRaw) {
    const pt = str(p.propertyType ?? p.type ?? '').toLowerCase()
    if (allowedResidential.has(pt) || allowedCommercial.has(pt)) subRaw = pt
  }
  let subcategory: ResidentialSubcategory | CommercialSubcategory = ''
  if (category === 'residential' && allowedResidential.has(subRaw)) {
    subcategory = subRaw as ResidentialSubcategory
  } else if (category === 'commercial' && allowedCommercial.has(subRaw)) {
    subcategory = subRaw as CommercialSubcategory
  } else if (subRaw) {
    if (allowedResidential.has(subRaw)) {
      subcategory = subRaw as ResidentialSubcategory
      if (!category) category = 'residential'
    } else if (allowedCommercial.has(subRaw)) {
      subcategory = subRaw as CommercialSubcategory
      if (!category) category = 'commercial'
    }
  }

  const resTypeRaw = str(p.residentialType ?? p.housingType ?? p.housing_type).toLowerCase()
  let residentialType: PropertyFormState['residentialType'] = ''
  if (resTypeRaw === 'flat' || resTypeRaw === 'apartment') residentialType = 'flat'
  else if (resTypeRaw === 'apartments' || resTypeRaw === 'apartment_hotel') residentialType = 'apartments'

  const prep = str(p.prepayment ?? '')
  let prepayment: PropertyFormState['prepayment'] = ''
  if (prep === '0' || prep === '1' || prep === '2' || prep === 'none') {
    prepayment = prep === 'none' ? '0' : (prep as '0' | '1' | '2')
  }

  return {
    title: str(p.title),
    rentType,
    category,
    subcategory,
    address: str(p.address),
    city: str(p.city),
    district: str(p.district ?? p.region),
    metro: str(p.metro),
    apartmentNumber: str(p.apartmentNumber ?? p.apartment_number),
    rooms: str(p.rooms ?? p.roomsCount),
    totalArea: str(p.totalArea ?? p.area ?? p.square),
    livingArea: str(p.livingArea ?? p.living_area),
    kitchenArea: str(p.kitchenArea ?? p.kitchen_area),
    floor: str(p.floor),
    floorsTotal: str(p.totalFloors ?? p.floorsTotal ?? p.floors_total),
    residentialType,
    price: str(p.price),
    utilitiesIncluded: normalizeUtilities(p.utilitiesIncluded ?? p.utilities_included),
    utilitiesPrice: str(p.utilitiesPrice ?? p.utilities_price),
    deposit: str(p.deposit),
    commission: normalizeCommission(p.commissionPercent ?? p.commission ?? p.commission_percent),
    prepayment,
    allowChildren: Boolean(p.childrenAllowed ?? p.allowChildren ?? p.children_allowed),
    allowPets: Boolean(p.petsAllowed ?? p.allowPets ?? p.pets_allowed),
  }
}

function extractPhotoPath(ph: unknown): string {
  if (typeof ph === 'string') return ph
  if (ph && typeof ph === 'object') {
    const o = ph as Record<string, unknown>
    return String(o.url ?? o.image_url ?? o.path ?? o.src ?? o.filename ?? '')
  }
  return ''
}

export function parsePhotosFromPropertyPayload(p: Record<string, unknown>): string[] {
  const raw = p?.photos
  if (!Array.isArray(raw)) return []
  return raw.map(extractPhotoPath).filter(Boolean)
}

/** Единый вид пути для existingPhotos в PATCH и сравнения с бэком (относительный путь, с ведущим /). */
export function normalizePhotoPathForStorage(path: string): string {
  let p = path.trim()
  if (!p) return p
  if (/^https?:\/\//.test(p)) {
    try {
      p = new URL(p).pathname
    } catch {
      /* ignore */
    }
  }
  if (!p.startsWith('/')) p = `/${p}`
  return p.replace(/\/{2,}/g, '/')
}

export function parseAndNormalizePhotosFromPayload(data: Record<string, unknown>): string[] {
  return parsePhotosFromPropertyPayload(data).map(normalizePhotoPathForStorage)
}

/** Достаёт объект с полем photos из ответа API (property / data / корень). */
export function extractPropertyPhotoPayload(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (Array.isArray(d.photos)) return d
  const inner = d.property ?? d.data
  if (inner && typeof inner === 'object' && Array.isArray((inner as Record<string, unknown>).photos)) {
    return inner as Record<string, unknown>
  }
  return null
}

export function payloadHasPhotosArray(data: unknown): boolean {
  return extractPropertyPhotoPayload(data) !== null
}

export function resolvePhotoUrlForForm(photo: string): string {
  if (!photo) return photo
  if (/^https?:\/\//.test(photo)) return photo
  const base = getApiBase()
  if (photo.startsWith('/uploads')) {
    const apiBase = base || 'http://localhost:8080'
    return `${apiBase}${photo}`
  }
  if (!base) return photo
  return photo.startsWith('/') ? `${base}${photo}` : `${base}/${photo}`
}
