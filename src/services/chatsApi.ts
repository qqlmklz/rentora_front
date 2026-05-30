import { getApiBase, getAuthHeaders, getProfileUrl } from './api'
import type { ChatContract } from './contractsApi'
import { normalizeChatContract } from './contractsApi'
import { getCurrentUserId } from '../utils/user'
import { resolveAssetUrl } from '../utils/resolveAssetUrl'

export { getCurrentUserId }

/** WebSocket чатов: тот же хост, что и API; `ws` / `wss` по схеме API */
export function getChatsWebSocketUrl(): string {
  const base = getApiBase()
  if (base) {
    try {
      const u = new URL(base.startsWith('http') ? base : `http://${base}`)
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
      u.pathname = '/ws/chats'
      u.search = ''
      u.hash = ''
      return u.toString()
    } catch {
      /* переходим к следующему варианту URL */
    }
  }
  return 'ws://localhost:8080/ws/chats'
}

export type ChatListItem = {
  id: string
  propertyTitle: string
  companionName: string
  companionAvatar: string | null
  lastMessage: string
  lastMessageAt: string | null
  unreadCount: number
  /** Текущий пользователь — владелец объявления (арендодатель) в этом чате */
  isLandlord: boolean
}

/** Сообщение чата: `type` совпадает с полем API `message.type` */
export type ChatMessage =
  | {
      id: string
      type: 'text'
      body: string
      isMine: boolean
      createdAt: string
    }
  | {
      id: string
      type: 'contract'
      /** id договора для GET/PATCH /api/contracts/:contractId — только с поля сообщения */
      contractId: string
      body: string
      isMine: boolean
      createdAt: string
      contract: ChatContract
    }

/** Подпись для превью в списке диалогов и WebSocket */
export function messagePreviewText(m: ChatMessage): string {
  return m.type === 'contract' ? 'Договор' : m.body
}

function normalizeCompanionName(raw: unknown): string {
  const s = raw == null ? '' : String(raw).trim()
  return s || 'Пользователь'
}

function normalizeChatListItem(raw: unknown): ChatListItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = r.id ?? r._id ?? r.chatId
  if (id == null) return null

  const property = (r.property ?? r.listing ?? {}) as Record<string, unknown>
  const peer = (r.participant ?? r.peer ?? r.counterpart ?? r.user ?? {}) as Record<string, unknown>
  const last = (typeof r.lastMessage === 'object' && r.lastMessage != null
    ? r.lastMessage
    : typeof r.last_message === 'object' && r.last_message != null
      ? r.last_message
      : {}) as Record<string, unknown>

  const lastMessageText =
    typeof r.lastMessage === 'string'
      ? r.lastMessage
      : typeof r.last_message === 'string'
        ? r.last_message
        : (() => {
            const t = String(last.type ?? last.messageType ?? last.message_type ?? '').toLowerCase()
            if (t === 'contract') return 'Договор'
            return String(last.text ?? last.body ?? r.lastMessagePreview ?? r.last_message_preview ?? '')
          })()

  const lastMessageAt =
    (typeof r.lastMessageAt === 'string' ? r.lastMessageAt : null) ??
    (typeof r.last_message_at === 'string' ? r.last_message_at : null) ??
    (last.createdAt as string) ??
    (last.created_at as string) ??
    (r.updatedAt as string) ??
    (r.updated_at as string) ??
    null

  const unreadRaw = r.unreadCount ?? r.unread_count ?? 0
  const unreadCount = Math.max(0, Math.floor(Number(unreadRaw)) || 0)

  const companionName = normalizeCompanionName(
    r.companionName ??
      r.companion_name ??
      peer.companionName ??
      peer.companion_name ??
      peer.name ??
      r.peerName ??
      r.peer_name,
  )

  const avatarRaw =
    r.companionAvatar ??
    r.companion_avatar ??
    peer.companionAvatar ??
    peer.companion_avatar ??
    peer.avatarUrl ??
    peer.avatar_url ??
    peer.avatar

  const myId = getCurrentUserId()
  /** Владелец объявления, к которому привязан чат (арендодатель) */
  const propertyOwnerId =
    property.ownerId ??
    property.owner_id ??
    property.userId ??
    property.user_id ??
    r.propertyOwnerId ??
    r.property_owner_id
  const isLandlord =
    myId != null &&
    propertyOwnerId != null &&
    String(propertyOwnerId) === String(myId)

  return {
    id: String(id),
    propertyTitle: String(property.title ?? r.propertyTitle ?? r.property_title ?? 'Объявление'),
    companionName,
    companionAvatar: resolveAssetUrl(avatarRaw != null && String(avatarRaw).trim() ? String(avatarRaw) : null),
    lastMessage: lastMessageText,
    lastMessageAt,
    unreadCount,
    isLandlord,
  }
}

