import { getApiBase, getAuthHeaders, getProfileUrl } from './api'

export type RequestPropertyInfo = {
  id: string
  title: string | null
  photoUrl: string | null
  address: string | null
  city: string | null
  district: string | null
  ownerId: string | null
}

export type ProfileRequestItem = {
  id: string
  status: string
  priority: 'low' | 'medium' | 'high'
  priorityPending: boolean
  priorityStatus: 'pending' | 'ready' | 'fallback'
  title: string | null
  category: string | null
  createdAt: string | null
  description: string | null
  requestPhotos: string[]
  priorityReason: string | null
  resolutionType: 'owner' | 'tenant' | null
  expenseAmount: number | null
  expenseComment: string | null
  expensePhotos: string[]
  /** True if owner confirmed tenant-submitted expenses (when returned by API). */
  expenseConfirmedByOwner: boolean
  /** Заявка в архиве (сервер) или выведена из активных по статусу completed/closed/done. */
  isArchived: boolean
  currentUserRole: 'owner' | 'tenant' | null
  currentUserId: string | null
  requesterId: string | null
  ownerId: string | null
  propertyOwnerId: string | null
  canMakeDecision: boolean
  canSubmitExpense: boolean
  requesterName: string | null
  createdByName: string | null
  property: RequestPropertyInfo
}

export type ProfileRequestsResponse = {
  activeRequests: ProfileRequestItem[]
  archivedRequests: ProfileRequestItem[]
}

export type RequestPropertyOption = RequestPropertyInfo

export type CreateProfileRequestPayload = {
  propertyId: number
  title: string
  description: string
  category: string
  photos?: File[]
}

export type RequestDecisionResolutionType = 'owner' | 'tenant'

export type SubmitRequestExpensePayload = {
  amount: number
  comment: string
  photos?: File[]
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

function extractFirstPhoto(raw: Record<string, unknown>): string | null {
  const photos = raw.photos
  if (Array.isArray(photos) && photos.length > 0) {
    const first = photos[0]
    if (typeof first === 'string') return resolveAssetUrl(first)
    if (first && typeof first === 'object') {
      const obj = first as Record<string, unknown>
      const path = String(obj.url ?? obj.image_url ?? obj.path ?? obj.src ?? obj.filename ?? '')
      return path ? resolveAssetUrl(path) : null
    }
  }
  const single = raw.photoUrl ?? raw.image ?? raw.cover ?? raw.photo
  if (typeof single === 'string') return resolveAssetUrl(single)
  return null
}

function coerceIdString(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  if (typeof raw === 'string') {
    const t = raw.trim()
    return t === '' ? null : t
  }
  const s = String(raw).trim()
  return s === '' ? null : s
}

function normalizeProperty(raw: unknown): RequestPropertyInfo | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const id =
    p.id ??
    p._id ??
    p.propertyId ??
    p.property_id ??
    p.listingId ??
    p.listing_id ??
    p.advertisementId ??
    p.advertisement_id ??
    p.estateId ??
    p.estate_id
  const idStr = coerceIdString(id)
  if (idStr === null) return null
  return {
    id: idStr,
    title: (p.title as string) ?? null,
    photoUrl: extractFirstPhoto(p),
    address: (p.address as string) ?? null,
    city: (p.city as string) ?? null,
    district: (p.district ?? p.region) as string | null,
    ownerId: coerceIdString(p.ownerId ?? p.owner_id ?? p.userId ?? p.user_id ?? p.landlordId ?? p.landlord_id),
  }
}

