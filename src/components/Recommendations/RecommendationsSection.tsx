import type { FC } from 'react'
import { useEffect, useState } from 'react'
import styles from './recommendations.module.css'

export type RecommendationItem = {
  id: string
  price: number | null
  propertyType: string | null
  rooms: string | null
  area: number | null
  city: string | null
  district: string | null
  imageUrl?: string | null
}

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export const RecommendationsSection: FC = () => {
  const [status, setStatus] = useState<Status>('loading')
  const [items, setItems] = useState<RecommendationItem[]>([])

  useEffect(() => {
    let canceled = false

    async function fetchRecommendations() {
      try {
        setStatus('loading')
        // TODO: заменить на реальный запрос к API / БД
        // Пример:
        // const response = await fetch('/api/recommendations')
        // const data: RecommendationItem[] = await response.json()
        // if (canceled) return
        // setItems(data)
        // setStatus(data.length ? 'success' : 'empty')

        const mockData: RecommendationItem[] = []

        if (canceled) return

        if (!mockData.length) {
          setItems([])
          setStatus('empty')
        } else {
          setItems(mockData)
          setStatus('success')
        }
      } catch {
        if (!canceled) {
          setStatus('error')
        }
      }
    }

    fetchRecommendations()

    return () => {
      canceled = true
    }
  }, [])

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className={styles.grid} aria-label="Загрузка подборки объектов">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.cardSkeleton} />
          ))}
        </div>
      )
    }

    if (status === 'empty') {
      return (
        <div className={styles.empty}>
          <p>Пока нет подходящих объектов. Попробуйте изменить параметры поиска.</p>
        </div>
      )
    }

    if (status === 'error') {
      return (
        <div className={styles.empty}>
          <p>Не удалось загрузить подборку. Попробуйте обновить страницу позже.</p>
        </div>
      )
    }

    if (!items.length) {
      return null
    }

    return (
      <div className={styles.grid}>
        {items.map((item) => {
          const hasImage = !!item.imageUrl
          const locationParts = [item.city, item.district].filter(Boolean)

          return (
            <article key={item.id} className={styles.card}>
              <div className={styles.imageWrapper}>
                {hasImage ? (
                  <div
                    className={styles.image}
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                    aria-label="Фотография объекта"
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <span>Фото скоро будет</span>
                  </div>
                )}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.priceRow}>
                  {item.price != null ? (
                    <span className={styles.price}>{item.price.toLocaleString('ru-RU')} ₽</span>
                  ) : (
                    <span className={styles.priceMuted}>Цена по запросу</span>
                  )}
                </div>

                <div className={styles.meta}>
                  {item.propertyType && <span>{item.propertyType}</span>}
                  {item.rooms && <span> · {item.rooms}</span>}
                  {item.area != null && <span> · {item.area} м²</span>}
                </div>

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

  return (
    <section className={styles.section} aria-labelledby="may-suit-title">
      <div className={styles.headerRow}>
        <h2 id="may-suit-title" className={styles.title}>
          Могут подойти
        </h2>
      </div>
      {renderContent()}
    </section>
  )
}

