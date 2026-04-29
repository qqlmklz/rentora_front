import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchRecommendations, type CatalogItem } from '../../services/catalogApi'
import styles from './recommendations.module.css'

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export const RecommendationsSection: FC = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [title, setTitle] = useState('Рекомендуем для вас')

  useEffect(() => {
    let canceled = false

    async function loadRecommendations() {
      try {
        setStatus('loading')
        const recommendations = (await fetchRecommendations()).filter((x) => !x.isArchived)
        if (canceled) return
        if (recommendations.length > 0) {
          setItems(recommendations.slice(0, 4))
          setTitle('Рекомендуем для вас')
          setStatus('success')
          return
        }
        setItems([])
        setStatus('empty')
      } catch {
        if (!canceled) {
          setStatus('error')
        }
      }
    }

    loadRecommendations()

    return () => {
      canceled = true
    }
  }, [])

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className={styles.grid} aria-label="Загрузка подборки объектов">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.cardSkeleton} />
          ))}
        </div>
      )
    }

    if (status === 'empty' || status === 'error') return null

    if (!items.length) {
      return null
    }

    return (
      <div className={styles.grid}>
        {items.map((item) => {
          const hasImage = !!item.photoUrl
          const locationParts = [item.city, item.district].filter(Boolean)
          const priceValue =
            item.price === null || item.price === undefined || item.price === ''
              ? null
              : Number(String(item.price).replace(/\s/g, '').replace(',', '.'))
          const details = [
            item.propertyType,
            item.rooms !== null && item.rooms !== undefined && item.rooms !== '' ? `${item.rooms} комн.` : null,
            item.totalArea !== null && item.totalArea !== undefined && item.totalArea !== ''
              ? `${item.totalArea} м²`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <article
              key={item.id}
              className={`${styles.card} ${styles.small}`.trim()}
              onClick={() => navigate(`/properties/${encodeURIComponent(item.id)}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/properties/${encodeURIComponent(item.id)}`)
                }
              }}
            >
              <div className={styles.imageWrapper}>
                {hasImage ? (
                  <img className={styles.image} src={item.photoUrl ?? undefined} alt="" loading="lazy" />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <span>Фото скоро будет</span>
                  </div>
                )}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.priceRow}>
                  {priceValue != null && Number.isFinite(priceValue) ? (
                    <span className={styles.price}>{new Intl.NumberFormat('ru-RU').format(priceValue)} ₽</span>
                  ) : (
                    <span className={styles.priceMuted}>Цена по запросу</span>
                  )}
                </div>

                <div className={styles.meta}>{details || 'Объявление'}</div>

                {locationParts.length > 0 && (
                  <div className={styles.location}>{locationParts.join(', ')}</div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    )
  }

  if (status === 'empty' || status === 'error') return null

  return (
    <section className={styles.section} aria-labelledby="may-suit-title">
      <div className={styles.headerRow}>
        <h2 id="may-suit-title" className={styles.title}>
          {title}
        </h2>
      </div>
      {renderContent()}
    </section>
  )
}

