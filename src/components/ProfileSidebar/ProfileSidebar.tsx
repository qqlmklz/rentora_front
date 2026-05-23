import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, type ProfileNavKey } from '../../constants/routes'

const NAV_ITEMS: { key: ProfileNavKey; label: string; to: string }[] = [
  { key: 'profile', label: 'Профиль', to: ROUTES.profile },
  { key: 'favorites', label: 'Избранное', to: ROUTES.profileFavorites },
  { key: 'properties', label: 'Мои объекты', to: ROUTES.profileProperties },
  { key: 'requests', label: 'Заявки', to: ROUTES.profileRequests },
  { key: 'documents', label: 'Документы', to: ROUTES.profileDocuments },
]

type Props = {
  active: ProfileNavKey
  /** ProfilePage uses <a> for active profile link — preserve behavior */
  profileUsesAnchor?: boolean
  linkClassName: string
  activeLinkClassName: string
}

export const ProfileSidebar: FC<Props> = ({
  active,
  profileUsesAnchor = false,
  linkClassName,
  activeLinkClassName,
}) => {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active
        const className = isActive ? activeLinkClassName : linkClassName

        if (item.key === 'profile' && profileUsesAnchor && isActive) {
          return (
            <a key={item.key} href={ROUTES.profile} className={className}>
              {item.label}
            </a>
          )
        }

        return (
          <Link key={item.key} to={item.to} className={className}>
            {item.label}
          </Link>
        )
      })}
    </>
  )
}