export async function fetchChats(): Promise<ChatListItem[]> {
  const url = getProfileUrl('/api/chats')
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await res.text().catch(() => `Чаты: ${res.status}`))
  const data = await res.json()
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown }).items)
      ? ((data as { items: unknown[] }).items ?? [])
      : Array.isArray((data as { chats?: unknown }).chats)
        ? ((data as { chats: unknown[] }).chats ?? [])
        : []
  return list.map(normalizeChatListItem).filter(Boolean) as ChatListItem[]
}

/** Данные одного чата (GET /api/chats/:id) — для шапки и договора, не из списка */
export type OpenChatDetail = {
  id: string
  propertyOwnerId: string | null
  chat: Record<string, unknown>
}

export function normalizeOpenChatPayload(raw: unknown): OpenChatDetail | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = r.id ?? r._id ?? r.chatId
  if (id == null) return null
  const property = (r.property ?? r.listing ?? {}) as Record<string, unknown>
  let propertyOwnerId: string | null = null
  if (r.propertyOwnerId != null && String(r.propertyOwnerId).trim() !== '') {
    propertyOwnerId = String(r.propertyOwnerId)
  } else if (r.property_owner_id != null && String(r.property_owner_id).trim() !== '') {
    propertyOwnerId = String(r.property_owner_id)
  } else if (property.ownerId != null && String(property.ownerId).trim() !== '') {
    propertyOwnerId = String(property.ownerId)
  } else if (property.owner_id != null && String(property.owner_id).trim() !== '') {
    propertyOwnerId = String(property.owner_id)
  } else if (property.userId != null && String(property.userId).trim() !== '') {
    propertyOwnerId = String(property.userId)
  } else if (property.user_id != null && String(property.user_id).trim() !== '') {
    propertyOwnerId = String(property.user_id)
  }
  return {
    id: String(id),
    propertyOwnerId,
    chat: r,
  }
}

/** GET /api/chats/:chatId — открытый чат */
export async function fetchOpenChat(chatId: string): Promise<OpenChatDetail> {
  const url = getProfileUrl(`/api/chats/${encodeURIComponent(chatId)}`)
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await res.text().catch(() => `Чат: ${res.status}`))
  const data = await res.json()
  const payload =
    data &&
    typeof data === 'object' &&
    'chat' in (data as object) &&
    (data as { chat?: unknown }).chat != null &&
    typeof (data as { chat?: unknown }).chat === 'object'
      ? (data as { chat: unknown }).chat
      : data
  const normalized = normalizeOpenChatPayload(payload)
  if (!normalized) throw new Error('Некорректный ответ чата')
  return normalized
}

/** PATCH /api/chats/:id/read — отметить чат прочитанным */
export async function markChatAsRead(chatId: string): Promise<void> {
  const url = getProfileUrl(`/api/chats/${encodeURIComponent(chatId)}/read`)
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error(await res.text().catch(() => `Чат: ${res.status}`))
}

export type CreateChatResult = {
  chatId: string
  raw: unknown
}

