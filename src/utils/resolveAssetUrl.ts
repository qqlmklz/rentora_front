import { getApiBase } from '../services/api'

/** Resolve photo/upload path to absolute URL (catalog, profile, chats, forms). */
export function resolveAssetUrl(value?: string | null): string | null {
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
