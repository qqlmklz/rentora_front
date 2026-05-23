export function getCurrentUserId(): string | null {
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

export function hasAuthToken(): boolean {
  return Boolean(localStorage.getItem('token'))
}
