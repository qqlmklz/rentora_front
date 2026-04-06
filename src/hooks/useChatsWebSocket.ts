import { useEffect, useRef } from 'react'
import { getChatsWebSocketUrl, parseChatMessage, type ChatMessage } from '../services/chatsApi'

export type ChatsWsNewMessagePayload = {
  chatId: string
  message: ChatMessage
}

type UseChatsWebSocketOptions = {
  enabled: boolean
  onNewMessage: (payload: ChatsWsNewMessagePayload) => void
}

function parseWsPayload(raw: string): ChatsWsNewMessagePayload | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (o.type !== 'new_message') return null
  const chatId = o.chatId ?? o.chat_id
  if (chatId == null || String(chatId).trim() === '') return null
  const rawMsg = o.message ?? o.payload ?? o.data
  const message = parseChatMessage(rawMsg)
  if (!message) return null
  return { chatId: String(chatId), message }
}

/**
 * Подключение к /ws/chats с token в query, переподключение при обрыве.
 * Закрытие при unmount и при удалении token в другой вкладке (storage).
 */
export function useChatsWebSocket({ enabled, onNewMessage }: UseChatsWebSocketOptions): void {
  const onNewMessageRef = useRef(onNewMessage)
  onNewMessageRef.current = onNewMessage

  useEffect(() => {
    if (!enabled) return

    let closed = false
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    const clearTimer = () => {
      if (reconnectTimer != null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    function scheduleReconnect() {
      if (closed) return
      if (!localStorage.getItem('token')) return
      clearTimer()
      const delay = Math.min(1000 * 2 ** attempts, 30_000)
      attempts += 1
      reconnectTimer = setTimeout(connect, delay)
    }

    function connect() {
      if (closed) return
      const token = localStorage.getItem('token')
      if (!token) return

      let url = getChatsWebSocketUrl()
      const sep = url.includes('?') ? '&' : '?'
      url = `${url}${sep}token=${encodeURIComponent(token)}`

      try {
        ws = new WebSocket(url)
      } catch {
        scheduleReconnect()
        return
      }

      ws.onopen = () => {
        attempts = 0
      }

      ws.onmessage = (ev) => {
        const parsed = parseWsPayload(String(ev.data))
        if (!parsed) return
        onNewMessageRef.current(parsed)
      }

      ws.onerror = () => {}

      ws.onclose = () => {
        ws = null
        if (closed) return
        scheduleReconnect()
      }
    }

    connect()

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        closed = true
        clearTimer()
        if (ws && ws.readyState === WebSocket.OPEN) ws.close()
        ws = null
      }
    }
    window.addEventListener('storage', onStorage)

    const onLogout = () => {
      closed = true
      clearTimer()
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close()
      }
      ws = null
    }
    window.addEventListener('rentora:logout', onLogout)

    return () => {
      closed = true
      clearTimer()
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('rentora:logout', onLogout)
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close()
      }
      ws = null
    }
  }, [enabled])
}
