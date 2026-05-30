export function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL
  if (base && typeof base === 'string') return base.replace(/\/$/, '')
  // Запасной URL для dev/preview без .env
  if (typeof window !== 'undefined' && window.location.port === '4173') {
    return 'http://localhost:8080'
  }
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