/** То же поле id, что normalizeProperty, но без отбрасывания при «нестандартном» типе. */
function loosePropertyInfoFromPlainObject(p: Record<string, unknown>): RequestPropertyInfo | null {
  const idStr = coerceIdString(
    p.id ??
      p._id ??
      p.propertyId ??
      p.property_id ??
      p.listingId ??
      p.listing_id ??
      p.advertisementId ??
      p.advertisement_id ??
      p.estateId ??
      p.estate_id,
  )
  if (idStr === null) return null
  return {
    id: idStr,
    title: (p.title as string) ?? null,
    photoUrl: extractFirstPhoto(p),
    address: (p.address as string) ?? null,
    city: (p.city as string) ?? null,
    district: (p.district ?? p.region) as string | null,
    ownerId: coerceIdString(p.ownerId ?? p.owner_id ?? p.userId ?? p.user_id ?? p.landlordId ?? p.landlord_id),
  }
}

/** Если в ответе нет вложенного объекта объявления — не терять заявку: минимальный property по полям корня. */
function fallbackPropertyFromRequest(r: Record<string, unknown>, requestId: string): RequestPropertyInfo {
  const pid =
    r.propertyId ??
    r.advertisementId ??
    r.listingId ??
    r.property_id ??
    r.advertisement_id ??
    r.ad_id
  const id =
    pid !== undefined && pid !== null && String(pid).trim() !== ''
      ? String(pid)
      : `request-${requestId}`
  return {
    id,
    title: null,
    photoUrl: null,
    address: null,
    city: null,
    district: null,
    ownerId: null,
  }
}

function normalizePhotoList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') return resolveAssetUrl(item)
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        const path = String(obj.url ?? obj.image_url ?? obj.path ?? obj.src ?? obj.filename ?? '')
        return path ? resolveAssetUrl(path) : null
      }
      return null
    })
    .filter(Boolean) as string[]
}

function extractResponseBodyLog(body: unknown): unknown {
  if (Array.isArray(body)) return body.slice(0, 5)
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    if (Array.isArray(obj.items)) return { ...obj, items: obj.items.slice(0, 5) }
    if (Array.isArray(obj.requests)) return { ...obj, requests: obj.requests.slice(0, 5) }
    if (Array.isArray(obj.data)) return { ...obj, data: obj.data.slice(0, 5) }
    if (
      obj.data &&
      typeof obj.data === 'object' &&
      !Array.isArray(obj.data) &&
      (Array.isArray((obj.data as Record<string, unknown>).activeRequests) ||
        Array.isArray((obj.data as Record<string, unknown>).archivedRequests) ||
        Array.isArray((obj.data as Record<string, unknown>).active_requests) ||
        Array.isArray((obj.data as Record<string, unknown>).archived_requests))
    ) {
      const d = obj.data as Record<string, unknown>
      return {
        ...obj,
        data: {
          ...d,
          activeRequests: Array.isArray(d.activeRequests) ? d.activeRequests.slice(0, 5) : d.activeRequests,
          archivedRequests: Array.isArray(d.archivedRequests)
            ? d.archivedRequests.slice(0, 5)
            : d.archivedRequests,
          active_requests: Array.isArray(d.active_requests) ? d.active_requests.slice(0, 5) : d.active_requests,
          archived_requests: Array.isArray(d.archived_requests)
            ? d.archived_requests.slice(0, 5)
            : d.archived_requests,
        },
      }
    }
    if (
      Array.isArray(obj.activeRequests) ||
      Array.isArray(obj.archivedRequests) ||
      Array.isArray(obj.active_requests) ||
      Array.isArray(obj.archived_requests)
    ) {
      return {
        ...obj,
        activeRequests: Array.isArray(obj.activeRequests) ? obj.activeRequests.slice(0, 5) : obj.activeRequests,
        archivedRequests: Array.isArray(obj.archivedRequests)
          ? obj.archivedRequests.slice(0, 5)
          : obj.archivedRequests,
        active_requests: Array.isArray(obj.active_requests) ? obj.active_requests.slice(0, 5) : obj.active_requests,
        archived_requests: Array.isArray(obj.archived_requests)
          ? obj.archived_requests.slice(0, 5)
          : obj.archived_requests,
      }
    }
  }
  return body
}

