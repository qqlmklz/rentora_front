import { getAuthHeaders, getProfileUrl } from './api'

export type ContractFormFields = {
  landlordName: string
  tenantName: string
  city: string
  /** Дата заключения договора (YYYY-MM-DD) */
  contractDate: string
  address: string
  district: string
  rentType: string
  propertyType: string
  price: number | ''
  deposit: number | ''
  utilitiesIncluded: boolean
  utilitiesPrice: number | ''
  prepayment: string
  childrenAllowed: boolean
  petsAllowed: boolean
  startDate: string
  endDate: string
}

export type ContractStatus = 'pending' | 'accepted' | 'rejected' | string

export type ChatContract = ContractFormFields & {
  id: string
  status: ContractStatus
  /** Сформированный текст договора (превью) */
  contractText?: string
}

function num(v: unknown): number | '' {
  if (v === '' || v == null) return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : ''
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === 1 || v === '1') return true
  if (v === 'false' || v === 0 || v === '0') return false
  return fallback
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

export function normalizeContractDraft(raw: unknown): ContractFormFields {
  if (!raw || typeof raw !== 'object') return emptyDraft()
  const r = raw as Record<string, unknown>
  const contractDateRaw = str(r.contractDate ?? r.contract_date).slice(0, 10)
  return {
    landlordName: str(r.landlordName ?? r.landlord_name),
    tenantName: str(r.tenantName ?? r.tenant_name),
    city: str(r.city),
    contractDate: contractDateRaw,
    address: str(r.address),
    district: str(r.district),
    rentType: str(r.rentType ?? r.rent_type),
    propertyType: str(r.propertyType ?? r.property_type),
    price: num(r.price),
    deposit: num(r.deposit),
    utilitiesIncluded: bool(r.utilitiesIncluded ?? r.utilities_included),
    utilitiesPrice: num(r.utilitiesPrice ?? r.utilities_price),
    prepayment: str(r.prepayment),
    childrenAllowed: bool(r.childrenAllowed ?? r.children_allowed),
    petsAllowed: bool(r.petsAllowed ?? r.pets_allowed),
    startDate: str(r.startDate ?? r.start_date).slice(0, 10),
    endDate: str(r.endDate ?? r.end_date).slice(0, 10),
  }
}

export function emptyDraft(): ContractFormFields {
  return {
    landlordName: '',
    tenantName: '',
    city: '',
    contractDate: '',
    address: '',
    district: '',
    rentType: '',
    propertyType: '',
    price: '',
    deposit: '',
    utilitiesIncluded: false,
    utilitiesPrice: '',
    prepayment: '',
    childrenAllowed: false,
    petsAllowed: false,
    startDate: '',
    endDate: '',
  }
}

export function normalizeChatContract(raw: unknown): ChatContract | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = r.id ?? r._id ?? r.contractId
  if (id == null) return null
  const dataRaw = r.contractData ?? r.contract_data
  const dataSource =
    dataRaw != null && typeof dataRaw === 'object' && !Array.isArray(dataRaw)
      ? (dataRaw as Record<string, unknown>)
      : r
  const base = normalizeContractDraft(dataSource)
  const ctRaw = r.contractText ?? r.contract_text
  const contractText =
    ctRaw != null && String(ctRaw).trim() !== '' ? String(ctRaw) : undefined
  return {
    ...base,
    id: String(id),
    status: str(r.status ?? 'pending'),
    contractText,
  }
}

/** GET /api/chats/:chatId/contract-draft */
export async function fetchContractDraft(chatId: string): Promise<ContractFormFields> {
  const url = getProfileUrl(`/api/chats/${encodeURIComponent(chatId)}/contract-draft`)
  const res = await fetch(url, { headers: getAuthHeaders() })
  const text = await res.text().catch(() => '')
  if (!res.ok) {
    console.log('[GET /contract-draft] error response:', text || res.status)
    throw new Error(text.trim() || `Черновик: ${res.status}`)
  }
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    console.log('[GET /contract-draft] invalid JSON:', text)
    throw new Error('Некорректный ответ сервера')
  }
  return normalizeContractDraft(data)
}

/** GET /api/chats/:chatId/contract — текущий договор в чате (если есть) */
export async function fetchChatContract(chatId: string): Promise<ChatContract | null> {
  const url = getProfileUrl(`/api/chats/${encodeURIComponent(chatId)}/contract`)
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await res.text().catch(() => `Договор: ${res.status}`))
  const data = await res.json()
  return normalizeChatContract(data)
}

/** GET /api/contracts/:contractId — полный договор с текстом */
export async function fetchContract(contractId: string): Promise<ChatContract> {
  const url = getProfileUrl(`/api/contracts/${encodeURIComponent(contractId)}`)
  const res = await fetch(url, { headers: getAuthHeaders() })
  const text = await res.text().catch(() => '')
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    console.log('response GET /contracts/:id', text)
    throw new Error('Некорректный ответ сервера')
  }
  console.log('response GET /contracts/:id', data)
  if (!res.ok) throw new Error(text.trim() || `Договор: ${res.status}`)
  const c = normalizeChatContract(data)
  if (!c) throw new Error('Не удалось разобрать договор')
  return c
}

