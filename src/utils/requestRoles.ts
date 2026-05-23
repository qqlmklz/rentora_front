/** Compare user ids from API / localStorage (string-safe). */
export function isSameUser(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null || a === '' || b === '') return false
  return String(a) === String(b)
}

export function isRequestOwner(
  currentUserId: string | null | undefined,
  propertyOwnerId: string | null | undefined,
  propertyNestedOwnerId?: string | null | undefined,
): boolean {
  const ownerId = propertyOwnerId ?? propertyNestedOwnerId
  return isSameUser(currentUserId, ownerId)
}

export function isRequestTenant(
  currentUserId: string | null | undefined,
  requesterId: string | null | undefined,
): boolean {
  return isSameUser(currentUserId, requesterId)
}

export function isChatLandlord(
  currentUserId: string | null | undefined,
  propertyOwnerId: string | null | undefined,
): boolean {
  return isSameUser(currentUserId, propertyOwnerId)
}

export function isChatTenant(
  currentUserId: string | null | undefined,
  propertyOwnerId: string | null | undefined,
): boolean {
  if (currentUserId == null || propertyOwnerId == null) return false
  return String(currentUserId) !== String(propertyOwnerId)
}