function extractRequestItemId(r: Record<string, unknown>): string | null {
  return coerceIdString(r.id ?? r._id ?? r.requestId)
}

/** Сначала только `property` из ответа (как прислал backend), без подмены другими полями заявки. */
function resolvePropertyForItem(r: Record<string, unknown>, requestIdStr: string): RequestPropertyInfo {
  const prop = r.property
  if (prop != null && typeof prop === 'object' && !Array.isArray(prop)) {
    const p = prop as Record<string, unknown>
    const fromNested = normalizeProperty(p) ?? loosePropertyInfoFromPlainObject(p)
    if (fromNested) return fromNested
    return {
      id: `property-${requestIdStr}`,
      title: (p.title as string) ?? null,
      photoUrl: extractFirstPhoto(p),
      address: (p.address as string) ?? null,
      city: (p.city as string) ?? null,
      district: (p.district ?? p.region) as string | null,
      ownerId: coerceIdString(p.ownerId ?? p.owner_id ?? p.userId ?? p.user_id ?? p.landlordId ?? p.landlord_id),
    }
  }

  return (
    normalizeProperty(r.advertisement) ??
    normalizeProperty(r.listing) ??
    normalizeProperty(r.realEstate ?? r.real_estate) ??
    normalizeProperty(r.realty) ??
    normalizeProperty(r.estate) ??
    normalizeProperty(r.housing) ??
    normalizeProperty(r.announcement) ??
    normalizeProperty(r.flat) ??
    normalizeProperty(r.building) ??
    normalizeProperty(r.propertySnapshot ?? r.property_snapshot) ??
    normalizeProperty(r.advertisementSnapshot ?? r.advertisement_snapshot) ??
    normalizeProperty(r.listingSnapshot ?? r.listing_snapshot) ??
    normalizeProperty(r.propertyInfo ?? r.property_info) ??
    normalizeProperty(r) ??
    fallbackPropertyFromRequest(r, requestIdStr)
  )
}

