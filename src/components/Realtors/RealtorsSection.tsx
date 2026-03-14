import type { FC } from 'react'
import { useEffect, useState } from 'react'
import styles from './realtors.module.css'

export type Realtor = {
  id: string
  name: string
  listingsCount: number
  avatarUrl?: string | null
}

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export const RealtorsSection: FC = () => {
  const [status, setStatus] = useState<Status>('loading')
  const [realtors, setRealtors] = useState<Realtor[]>([])

  useEffect(() => {
    let canceled = false

    async function fetchRealtors() {
      try {
        setStatus('loading')
        // TODO: заменить на реальный запрос к API / БД
        // Пример:
        // const response = await fetch('/api/realtors')
        // const data: Realtor[] = await response.json()
        // if (canceled) return
        // setRealtors(data)
        // setStatus(data.length ? 'success' : 'empty')

        const mockData: Realtor[] = []

        if (canceled) return

        if (!mockData.length) {
          setRealtors([])
          setStatus('empty')
        } else {
          setRealtors(mockData)
          setStatus('success')
        }
      } catch {
        if (!canceled) {
          setStatus('error')
        }
      }
    }

    fetchRealtors()

    return () => {
      canceled = true
    }
  }, [])

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className={styles.grid} aria-label="Загрузка профилей риелторов">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.cardSkeleton} />
          ))}
        </div>
      )
    }

    if (status === 'empty') {
      return (
        <div className={styles.empty}>
          <p>Пока нет риелторов для отображения.</p>
        </div>
      )
    }

    if (status === 'error') {
      return (
        <div className={styles.empty}>
          <p>Не удалось загрузить риелторов. Попробуйте обновить страницу позже.</p>
        </div>
      )
    }

    if (!realtors.length) {
      return null
    }

    return (
      <div className={styles.grid}>
        {realtors.map((realtor) => (
          <a
            key={realtor.id}
            href={`/realtors/${realtor.id}`}
            className={styles.card}
            aria-label={`Профиль риелтора ${realtor.name}`}
          >
            <div className={styles.avatarWrapper}>
              {realtor.avatarUrl ? (
                <div
                  className={styles.avatar}
                  style={{ backgroundImage: `url(${realtor.avatarUrl})` }}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <span>{realtor.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className={styles.cardBody}>
              <div className={styles.name}>{realtor.name}</div>
              <div className={styles.meta}>
                {realtor.listingsCount} предложен{realtor.listingsCount === 1 ? 'ие' : 'ий'}
              </div>
            </div>
          </a>
        ))}
      </div>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="realtors-title">
      <div className={styles.headerRow}>
        <h2 id="realtors-title" className={styles.title}>
          Риелторы
        </h2>
      </div>
      {renderContent()}
    </section>
  )
}