/** Тело POST /contracts — ключи в camelCase, как ожидает бэкенд */
export function buildContractPayload(fields: ContractFormFields): Record<string, unknown> {
  return {
    landlordName: fields.landlordName.trim(),
    tenantName: fields.tenantName.trim(),
    city: fields.city.trim(),
    contractDate: fields.contractDate.trim(),
    address: fields.address.trim(),
    district: fields.district.trim(),
    rentType: fields.rentType.trim(),
    propertyType: fields.propertyType.trim(),
    price: fields.price === '' ? null : Number(fields.price),
    deposit: fields.deposit === '' ? null : Number(fields.deposit),
    utilitiesIncluded: fields.utilitiesIncluded,
    utilitiesPrice: fields.utilitiesPrice === '' ? null : Number(fields.utilitiesPrice),
    prepayment: fields.prepayment.trim(),
    childrenAllowed: fields.childrenAllowed,
    petsAllowed: fields.petsAllowed,
    startDate: fields.startDate.trim(),
    endDate: fields.endDate.trim(),
  }
}

function isBlankStr(v: string): boolean {
  return !v.trim()
}

/** Возвращает текст ошибки или null, если всё заполнено */
export function validateContractFormForSubmit(fields: ContractFormFields): string | null {
  const missing: string[] = []
  const need = (label: string, ok: boolean) => {
    if (!ok) missing.push(label)
  }

  need('арендодатель', !isBlankStr(fields.landlordName))
  need('арендатор', !isBlankStr(fields.tenantName))
  need('город', !isBlankStr(fields.city))
  need('дата договора', !isBlankStr(fields.contractDate))
  need('адрес', !isBlankStr(fields.address))
  need('район', !isBlankStr(fields.district))
  need('тип аренды', !isBlankStr(fields.rentType))
  need('тип жилья', !isBlankStr(fields.propertyType))
  need('цена', fields.price !== '')
  need('залог', fields.deposit !== '')
  need('коммунальные (₽)', fields.utilitiesPrice !== '')
  need('предоплата', !isBlankStr(fields.prepayment))
  need('начало аренды', !isBlankStr(fields.startDate))
  need('окончание аренды', !isBlankStr(fields.endDate))

  if (missing.length === 0) return null
  return `Заполните обязательные поля: ${missing.join(', ')}.`
}

export function getCurrentUserDisplayName(): string {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return ''
    const u = JSON.parse(raw) as Record<string, unknown>
    const n = u.name ?? u.fullName ?? u.firstName ?? u.username ?? u.email
    return n != null ? String(n).trim() : ''
  } catch {
    return ''
  }
}

/** Дополняет черновик данными из объявления (property) и участников чата */
export function prefillContractFormFromChat(
  draft: ContractFormFields,
  chat: Record<string, unknown> | null | undefined,
  options: { isLandlord: boolean; companionName: string },
): ContractFormFields {
  const p =
    chat && typeof chat === 'object'
      ? ((chat.property ?? chat.listing ?? {}) as Record<string, unknown>)
      : {}
  const today = new Date().toISOString().slice(0, 10)
  const endDefault = new Date()
  endDefault.setFullYear(endDefault.getFullYear() + 1)
  const endStr = endDefault.toISOString().slice(0, 10)

  const me = getCurrentUserDisplayName()
  const other = options.companionName.trim()

  let out: ContractFormFields = { ...draft }

  if (options.isLandlord) {
    if (!out.landlordName.trim() && me) out.landlordName = me
    if (!out.tenantName.trim() && other) out.tenantName = other
  } else {
    if (!out.tenantName.trim() && me) out.tenantName = me
    if (!out.landlordName.trim() && other) out.landlordName = other
  }

  if (!out.city.trim() && p.city != null) out.city = str(p.city)
  if (!out.address.trim() && p.address != null) out.address = str(p.address)
  if (!out.district.trim() && p.district != null) out.district = str(p.district)

  if (!out.rentType.trim()) {
    const rt = str(p.rentType ?? p.rent_type)
    if (rt) out.rentType = rt
  }
  if (!out.propertyType.trim()) {
    const pt = str(p.propertyType ?? p.property_type ?? p.housingType ?? p.type)
    if (pt) out.propertyType = pt
  }

  if (out.price === '' && p.price != null) {
    const n = num(p.price)
    if (n !== '') out.price = n
  }
  if (out.deposit === '' && p.deposit != null) {
    const n = num(p.deposit)
    if (n !== '') out.deposit = n
  }
  if (p.utilitiesIncluded != null || p.utilities_included != null) {
    out.utilitiesIncluded = bool(p.utilitiesIncluded ?? p.utilities_included)
  }
  if (out.utilitiesPrice === '' && (p.utilitiesPrice != null || p.utilities_price != null)) {
    const n = num(p.utilitiesPrice ?? p.utilities_price)
    if (n !== '') out.utilitiesPrice = n
  }
  if (!out.prepayment.trim() && p.prepayment != null) out.prepayment = str(p.prepayment)

  if (!out.contractDate.trim()) out.contractDate = today
  if (!out.startDate.trim()) out.startDate = today
  if (!out.endDate.trim()) out.endDate = endStr

  if (!out.utilitiesIncluded && out.utilitiesPrice === '') out.utilitiesPrice = 0

  return out
}

