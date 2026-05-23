import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActiveArchiveTabs } from '../components/ActiveArchiveTabs/ActiveArchiveTabs'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { ProfileSidebar } from '../components/ProfileSidebar/ProfileSidebar'
import { PropertyListingCard } from '../components/PropertyListingCard/PropertyListingCard'
import { ROUTES } from '../constants/routes'
import {
  fetchProfileProperties,
  deleteUserProperty,
  type ProfilePropertyItem,
} from '../services/profilePropertiesApi'
import { hasAuthToken } from '../utils/user'
import styles from './ProfilePage.module.css'
import pageStyles from './ProfilePropertiesPage.module.css'

const profileSidebar = (
  <ProfileSidebar
    active="properties"
    linkClassName={styles.sidebarLink}
    activeLinkClassName={styles.sidebarLinkActive}
  />
)

export function ProfilePropertiesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ProfilePropertyItem[]>([])
  const [listTab, setListTab] = useState<'active' | 'archived'>('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    if (!hasAuthToken()) return
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
    if (!hasAuthToken()) {
      navigate('/', { replace: true })
      return
    }
    load()
  }, [navigate, load])

  const activeListings = useMemo(() => items.filter((item) => !item.isArchived), [items])
  const archivedListings = useMemo(() => items.filter((item) => item.isArchived), [items])
  const displayedItems = useMemo(
    () => (listTab === 'active' ? activeListings : archivedListings),
    [listTab, activeListings, archivedListings],
  )
  const empty = useMemo(
    () => !loading && !error && displayedItems.length === 0,
    [loading, error, displayedItems.length],
  )

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    navigate(ROUTES.propertyEdit(id))
  }

  const handleOpen = (id: string) => {
    navigate(ROUTES.property(id))
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
          <nav className={styles.sidebarNav}>{profileSidebar}</nav>
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
          <nav className={styles.sidebarNav}>{profileSidebar}</nav>
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
        <nav className={styles.sidebarNav}>{profileSidebar}</nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.card}>
            <h1 className={styles.title}>Мои объекты</h1>
            <ActiveArchiveTabs
              value={listTab}
              onChange={setListTab}
              archiveValue="archived"
              ariaLabel="Список объявлений владельца"
            />

            {error && (
              <p className={pageStyles.inlineError} role="alert">
                {error}
              </p>
            )}

            {empty ? (
              <EmptyState>
                {listTab === 'active'
                  ? 'У вас пока нет активных объявлений'
                  : 'В архиве пока нет объявлений'}
              </EmptyState>
            ) : (
              <div className={pageStyles.list}>
                {displayedItems.map((item) => (
                  <PropertyListingCard
                    key={item.id}
                    item={item}
                    variant="row"
                    photoBroken={Boolean(brokenPhotos[item.id])}
                    onPhotoError={() => setBrokenPhotos((p) => ({ ...p, [item.id]: true }))}
                    onOpen={() => handleOpen(item.id)}
                    actions={
                      <>
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
                      </>
                    }
                  />
                ))}
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