/** POST /api/chats — создать или вернуть существующий чат по объявлению */
export async function getOrCreateChatForProperty(propertyIdParam: string): Promise<CreateChatResult> {
  const propertyId = Number(propertyIdParam)
  if (!Number.isFinite(propertyId)) {
    throw new Error('Некорректный id объявления')
  }
  console.log(propertyId)

  const url = getProfileUrl('/api/chats')
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ propertyId }),
  })
  if (!res.ok) throw new Error(await res.text().catch(() => `Чат: ${res.status}`))
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  const id =
    data.chatId ??
    data.id ??
    data._id ??
    (data.chat && typeof data.chat === 'object'
      ? (data.chat as Record<string, unknown>).chatId ??
        (data.chat as Record<string, unknown>).id ??
        (data.chat as Record<string, unknown>)._id
      : null)
  if (id == null) throw new Error('Сервер не вернул id чата')
  return { chatId: String(id), raw: data }
}

/** Разбор сообщения из API или WebSocket (new_message) */
export function parseChatMessage(raw: unknown): ChatMessage | null {
  return normalizeMessage(raw, getCurrentUserId())
}

function normalizeMessage(raw: unknown, myUserId: string | null): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = r.id ?? r._id
  if (id == null) return null
  const senderId = r.senderId ?? r.userId ?? r.fromUserId ?? r.sender_id
  const mineFromApi = r.isMine === true || r.is_mine === true
  const mine =
    mineFromApi ||
    (myUserId != null && senderId != null && String(senderId) === String(myUserId))

  const createdAt = String(r.createdAt ?? r.created_at ?? new Date().toISOString())
  const typeRaw = String(r.type ?? r.messageType ?? r.message_type ?? '').toLowerCase()
  const isContractType = typeRaw === 'contract'
  const hasContractField = r.contract != null && typeof r.contract === 'object'

  let contractRaw: unknown =
    r.contract ??
    (typeof r.payload === 'object' && r.payload != null
      ? (r.payload as Record<string, unknown>).contract
      : undefined) ??
    (isContractType || hasContractField ? (r.payload ?? r.data) : undefined)

  if (contractRaw && typeof contractRaw === 'object') {
    const cr = contractRaw as Record<string, unknown>
    if (cr.contract != null && typeof cr.contract === 'object') contractRaw = cr.contract
  }

  const wantsContract = isContractType || hasContractField
  let contract: ChatContract | null = null
  if (wantsContract) {
    contract = normalizeChatContract(contractRaw)
    if (!contract && isContractType) contract = normalizeChatContract(r)
    if (!contract && hasContractField) contract = normalizeChatContract(r.contract)
  }

  if (contract && wantsContract) {
    const nested =
      r.contract != null && typeof r.contract === 'object'
        ? (r.contract as Record<string, unknown>)
        : null
    const messageContractId = String(
      r.contractId ?? r.contract_id ?? nested?.contractId ?? nested?.contract_id ?? '',
    ).trim()
    if (messageContractId) {
      contract = { ...contract, id: messageContractId }
    }
    const preview = String(r.text ?? r.preview ?? r.body ?? 'Договор')
    return {
      id: String(id),
      type: 'contract',
      contractId: messageContractId,
      body: preview,
      isMine: mine,
      createdAt,
      contract,
    }
  }

  return {
    id: String(id),
    type: 'text',
    body: String(r.text ?? r.body ?? r.content ?? ''),
    isMine: mine,
    createdAt,
  }
}

export async function fetchChatMessages(chatId: string): Promise<ChatMessage[]> {
  const url = getProfileUrl(`/api/chats/${encodeURIComponent(chatId)}/messages`)
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await res.text().catch(() => `Сообщения: ${res.status}`))
  const data = await res.json()
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown }).items)
      ? ((data as { items: unknown[] }).items ?? [])
      : Array.isArray((data as { messages?: unknown }).messages)
        ? ((data as { messages: unknown[] }).messages ?? [])
        : []
  return list.map((m) => parseChatMessage(m)).filter(Boolean) as ChatMessage[]
}

export async function sendChatMessage(chatId: string, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const url = getProfileUrl(`/api/chats/${encodeURIComponent(chatId)}/messages`)
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text: trimmed }),
  })
  if (!res.ok) throw new Error(await res.text().catch(() => `Отправка: ${res.status}`))
}
