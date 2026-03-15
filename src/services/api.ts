export function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL
  if (base && typeof base === 'string') return base.replace(/\/$/, '')
  return ''
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export function getProfileUrl(path: string): string {
  const base = getApiBase()
  return base ? `${base}${path}` : path
}
