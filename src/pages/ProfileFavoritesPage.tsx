import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { ProfileSidebar } from '../components/ProfileSidebar/ProfileSidebar'
import { PropertyListingCard } from '../components/PropertyListingCard/PropertyListingCard'
import { ROUTES } from '../constants/routes'
import {
  fetchFavorites,
  deleteFavorite,
  FAVORITES_CHANGED_EVENT,
  type FavoriteProperty,
} from '../services/favoritesApi'
import { hasAuthToken } from '../utils/user'
import styles from './ProfilePage.module.css'
import favStyles from './ProfileFavoritesPage.module.css'

export function ProfileFavoritesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<FavoriteProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({})

  const silentReloadFavorites = useCallback(() => {
    if (!hasAuthToken()) return
    fetchFavorites()
      .then((data) => setItems(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!hasAuthToken()) {
      navigate(ROUTES.home, { replace: true })
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

  useEffect(() => {
    const onChanged = () => silentReloadFavorites()
    window.addEventListener(FAVORITES_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, onChanged)
  }, [silentReloadFavorites])

  const empty = useMemo(() => !loading && !error && items.length === 0, [loading, error, items.length])

  const handleOpen = (id: string) => {
    navigate(ROUTES.property(id))
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
          <ProfileSidebar
            active="favorites"
            linkClassName={styles.sidebarLink}
            activeLinkClassName={styles.sidebarLinkActive}
          />
        </nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.card}>
            <h1 className={styles.title}>Избранное</h1>

            {empty ? (
              <EmptyState>У вас пока нет избранных объявлений</EmptyState>
            ) : (
              <div className={favStyles.list}>
                {items.map((item) => (
                  <PropertyListingCard
                    key={item.id}
                    item={item}
                    variant="row"
                    photoBroken={Boolean(brokenPhotos[item.id])}
                    onPhotoError={() => setBrokenPhotos((p) => ({ ...p, [item.id]: true }))}
                    onOpen={() => handleOpen(item.id)}
                    actions={
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
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

