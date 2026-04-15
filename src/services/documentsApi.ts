import { getAuthHeaders, getProfileUrl } from './api'
import { normalizeChatContract, type ChatContract } from './contractsApi'

export type ProfileDocumentItem = ChatContract & {
  title?: string
  chatId?: string
}

function normalizeDoc(raw: unknown): ProfileDocumentItem | null {
  const c = normalizeChatContract(raw)
  if (!c) return null
  if (!raw || typeof raw !== 'object') return c
  const r = raw as Record<string, unknown>
  return {
    ...c,
    title: r.title != null ? String(r.title) : undefined,
    chatId: r.chatId != null ? String(r.chatId) : r.chat_id != null ? String(r.chat_id) : undefined,
  }
}

/** GET /api/profile/documents */
export async function fetchProfileDocuments(): Promise<ProfileDocumentItem[]> {
  const url = getProfileUrl('/api/profile/documents')
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await res.text().catch(() => `Документы: ${res.status}`))
  const data = await res.json()
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown }).items)
      ? ((data as { items: unknown[] }).items ?? [])
      : Array.isArray((data as { documents?: unknown }).documents)
        ? ((data as { documents: unknown[] }).documents ?? [])
        : []
  return list.map(normalizeDoc).filter(Boolean) as ProfileDocumentItem[]
}