function normalizeRequestItem(raw: unknown): ProfileRequestItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const idStr = extractRequestItemId(r)
  if (idStr === null) return null

  const propertyCandidate = resolvePropertyForItem(r, idStr)

  const rawPriority = String(r.priority ?? r.requestPriority ?? '').trim().toLowerCase()
  const rawPriorityReason = String(r.priority_reason ?? r.priorityReason ?? r.ai_reason ?? '').trim()
  const rawPriorityScore = Number(r.priority_score ?? r.priorityScore ?? NaN)
  const reasonNormalized = rawPriorityReason.toLowerCase()
  const pendingByRule = rawPriorityScore === 0 && reasonNormalized === 'приоритет определяется'
  const fallbackByRule = rawPriorityScore === 0 && reasonNormalized === 'приоритет определён по умолчанию'
  const priorityStatus: 'pending' | 'ready' | 'fallback' =
    pendingByRule ? 'pending' : fallbackByRule ? 'fallback' : 'ready'
  const priorityPending = priorityStatus === 'pending'
  const priority: 'low' | 'medium' | 'high' =
    rawPriority === 'low' || rawPriority === 'high' ? rawPriority : 'medium'
  const priorityReason =
    priorityStatus === 'ready'
      ? rawPriorityReason || null
      : priorityStatus === 'pending'
        ? 'Приоритет определяется'
        : 'Приоритет определён по умолчанию'
  const rawResolutionType = String(
    r.resolution_type ?? r.resolutionType ?? '',
  ).trim().toLowerCase()
  const resolutionType: 'owner' | 'tenant' | null =
    rawResolutionType === 'owner' || rawResolutionType === 'tenant' ? rawResolutionType : null
  const rawCurrentUserRole = String(
    r.current_user_role ?? r.currentUserRole ?? r.user_role ?? '',
  ).trim().toLowerCase()
  const currentUserRole: 'owner' | 'tenant' | null =
    rawCurrentUserRole === 'owner' || rawCurrentUserRole === 'tenant' ? rawCurrentUserRole : null
  const requesterId =
    (r.requesterId ??
      (r.requester && typeof r.requester === 'object'
        ? (r.requester as Record<string, unknown>).id ?? (r.requester as Record<string, unknown>)._id
        : null) ??
      (r.createdBy && typeof r.createdBy === 'object'
        ? (r.createdBy as Record<string, unknown>).id ?? (r.createdBy as Record<string, unknown>)._id
        : null) ??
      null) as string | null
  const ownerId = coerceIdString(
    r.ownerId ??
      r.owner_id ??
      (r.owner && typeof r.owner === 'object'
        ? (r.owner as Record<string, unknown>).id ?? (r.owner as Record<string, unknown>)._id
        : null),
  )
  const propertyOwnerId = coerceIdString(
    r.propertyOwnerId ??
      r.property_owner_id ??
      propertyCandidate.ownerId ??
      (r.property && typeof r.property === 'object'
        ? (r.property as Record<string, unknown>).ownerId ?? (r.property as Record<string, unknown>).owner_id
        : null),
  )
  const currentUserId =
    (r.currentUserId ??
      (r.currentUser && typeof r.currentUser === 'object'
        ? (r.currentUser as Record<string, unknown>).id ?? (r.currentUser as Record<string, unknown>)._id
        : null) ??
      null) as string | null
  const status = String(r.status ?? r.state ?? 'pending')
  const normalizedStatus = status.toLowerCase()
  const rawArchived = r.is_archived ?? r.isArchived
  const isArchived =
    rawArchived === true ||
    rawArchived === 'true' ||
    normalizedStatus === 'completed' ||
    normalizedStatus === 'closed' ||
    normalizedStatus === 'done'
  const canMakeDecision =
    Boolean(r.can_make_decision ?? r.canMakeDecision) ||
    (currentUserRole === 'owner' && (normalizedStatus === 'pending' || normalizedStatus === 'in_review'))
  const isTenantScenario = rawResolutionType === 'tenant' || normalizedStatus === 'tenant_resolves'
  const isRequesterTenant =
    requesterId && currentUserId ? String(requesterId) === String(currentUserId) : true
  const canSubmitExpense =
    Boolean(r.can_submit_expense ?? r.canSubmitExpense) ||
    (currentUserRole === 'tenant' && isTenantScenario && isRequesterTenant)

  return {
    id: idStr,
    status,
    priority,
    priorityPending,
    priorityStatus,
    title: (r.title ?? r.subject ?? r.name ?? null) as string | null,
    category: (r.category ?? r.type ?? null) as string | null,
    createdAt: (r.createdAt ?? r.created_at ?? r.dateCreated ?? null) as string | null,
    description: (r.description ?? r.comment ?? r.message ?? r.text ?? null) as string | null,
    requestPhotos: normalizePhotoList(
      r.request_photos ?? r.requestPhotos ?? r.request_images ?? r.requestImages ?? r.request_attachments,
    ),
    priorityReason,
    resolutionType,
    expenseAmount:
      typeof r.expense_amount === 'number'
        ? r.expense_amount
        : typeof r.expenseAmount === 'number'
          ? r.expenseAmount
          : null,
    expenseComment: (r.expense_comment ?? r.expenseComment ?? null) as string | null,
    expensePhotos: normalizePhotoList(r.expense_photos ?? r.expensePhotos),
    expenseConfirmedByOwner: Boolean(
      r.expense_confirmed_by_owner ??
        r.expenseConfirmedByOwner ??
        r.expense_confirmed ??
        r.expenseConfirmed ??
        r.owner_confirmed_expense ??
        r.ownerConfirmedExpense,
    ),
    isArchived,
    currentUserRole,
    currentUserId: currentUserId ? String(currentUserId) : null,
    requesterId: requesterId ? String(requesterId) : null,
    ownerId,
    propertyOwnerId,
    canMakeDecision,
    canSubmitExpense,
    requesterName:
      (r.requesterName ??
        (r.requester && typeof r.requester === 'object'
          ? (r.requester as Record<string, unknown>).name
          : null) ??
        null) as string | null,
    createdByName:
      (r.createdByName ??
        r.requesterName ??
        r.creatorName ??
        (r.createdBy && typeof r.createdBy === 'object'
          ? (r.createdBy as Record<string, unknown>).name
          : null) ??
        (r.user && typeof r.user === 'object'
          ? (r.user as Record<string, unknown>).name
          : null) ??
        null) as string | null,
    property: propertyCandidate,
  }
}

