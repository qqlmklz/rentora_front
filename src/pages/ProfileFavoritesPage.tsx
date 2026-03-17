import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchFavorites, deleteFavorite, type FavoriteProperty } from '../services/favoritesApi'
import styles from './ProfilePage.module.css'
import favStyles from './ProfileFavoritesPage.module.css'

function formatPrice(value: FavoriteProperty['price']): string | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(num)) return String(value)
  return new Intl.NumberFormat('ru-RU').format(num) + ' ₽'
}

function formatDetails(item: FavoriteProperty): string {
  const parts: string[] = []
  if (item.propertyType) parts.push(item.propertyType)
  if (item.rooms !== null && item.rooms !== undefined && item.rooms !== '') parts.push(`${item.rooms} комн.`)
  if (item.area !== null && item.area !== undefined && item.area !== '') parts.push(`${item.area} м²`)
  return parts.join(' · ')
}

function formatLocation(item: FavoriteProperty): string | null {
  const parts = [item.city, item.district].filter(Boolean) as string[]
  return parts.length ? parts.join(' / ') : null
}

export function ProfileFavoritesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<FavoriteProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true })
      return
    }
    let cancelled = false
    setLoading(true)
    fetchFavorites()
      .then((data) => {
        if (cancelled) return
        setItems(data)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить избранное')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

  const empty = useMemo(() => !loading && !error && items.length === 0, [loading, error, items.length])

  const handleOpen = (id: string) => {
    navigate(`/properties/${encodeURIComponent(id)}`)
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    try {
      await deleteFavorite(id)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить из избранного')
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.root}>
        <aside className={styles.sidebar} />
        <main className={styles.main}>
          <div className={styles.container}>
            <p className={styles.loading}>Загрузка…</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.root}>
        <aside className={styles.sidebar} />
        <main className={styles.main}>
          <div className={styles.container}>
            <p className={styles.error}>{error}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <nav className={styles.sidebarNav}>
          <Link to="/profile" className={styles.sidebarLink}>
            Профиль
          </Link>
          <Link to="/profile/favorites" className={styles.sidebarLinkActive}>
            Избранное
          </Link>
          <a href="/profile/properties" className={styles.sidebarLink}>
            Мои объекты
          </a>
          <a href="/profile/requests" className={styles.sidebarLink}>
            Заявки
          </a>
          <a href="/profile/documents" className={styles.sidebarLink}>
            Документы
          </a>
          <a href="/profile/settings" className={styles.sidebarLink}>
            Настройки
          </a>
        </nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.card}>
            <h1 className={styles.title}>Избранное</h1>

            {empty ? (
              <p className={favStyles.empty}>У вас пока нет избранных объявлений</p>
            ) : (
              <div className={favStyles.list}>
                {items.map((item) => {
                  const price = formatPrice(item.price)
                  const details = formatDetails(item)
                  const location = formatLocation(item)
                  const photoOk = !!item.photoUrl && !brokenPhotos[item.id]

                  return (
                    <div
                      key={item.id}
                      className={favStyles.item}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpen(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleOpen(item.id)
                      }}
                      aria-label="Открыть объявление"
                    >
                      <div className={favStyles.photoWrap}>
                        {photoOk ? (
                          <img
                            className={favStyles.photo}
                            src={item.photoUrl ?? undefined}
                            alt=""
                            loading="lazy"
                            onError={() => setBrokenPhotos((p) => ({ ...p, [item.id]: true }))}
                          />
                        ) : (
                          <span className={favStyles.photoFallback}>Фото</span>
                        )}
                      </div>

                      <div className={favStyles.meta}>
                        {price && <p className={favStyles.price}>{price}</p>}
                        <p className={favStyles.details}>{details || 'Объявление'}</p>
                        {location && <p className={favStyles.location}>{location}</p>}
                      </div>

                      <div className={favStyles.actions}>
                        <button
                          type="button"
                          className={favStyles.remove}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemove(item.id)
                          }}
                          disabled={removingId === item.id}
                          aria-label="Удалить из избранного"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

