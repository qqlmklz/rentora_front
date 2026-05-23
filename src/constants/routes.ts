/** Central route paths — keep in sync with `main.tsx` */
export const ROUTES = {
  home: '/',
  catalog: '/catalog',
  catalogCommercial: '/catalog?category=commercial',
  services: '/services',
  realtors: '/realtors',
  propertyNew: '/properties/new',
  propertyNewLegacy: '/new-property',
  property: (id: string) => `/properties/${encodeURIComponent(id)}`,
  propertyEdit: (id: string) => `/properties/${encodeURIComponent(id)}/edit`,
  profile: '/profile',
  profileFavorites: '/profile/favorites',
  profileProperties: '/profile/properties',
  profileRequests: '/profile/requests',
  profileDocuments: '/profile/documents',
  chats: '/chats',
  chat: (chatId: string) => `/chats/${encodeURIComponent(chatId)}`,
} as const

export function catalogSearch(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString()
  return query ? `${ROUTES.catalog}?${query}` : ROUTES.catalog
}

export type ProfileNavKey =
  | 'profile'
  | 'favorites'
  | 'properties'
  | 'requests'
  | 'documents'