function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj.items)) return obj.items
  if (Array.isArray(obj.requests)) return obj.requests
  if (Array.isArray(obj.data)) return obj.data
  return []
}

function toRequests(list: unknown): ProfileRequestItem[] {
  if (!Array.isArray(list)) return []
  const out: ProfileRequestItem[] = []
  for (const item of list) {
    console.log('RAW ITEM', item)
    const normalized = normalizeRequestItem(item)
    console.log('NORMALIZED', normalized)
    if (normalized) out.push(normalized)
  }
  return out
}

function pickFirstArray(
  obj: Record<string, unknown>,
  keys: string[],
): unknown[] | null {
  for (const key of keys) {
    const value = obj[key]
    if (Array.isArray(value)) return value
  }
  return null
}

function dedupeRequestRawById(items: unknown[]): unknown[] {
  const seen = new Set<string>()
  const out: unknown[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const sid = extractRequestItemId(r)
    if (sid === null) continue
    if (seen.has(sid)) continue
    seen.add(sid)
    out.push(raw)
  }
  return out
}

function isLikelyRequestItemRow(x: unknown): boolean {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false
  const o = x as Record<string, unknown>
  return o.id != null || o._id != null || o.requestId != null
}

function objectHasRequestLikeArray(o: Record<string, unknown>): boolean {
  for (const v of Object.values(o)) {
    if (Array.isArray(v) && v.length > 0 && isLikelyRequestItemRow(v[0])) return true
  }
  return false
}

/** Рекурсивно находим массивы объектов с id (имена полей на бэкенде могут быть любыми). */
function collectLikelyRequestArrays(
  node: unknown,
  depth: number,
  path: string,
  acc: { keyPath: string; arr: unknown[] }[],
): void {
  if (!node || typeof node !== 'object' || depth <= 0) return
  if (Array.isArray(node)) return
  const o = node as Record<string, unknown>
  for (const key of Object.keys(o)) {
    const v = o[key]
    const nextPath = path ? `${path}.${key}` : key
    if (Array.isArray(v) && v.length > 0 && isLikelyRequestItemRow(v[0])) {
      acc.push({ keyPath: nextPath, arr: v })
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      collectLikelyRequestArrays(v, depth - 1, nextPath, acc)
    }
  }
}

function partitionDiscoveredLists(
  discovered: { keyPath: string; arr: unknown[] }[],
): { active: unknown[]; archived: unknown[] } {
  if (discovered.length === 0) return { active: [], archived: [] }
  const toArch: unknown[] = []
  const toAct: unknown[] = []
  const unassigned: { keyPath: string; arr: unknown[] }[] = []
  for (const d of discovered) {
    const kl = d.keyPath.toLowerCase()
    if (/archiv|архив|past|completed|closed|done|истор|storage|old|history/.test(kl)) {
      toArch.push(...d.arr)
    } else if (
      /active|актив|current|open|pending|нов|incoming|request|items|my|owner|tenant|list|result|data/.test(kl)
    ) {
      toAct.push(...d.arr)
    } else {
      unassigned.push(d)
    }
  }
  let active = dedupeRequestRawById(toAct)
  let archived = dedupeRequestRawById(toArch)
  if (active.length === 0 && archived.length === 0 && unassigned.length > 0) {
    active = dedupeRequestRawById(unassigned[0].arr)
    if (unassigned.length > 1) archived = dedupeRequestRawById(unassigned[1].arr)
    else if (unassigned.length === 1 && unassigned[0].arr.length > 0) {
      /* один массив без подсказки в имени — считаем активными */
    }
  }
  return { active, archived }
}