/** POST /api/chats/:chatId/contracts */
export async function createContract(chatId: string, fields: ContractFormFields): Promise<ChatContract> {
  const url = getProfileUrl(`/api/chats/${encodeURIComponent(chatId)}/contracts`)
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const payload = buildContractPayload(fields)
  console.log('contract payload', payload)

  const body = JSON.stringify(payload)

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body,
  })
  const text = await res.text().catch(() => '')
  console.log('[CONTRACT POST] response status:', res.status)
  if (!res.ok) throw new Error(text.trim() || `Отправка договора: ${res.status}`)
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error('Некорректный ответ сервера')
  }
  console.log('response POST /contracts', data)

  const rec = data as Record<string, unknown>
  const textBody = str(rec.contractText ?? rec.contract_text)
  const hasContractText = textBody.trim().length > 0
  const hasContractData =
    (rec.contractData != null && typeof rec.contractData === 'object' && !Array.isArray(rec.contractData)) ||
    (rec.contract_data != null &&
      typeof rec.contract_data === 'object' &&
      !Array.isArray(rec.contract_data))

  if (hasContractData && !hasContractText) {
    console.log(data)
    throw new Error(
      'Текст договора не сформирован. Повторите отправку или обратитесь в поддержку.',
    )
  }

  const c = normalizeChatContract(data)
  if (!c) throw new Error('Сервер не вернул договор')
  if (!hasContractText) {
    console.log(data)
    throw new Error(
      'Текст договора не сформирован. Повторите отправку или обратитесь в поддержку.',
    )
  }
  return c
}

/** PATCH /api/contracts/:contractId/accept */
export async function acceptContract(contractId: string): Promise<void> {
  const url = getProfileUrl(`/api/contracts/${encodeURIComponent(contractId)}/accept`)
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error(await res.text().catch(() => `Принятие: ${res.status}`))
}

/** PATCH /api/contracts/:contractId/reject */
export async function rejectContract(contractId: string): Promise<void> {
  const url = getProfileUrl(`/api/contracts/${encodeURIComponent(contractId)}/reject`)
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error(await res.text().catch(() => `Отклонение: ${res.status}`))
}

/** PATCH /api/contracts/:contractId/terminate — расторжение договора */
export async function terminateContract(contractId: string): Promise<void> {
  const id = contractId != null ? String(contractId).trim() : ''
  if (!id) {
    throw new Error('Не найден id договора')
  }

  const url = getProfileUrl(`/api/contracts/${encodeURIComponent(id)}/terminate`)
  const token = localStorage.getItem('token')
  console.log('[terminateContract] contractId:', id)
  console.log('[terminateContract] URL:', url)
  console.log('[terminateContract] token:', token ? 'token exists' : 'no token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method: 'PATCH',
    headers,
  })

  const text = await res.text().catch(() => '')

  if (!res.ok) {
    console.log('[terminateContract] response.status:', res.status)
    console.log('[terminateContract] response body:', text)

    let userMessage: string | null = null
    const raw = text.trim()
    if (raw) {
      try {
        const j = JSON.parse(raw) as Record<string, unknown>
        if (typeof j.message === 'string' && j.message.trim()) {
          userMessage = j.message.trim()
        } else if (Array.isArray(j.message) && j.message.length) {
          userMessage = j.message.map((x) => String(x)).join(' ')
        }
        if (!userMessage && typeof j.error === 'string' && j.error.trim()) {
          userMessage = j.error.trim()
        }
        if (!userMessage && j.error && typeof j.error === 'object' && j.error !== null) {
          const inner = (j.error as { message?: unknown }).message
          if (typeof inner === 'string' && inner.trim()) userMessage = inner.trim()
        }
        if (!userMessage && typeof j.msg === 'string' && j.msg.trim()) {
          userMessage = j.msg.trim()
        }
      } catch {
        userMessage = raw
      }
    }

    throw new Error(userMessage ?? `Запрос не выполнен (${res.status})`)
  }

  console.log('[terminateContract] response.status:', res.status)
  console.log('[terminateContract] response body:', text.trim() === '' ? '(empty)' : text)
}
