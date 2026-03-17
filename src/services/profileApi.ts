import { getProfileUrl, getAuthHeaders, getApiBase } from './api'

function resolveAvatarUrl(value?: string | null): string | null {
  if (!value) return null
  if (/^https?:\/\//.test(value)) return value
  const base = getApiBase()
  if (!base) return value
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`
}

export type Profile = {
  id?: string
  name: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
}

export async function fetchProfile(): Promise<Profile> {
  const url = getProfileUrl('/api/profile')
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : `Profile fetch failed: ${res.status}`)
  const data = await res.json()
  return {
    ...data,
    avatarUrl: resolveAvatarUrl(data.avatarUrl ?? data.avatar ?? null),
  }
}

export async function updateProfile(data: { name?: string; email?: string; phone?: string | null }): Promise<Profile> {
  const url = getProfileUrl('/api/profile')
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text().catch(() => `Update failed: ${res.status}`))
  const updated = await res.json()
  return {
    ...updated,
    avatarUrl: resolveAvatarUrl(updated.avatarUrl ?? updated.avatar ?? null),
  }
}

export async function updateAvatar(file: File): Promise<{ avatarUrl?: string }> {
  const url = getProfileUrl('/api/profile/avatar')
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('avatar', file)
  const res = await fetch(url, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text().catch(() => `Avatar update failed: ${res.status}`))
  const data = await res.json()
  return { avatarUrl: resolveAvatarUrl(data.avatarUrl ?? data.avatar ?? null) ?? undefined }
}

export async function deleteAvatar(): Promise<void> {
  const url = getProfileUrl('/api/profile/avatar')
  const res = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await res.text().catch(() => `Avatar delete failed: ${res.status}`))
}

export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  const url = getProfileUrl('/api/profile/password')
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text().catch(() => `Password change failed: ${res.status}`))
}