/** Берём объект, где лежат списки: корень или вложенный `data` (как у бэкенда). */
function resolveProfileRequestsPayloadObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const root = data as Record<string, unknown>
  const nested = root.data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const d = nested as Record<string, unknown>
    const hasRequestLists =
      'activeRequests' in d ||
      'archivedRequests' in d ||
      'active_requests' in d ||
      'archived_requests' in d ||
      'requests' in d ||
      'items' in d ||
      'myRequests' in d ||
      'my_requests' in d ||
      'ownerRequests' in d ||
      'owner_requests' in d ||
      objectHasRequestLikeArray(d)
    if (hasRequestLists) {
      return d
    }
  }
  return root
}

function parseProfileRequestsResponse(data: unknown): ProfileRequestsResponse {
  if (Array.isArray(data)) {
    return { activeRequests: toRequests(data), archivedRequests: [] }
  }
  const obj = resolveProfileRequestsPayloadObject(data)
  if (!obj) {
    return { activeRequests: [], archivedRequests: [] }
  }

  let activeRaw = pickFirstArray(obj, ['activeRequests', 'active_requests']) ?? []
  let archivedRaw = pickFirstArray(obj, ['archivedRequests', 'archived_requests']) ?? []

  if (activeRaw.length === 0 && archivedRaw.length === 0) {
    const legacySingle = pickFirstArray(obj, ['requests', 'items'])
    if (legacySingle && legacySingle.length > 0) {
      activeRaw = legacySingle
    } else {
      const my = pickFirstArray(obj, ['myRequests', 'my_requests']) ?? []
      const owner = pickFirstArray(obj, ['ownerRequests', 'owner_requests', 'requestsForMyProperties']) ?? []
      if (my.length > 0 || owner.length > 0) {
        activeRaw = dedupeRequestRawById([...my, ...owner])
      }
    }
  }

  if (activeRaw.length === 0 && archivedRaw.length === 0) {
    const discovered: { keyPath: string; arr: unknown[] }[] = []
    collectLikelyRequestArrays(obj, 5, '', discovered)
    const part = partitionDiscoveredLists(discovered)
    activeRaw = part.active
    archivedRaw = part.archived
  }

  return {
    activeRequests: toRequests(activeRaw),
    archivedRequests: toRequests(archivedRaw),
  }
}

export async function fetchProfileRequests(): Promise<ProfileRequestsResponse> {
  const url = getProfileUrl('/api/profile/requests')
  console.log('[Requests API] profile requests URL:', url)
  const res = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store' })
  const responseBody = await res.clone().json().catch(async () => {
    const text = await res.clone().text().catch(() => '')
    return text || null
  })
  console.log('[Requests API] profile requests response:', {
    status: res.status,
    body: extractResponseBodyLog(responseBody),
  })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Не удалось загрузить заявки: ${res.status}`))
  }
  const data = await res.json()
  return parseProfileRequestsResponse(data)
}

export async function createProfileRequest(payload: CreateProfileRequestPayload): Promise<ProfileRequestItem | null> {
  const base = getApiBase() || 'http://localhost:8080'
  const url = `${base}/api/requests`
  const normalizedPropertyId = Number(payload.propertyId)
  const requestPayload = {
    propertyId: normalizedPropertyId,
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category.trim(),
  }
  const files = payload.photos ?? []
  const hasPhotos = files.length > 0
  console.log('[Requests API] create request:', {
    url,
    method: 'POST',
    payload: requestPayload,
    hasPhotos,
    photosCount: files.length,
  })

  const res = await (async () => {
    if (!hasPhotos) {
      return fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestPayload),
      })
    }

    const formData = new FormData()
    formData.append('propertyId', String(requestPayload.propertyId))
    formData.append('title', requestPayload.title)
    formData.append('description', requestPayload.description)
    formData.append('category', requestPayload.category)
    files.forEach((file, index) => {
      formData.append('photos[]', file, file.name || `request-photo-${index + 1}.jpg`)
    })

    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    })
  })()
  const responseBody = await res.clone().json().catch(async () => {
    const text = await res.clone().text().catch(() => '')
    return text || null
  })
  console.log('[Requests API] create response:', {
    status: res.status,
    body: responseBody,
  })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Не удалось создать заявку: ${res.status}`))
  }
  const data = await res.json().catch(() => null)
  if (!data) return null
  return normalizeRequestItem(data) ?? normalizeRequestItem((data as Record<string, unknown>).request) ?? null
}

