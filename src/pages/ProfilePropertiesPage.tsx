import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchProfileProperties,
  deleteUserProperty,
  type ProfilePropertyItem,
} from '../services/profilePropertiesApi'
import styles from './ProfilePage.module.css'
import pageStyles from './ProfilePropertiesPage.module.css'

function formatPrice(value: ProfilePropertyItem['price']): string | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(num)) return String(value)
  return new Intl.NumberFormat('ru-RU').format(num) + ' ₽'
}

function formatDetails(item: ProfilePropertyItem): string {
  const parts: string[] = []
  if (item.propertyType) parts.push(item.propertyType)
  if (item.rooms !== null && item.rooms !== undefined && item.rooms !== '') {
    parts.push(`${item.rooms} комн.`)
  }
  if (item.totalArea !== null && item.totalArea !== undefined && item.totalArea !== '') {
    parts.push(`${item.totalArea} м²`)
  }
  return parts.join(' · ')
}

function formatLocation(item: ProfilePropertyItem): string | null {
  const loc = [item.city, item.district].filter(Boolean) as string[]
  return loc.length ? loc.join(' / ') : null
}

const sidebar = (
  <>
    <Link to="/profile" className={styles.sidebarLink}>
      Профиль
    </Link>
    <Link to="/profile/favorites" className={styles.sidebarLink}>
      Избранное
    </Link>
    <Link to="/profile/properties" className={styles.sidebarLinkActive}>
      Мои объекты
    </Link>
    <a href="/profile/requests" className={styles.sidebarLink}>
      Заявки
    </a>
    <a href="/profile/documents" className={styles.sidebarLink}>
      Документы
    </a>
    <a href="/profile/settings" className={styles.sidebarLink}>
      Настройки
    </a>
  </>
)

export function ProfilePropertiesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ProfilePropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    if (!localStorage.getItem('token')) return
    setLoading(true)
    setError(null)
    fetchProfileProperties()
      .then((data) => setItems(data))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить объявления')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true })
      return
    }
    load()
  }, [navigate, load])

  const empty = useMemo(() => !loading && !error && items.length === 0, [loading, error, items.length])

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    navigate(`/properties/${encodeURIComponent(id)}/edit`)
  }

  const handleOpen = (id: string) => {
    navigate(`/properties/${encodeURIComponent(id)}`)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteUserProperty(deleteId)
      setItems((prev) => prev.filter((x) => x.id !== deleteId))
      setDeleteId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить объявление')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.root}>
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>{sidebar}</nav>
        </aside>
        <main className={styles.main}>
          <div className={styles.container}>
            <p className={styles.loading}>Загрузка…</p>
          </div>
        </main>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className={styles.root}>
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>{sidebar}</nav>
        </aside>
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
        <nav className={styles.sidebarNav}>{sidebar}</nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.card}>
            <h1 className={styles.title}>Мои объекты</h1>

            {error && (
              <p className={pageStyles.inlineError} role="alert">
                {error}
              </p>
            )}

            {empty ? (
              <p className={pageStyles.empty}>У вас пока нет объявлений</p>
            ) : (
              <div className={pageStyles.list}>
                {items.map((item) => {
                  const price = formatPrice(item.price)
                  const details = formatDetails(item)
                  const location = formatLocation(item)
                  const photoOk = !!item.photoUrl && !brokenPhotos[item.id]

                  return (
                    <div
                      key={item.id}
                      className={pageStyles.item}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpen(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleOpen(item.id)
                      }}
                      aria-label="Открыть объявление"
                    >
                      <div className={pageStyles.photoWrap}>
                        {photoOk ? (
                          <img
                            className={pageStyles.photo}
                            src={item.photoUrl ?? undefined}
                            alt=""
                            loading="lazy"
                            onError={() => setBrokenPhotos((p) => ({ ...p, [item.id]: true }))}
                          />
                        ) : (
                          <span className={pageStyles.photoFallback}>Фото</span>
                        )}
                      </div>

                      <div className={pageStyles.meta}>
                        <p className={pageStyles.cardTitle}>{item.title || 'Без названия'}</p>
                        {price && <p className={pageStyles.price}>{price}</p>}
                        <p className={pageStyles.details}>{details || 'Объявление'}</p>
                        {location && <p className={pageStyles.location}>{location}</p>}
                      </div>

                      <div className={pageStyles.actions}>
                        <button
                          type="button"
                          className={pageStyles.btnEdit}
                          onClick={(e) => handleEdit(e, item.id)}
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          className={pageStyles.btnDelete}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteId(item.id)
                          }}
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

      {deleteId !== null && (
        <div className={pageStyles.modalBackdrop} role="presentation" onClick={() => !deleting && setDeleteId(null)}>
          <div
            className={pageStyles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className={pageStyles.modalTitle}>
              Удалить объявление?
            </h2>
            <p className={pageStyles.modalText}>Это действие нельзя отменить.</p>
            <div className={pageStyles.modalActions}>
              <button
                type="button"
                className={pageStyles.modalCancel}
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button type="button" className={pageStyles.modalDanger} onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
