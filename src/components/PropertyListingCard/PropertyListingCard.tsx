import type { FC, ReactNode } from 'react'
import { formatListingDetails, formatListingLocation, formatPrice } from '../../utils/format'
import styles from './PropertyListingCard.module.css'

export type PropertyListingCardItem = {
  id: string
  title?: string | null
  photoUrl?: string | null
  price?: string | number | null
  propertyType?: string | null
  rooms?: string | number | null
  totalArea?: string | number | null
  area?: string | number | null
  city?: string | null
  district?: string | null
}

type Props = {
  item: PropertyListingCardItem
  photoBroken: boolean
  onPhotoError: () => void
  onOpen: () => void
  variant?: 'grid' | 'row'
  actions?: ReactNode
  className?: string
}

export const PropertyListingCard: FC<Props> = ({
  item,
  photoBroken,
  onPhotoError,
  onOpen,
  variant = 'grid',
  actions,
  className,
}) => {
  const price = formatPrice(item.price)
  const details = formatListingDetails(item)
  const location = formatListingLocation(item)
  const hasPhoto = !!item.photoUrl && !photoBroken

  const rootClass = [
    variant === 'grid' ? styles.cardGrid : styles.cardRow,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') onOpen()
  }

  return (
    <article
      className={rootClass}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={variant === 'row' ? 'Открыть объявление' : undefined}
    >
      <div className={styles.photoWrap}>
        {hasPhoto ? (
          <img
            className={styles.photo}
            src={item.photoUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={onPhotoError}
          />
        ) : (
          <span className={styles.photoFallback}>Фото</span>
        )}
      </div>

      <div className={styles.body}>
        {variant === 'row' && (
          <p className={styles.title}>{item.title || 'Без названия'}</p>
        )}
        {price && <p className={styles.price}>{price}</p>}
        {variant === 'grid' && item.title && <p className={styles.title}>{item.title}</p>}
        <p className={styles.details}>{details || 'Объявление'}</p>
        {location && <p className={styles.location}>{location}</p>}
      </div>

      {actions ? (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      ) : null}
    </article>
  )
}