export async function setRequestDecision(
  requestId: string,
  resolutionType: RequestDecisionResolutionType,
): Promise<ProfileRequestItem | null> {
  const url = getProfileUrl(`/api/requests/${encodeURIComponent(requestId)}/set-resolution`)
  console.log('[Requests API] decision request:', { requestId, resolutionType, url })
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ resolution_type: resolutionType }),
  })
  const responseBody = await res.clone().json().catch(async () => {
    const text = await res.clone().text().catch(() => '')
    return text || null
  })
  console.log('[Requests API] decision response:', {
    requestId,
    resolutionType,
    status: res.status,
    body: responseBody,
  })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Не удалось обновить решение: ${res.status}`))
  }
  const data = await res.json().catch(() => null)
  if (!data) return null
  return normalizeRequestItem(data) ?? normalizeRequestItem((data as Record<string, unknown>).request) ?? null
}

export async function submitRequestExpense(
  requestId: string,
  payload: SubmitRequestExpensePayload,
): Promise<ProfileRequestItem | null> {
  const url = getProfileUrl(`/api/requests/${encodeURIComponent(requestId)}/expense`)
  const formData = new FormData()
  formData.append('expenseAmount', String(payload.amount))
  formData.append('expenseComment', payload.comment.trim())
  ;(payload.photos ?? []).forEach((photo, index) => {
    formData.append('expensePhotos', photo, photo.name || `expense-${index + 1}.jpg`)
  })
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: formData,
  })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Не удалось сохранить расходы: ${res.status}`))
  }
  const data = await res.json().catch(() => null)
  if (!data) return null
  return normalizeRequestItem(data) ?? normalizeRequestItem((data as Record<string, unknown>).request) ?? null
}

