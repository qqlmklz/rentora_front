import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ContractViewModal } from '../components/ContractViewModal/ContractViewModal'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { ProfileSidebar } from '../components/ProfileSidebar/ProfileSidebar'
import { contractStatusLabel } from '../constants/requests'
import { fetchContract, terminateContract, type ChatContract } from '../services/contractsApi'
import { fetchProfileDocuments, type ProfileDocumentItem } from '../services/documentsApi'
import styles from './ProfilePage.module.css'
import pageStyles from './ProfileDocumentsPage.module.css'

const TERMINATE_CONFIRM =
  'Вы уверены, что хотите расторгнуть договор?'

function isAcceptedStatus(status: string): boolean {
  return status.toLowerCase() === 'accepted'
}

function isTerminatedStatus(status: string): boolean {
  return status.toLowerCase() === 'terminated'
}

const profileSidebar = (
  <ProfileSidebar
    active="documents"
    linkClassName={styles.sidebarLink}
    activeLinkClassName={styles.sidebarLinkActive}
  />
)

export function ProfileDocumentsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ProfileDocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [viewContract, setViewContract] = useState<ChatContract | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [terminateError, setTerminateError] = useState<string | null>(null)
  const [terminatingId, setTerminatingId] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!localStorage.getItem('token')) return
    setLoading(true)
    setError(null)
    return fetchProfileDocuments()
      .then(setItems)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить документы')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const refreshDocuments = useCallback(() => {
    if (!localStorage.getItem('token')) return Promise.resolve()
    return fetchProfileDocuments()
      .then(setItems)
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Не удалось обновить список документов'
        setError(msg)
        throw e
      })
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true })
      return
    }
    load()
  }, [navigate, load])

  useEffect(() => {
    if (!viewId) {
      setViewContract(null)
      setViewError(null)
      return
    }
    let cancelled = false
    setViewLoading(true)
    setViewError(null)
    setViewContract(null)
    fetchContract(viewId)
      .then((c) => {
        if (cancelled) return
        setViewContract(c)
        if (!c.contractText?.trim()) {
          setViewError('Договор пустой или не был сформирован')
        } else {
          setViewError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setViewError(e instanceof Error ? e.message : 'Не удалось загрузить договор')
        }
      })
      .finally(() => {
        if (!cancelled) setViewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [viewId])

  const handleTerminate = (docId: string) => {
    if (!window.confirm(TERMINATE_CONFIRM)) return
    setTerminateError(null)
    setSuccessMessage(null)
    setTerminatingId(docId)
    terminateContract(docId)
      .then(() => refreshDocuments())
      .then(() => {
        setSuccessMessage('Договор успешно расторгнут.')
      })
      .catch((e) => {
        setSuccessMessage(null)
        setTerminateError(
          e instanceof Error ? e.message : 'Не удалось расторгнуть договор',
        )
      })
      .finally(() => {
        setTerminatingId(null)
      })
  }

  const empty = !loading && !error && items.length === 0

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

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <nav className={styles.sidebarNav}>{profileSidebar}</nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.card}>
            <h1 className={styles.title}>Документы</h1>
            <p className={pageStyles.subtitle}>Договоры аренды</p>

            {successMessage ? (
              <p className={pageStyles.successBanner} role="status">
                {successMessage}
              </p>
            ) : null}

            {terminateError ? (
              <p className={pageStyles.inlineError} role="alert">
                {terminateError}
              </p>
            ) : null}

            {error && (
              <p className={pageStyles.inlineError} role="alert">
                {error}
              </p>
            )}

            {empty ? (
              <EmptyState>Пока нет документов</EmptyState>
            ) : (
              <ul className={pageStyles.list}>
                {items.map((doc) => {
                  const accepted = isAcceptedStatus(doc.status)
                  const terminated = isTerminatedStatus(doc.status)
                  return (
                    <li key={doc.id} className={pageStyles.item}>
                      <div className={pageStyles.itemMain}>
                        <span className={pageStyles.itemTitle}>
                          {doc.title || `Договор № ${doc.id}`}
                        </span>
                        <span
                          className={`${pageStyles.badge} ${terminated ? pageStyles.badgeTerminated : ''}`}
                        >
                          {contractStatusLabel(doc.status)}
                        </span>
                      </div>
                      <div className={pageStyles.itemActions}>
                        <button
                          type="button"
                          className={pageStyles.btnOpen}
                          onClick={() => setViewId(doc.id)}
                        >
                          Открыть
                        </button>
                        {accepted ? (
                          <button
                            type="button"
                            className={pageStyles.btnTerminate}
                            disabled={terminatingId === doc.id}
                            onClick={() => handleTerminate(doc.id)}
                          >
                            {terminatingId === doc.id ? '…' : 'Расторгнуть договор'}
                          </button>
                        ) : null}
                      </div>
                      <div className={pageStyles.itemMeta}>
                        {[doc.city, doc.address].filter(Boolean).join(', ') || '—'}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </main>

      <ContractViewModal
        open={viewId != null}
        onClose={() => setViewId(null)}
        data={viewContract}
        loading={viewLoading}
        error={viewError}
      />
    </div>
  )
}
