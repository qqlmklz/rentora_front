import { getApiBase, getAuthHeaders, getProfileUrl } from './api'

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
      /* fall through */
    }
  }
  return 'ws://localhost:8080/ws/chats'
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

export type ChatListItem = {
  id: string
  propertyTitle: string
  companionName: string
  companionAvatar: string | null
  lastMessage: string
  lastMessageAt: string | null
  unreadCount: number
}

export type ChatMessage = {
  id: string
  body: string
  isMine: boolean
  createdAt: string
}

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const u = JSON.parse(raw) as Record<string, unknown>
    if (u.id != null) return String(u.id)
    if (u._id != null) return String(u._id)
    return null
  } catch {
    return null
  }
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
        : String(last.text ?? last.body ?? r.lastMessagePreview ?? r.last_message_preview ?? '')

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

  return {
    id: String(id),
    propertyTitle: String(property.title ?? r.propertyTitle ?? r.property_title ?? 'Объявление'),
    companionName,
    companionAvatar: resolveAssetUrl(avatarRaw != null && String(avatarRaw).trim() ? String(avatarRaw) : null),
    lastMessage: lastMessageText,
    lastMessageAt,
    unreadCount,
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

  return {
    id: String(id),
    body: String(r.text ?? r.body ?? r.content ?? ''),
    isMine: mine,
    createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
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