/** Owner confirms tenant-submitted expenses; backend should set status to completed. */
export async function confirmRequestExpense(requestId: string): Promise<ProfileRequestItem | null> {
  const url = getProfileUrl(`/api/requests/${encodeURIComponent(requestId)}/confirm-tenant-expenses`)
  console.log('[Requests API] confirm tenant expenses:', { requestId, url, method: 'POST' })
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
  })
  const responseBody = await res.clone().json().catch(async () => {
    const text = await res.clone().text().catch(() => '')
    return text || null
  })
  console.log('[Requests API] confirm tenant expenses response:', {
    requestId,
    status: res.status,
    body: responseBody,
  })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Не удалось подтвердить расходы: ${res.status}`))
  }
  const data = await res.json().catch(() => null)
  if (!data) return null

  const envelope = data as Record<string, unknown>
  const rawRequest = envelope.request
  console.log('[Requests API] diagnose confirm POST /confirm-tenant-expenses → response.request:', rawRequest)
  if (rawRequest && typeof rawRequest === 'object') {
    const rq = rawRequest as Record<string, unknown>
    const st = String(rq.status ?? rq.state ?? '').toLowerCase()
    console.log(
      '[Requests API] diagnose confirm: UI «Архив» = status==="completed"; response.request.status:',
      rq.status ?? rq.state,
    )
    if (st === 'completed') {
      console.log(
        '[Requests API] diagnose confirm: status is completed → после refetch GET /api/profile/requests заявка должна попасть во вкладку «Архив»',
      )
    } else {
      console.warn(
        '[Requests API] diagnose confirm: status is not "completed" → вкладка «Архив» на фронте не покажет заявку; проверьте backend',
        { status: rq.status, state: rq.state },
      )
    }
  } else {
    console.warn(
      '[Requests API] diagnose confirm: response.request is missing or not an object → check backend response envelope',
    )
  }

  return normalizeRequestItem(data) ?? normalizeRequestItem(rawRequest) ?? null
}

/** Владелец завершает заявку при сценарии resolution_type === owner (ожидается status completed). */
export async function completeOwnerRequest(requestId: string): Promise<ProfileRequestItem | null> {
  const url = getProfileUrl(`/api/requests/${encodeURIComponent(requestId)}/complete-owner-request`)
  console.log('[Requests API] complete owner request:', { requestId, url, method: 'POST' })
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
  })
  const responseBody = await res.clone().json().catch(async () => {
    const text = await res.clone().text().catch(() => '')
    return text || null
  })
  console.log('[Requests API] complete owner request response:', {
    requestId,
    status: res.status,
    body: responseBody,
  })
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Не удалось завершить заявку: ${res.status}`))
  }
  const data = await res.json().catch(() => null)
  if (!data) return null
  return normalizeRequestItem(data) ?? normalizeRequestItem((data as Record<string, unknown>).request) ?? null
}

export async function fetchRequestPropertyOptions(): Promise<RequestPropertyOption[]> {
  const apiBase = getApiBase() || 'http://localhost:8080'
  const primaryUrl = new URL('/api/requests/available-properties', apiBase)
  console.log('[Requests API] available properties URL:', primaryUrl.toString())

  const res = await fetch(primaryUrl.toString(), {
    headers: getAuthHeaders(),
    cache: 'no-store',
  })
  console.log('[Requests API] available properties status:', res.status)
  const resBody = await res.clone().json().catch(async () => {
    const text = await res.clone().text().catch(() => '')
    return text || null
  })
  console.log('[Requests API] available properties body:', extractResponseBodyLog(resBody))
  if (res.status === 404) {
    console.error(
      '[Requests API] endpoint not found (404):',
      primaryUrl.toString(),
      '— fallback to /api/properties',
    )
    const fallbackUrl = new URL('/api/properties', apiBase)
    console.log('[Requests API] fallback URL:', fallbackUrl.toString())
    const fallbackRes = await fetch(fallbackUrl.toString(), {
      headers: getAuthHeaders(),
      cache: 'no-store',
    })
    console.log('[Requests API] fallback status:', fallbackRes.status)
    const fallbackBody = await fallbackRes.clone().json().catch(async () => {
      const text = await fallbackRes.clone().text().catch(() => '')
      return text || null
    })
    console.log('[Requests API] fallback body:', extractResponseBodyLog(fallbackBody))
    if (!fallbackRes.ok) {
      throw new Error(
        await fallbackRes.text().catch(() => `Не удалось загрузить объявления (fallback): ${fallbackRes.status}`),
      )
    }
    const fallbackData = await fallbackRes.json()
    return extractList(fallbackData)
      .map((item) => normalizeProperty((item as Record<string, unknown>)?.property ?? item))
      .filter(Boolean) as RequestPropertyOption[]
  }
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Не удалось загрузить объявления: ${res.status}`))
  }
  const data = await res.json()
  return extractList(data)
    .map((item) => normalizeProperty((item as Record<string, unknown>)?.property ?? item))
    .filter(Boolean) as RequestPropertyOption[]
}
