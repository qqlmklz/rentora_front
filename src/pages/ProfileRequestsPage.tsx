import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ActiveArchiveTabs } from '../components/ActiveArchiveTabs/ActiveArchiveTabs'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { ProfileSidebar } from '../components/ProfileSidebar/ProfileSidebar'
import {
  REQUEST_CATEGORY_OPTIONS,
  type RequestCategory,
} from '../constants/requests'
import {
  createProfileRequest,
  fetchProfileRequests,
  fetchRequestPropertyOptions,
  setRequestDecision,
  submitRequestExpense,
  confirmRequestExpense,
  completeOwnerRequest,
  type RequestDecisionResolutionType,
  type SubmitRequestExpensePayload,
  type ProfileRequestsResponse,
  type ProfileRequestItem,
  type RequestPropertyOption,
} from '../services/requestsApi'
import {
  formatAddressParts,
  formatCurrency,
  formatDateTimeRu,
} from '../utils/format'
import { isRequestOwner, isRequestTenant } from '../utils/requestRoles'
import { sortByCreatedAtDesc } from '../utils/sort'
import { getCurrentUserId } from '../utils/user'
import styles from './ProfilePage.module.css'
import pageStyles from './ProfileRequestsPage.module.css'

function statusLabel(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'pending' || normalized === 'new') return 'Новая'
  if (normalized === 'in_review') return 'На рассмотрении'
  if (normalized === 'owner_resolves') return 'Владелец решает проблему'
  if (normalized === 'tenant_resolves') return 'Жилец решает проблему'
  if (normalized === 'waiting_expense') return 'Ожидаются расходы'
  if (normalized === 'completed') return 'Завершено'
  if (normalized === 'rejected' || normalized === 'declined') return 'Отклонена'
  return status
}

function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'accepted' || normalized === 'approved') return pageStyles.badgeAccepted
  if (normalized === 'rejected' || normalized === 'declined') return pageStyles.badgeRejected
  if (normalized === 'closed' || normalized === 'done') return pageStyles.badgeClosed
  return ''
}

function priorityLabel(priority: ProfileRequestItem['priority']): string {
  if (priority === 'low') return 'Низкий'
  if (priority === 'high') return 'Высокий'
  return 'Средний'
}

function priorityBadgeClass(priority: ProfileRequestItem['priority']): string {
  if (priority === 'low') return pageStyles.priorityLow
  if (priority === 'high') return pageStyles.priorityHigh
  return pageStyles.priorityMedium
}

function resolutionTypeLabel(value: ProfileRequestItem['resolutionType']): string {
  if (value === 'owner') return 'Владелец'
  if (value === 'tenant') return 'Жилец'
  return 'Не назначено'
}

function categoryLabel(category: string | null): string {
  const normalized = (category ?? '').trim().toLowerCase()
  if (!normalized) return 'Не указана'
  const found = REQUEST_CATEGORY_OPTIONS.find((x) => x.value === normalized)
  return found?.label ?? category ?? 'Не указана'
}

function formatPropertyAddress(item: ProfileRequestItem): string {
  return formatAddressParts([item.property.address, item.property.city, item.property.district])
}

function formatPropertyLabel(option: RequestPropertyOption): string {
  const location = [option.address, option.city, option.district].filter(Boolean).join(' / ')
  if (location) return `${option.title || `Объявление #${option.id}`} — ${location}`
  return option.title || `Объявление #${option.id}`
}

const profileSidebar = (
  <ProfileSidebar
    active="requests"
    linkClassName={styles.sidebarLink}
    activeLinkClassName={styles.sidebarLinkActive}
  />
)

export function ProfileRequestsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedPropertyId = (searchParams.get('propertyId') ?? '').trim()
  const [requestsBundle, setRequestsBundle] = useState<{
    activeRequests: ProfileRequestItem[]
    archivedRequests: ProfileRequestItem[]
  }>({ activeRequests: [], archivedRequests: [] })
  const [listTab, setListTab] = useState<'active' | 'archive'>('active')
  const [properties, setProperties] = useState<RequestPropertyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(Boolean(preselectedPropertyId))
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [decisionBusyId, setDecisionBusyId] = useState<string | null>(null)
  const [confirmBusyId, setConfirmBusyId] = useState<string | null>(null)
  const [ownerCompleteBusyId, setOwnerCompleteBusyId] = useState<string | null>(null)
  const ownerCompleteInFlightRef = useRef<string | null>(null)
  const [expenseBusyId, setExpenseBusyId] = useState<string | null>(null)
  const [openExpenseForms, setOpenExpenseForms] = useState<Record<string, boolean>>({})
  const [expenseDrafts, setExpenseDrafts] = useState<
    Record<string, { amount: string; comment: string; photos: File[] }>
  >({})
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<RequestCategory>(REQUEST_CATEGORY_OPTIONS[0].value)
  const [selectedPropertyId, setSelectedPropertyId] = useState(preselectedPropertyId)
  const [requestPhotos, setRequestPhotos] = useState<File[]>([])
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({})
  const [brokenRequestPhotos, setBrokenRequestPhotos] = useState<Record<string, boolean>>({})
  const [brokenExpensePhotos, setBrokenExpensePhotos] = useState<Record<string, boolean>>({})
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const currentUserId = useMemo(() => getCurrentUserId(), [])

  const applyRequestsPayload = useCallback((payload: ProfileRequestsResponse) => {
    setRequestsBundle({
      activeRequests: sortByCreatedAtDesc(
        Array.isArray(payload.activeRequests) ? payload.activeRequests : [],
      ),
      archivedRequests: sortByCreatedAtDesc(
        Array.isArray(payload.archivedRequests) ? payload.archivedRequests : [],
      ),
    })
  }, [])

  const loadAvailableProperties = useCallback(() => {
    if (!localStorage.getItem('token')) return Promise.resolve()
    setPropertiesLoading(true)
    setPropertiesError(null)
    return fetchRequestPropertyOptions()
      .then((data) => {
        setProperties(data)
        return data
      })
      .catch((e) => {
        setPropertiesError(e instanceof Error ? e.message : 'Не удалось загрузить список объявлений')
        return []
      })
      .finally(() => setPropertiesLoading(false))
  }, [])

  const loadRequests = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchProfileRequests()
      .then((data) => applyRequestsPayload(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить заявки'))
      .finally(() => setLoading(false))
  }, [applyRequestsPayload])

  /** GET /api/profile/requests без полноэкранного loading (после создания, confirm, complete и т.п.). */
  const refetchProfileRequests = useCallback(() => {
    setError(null)
    return fetchProfileRequests()
      .then((data) => applyRequestsPayload(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось обновить заявки'))
  }, [applyRequestsPayload])

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true })
      return
    }
    loadRequests()
  }, [navigate, loadRequests])

  const hasPendingPriority = useMemo(
    () => requestsBundle.activeRequests.some((item) => item.priorityStatus === 'pending'),
    [requestsBundle.activeRequests],
  )

  useEffect(() => {
    if (!hasPendingPriority) return
    const intervalId = window.setInterval(() => {
      fetchProfileRequests()
        .then((data) => {
          applyRequestsPayload(data)
        })
        .catch((e) => {
          setError((prev) => prev ?? (e instanceof Error ? e.message : 'Не удалось обновить заявки'))
        })
    }, 10000)
    return () => window.clearInterval(intervalId)
  }, [hasPendingPriority, applyRequestsPayload])

  useEffect(() => {
    void loadAvailableProperties()
  }, [loadAvailableProperties])

  useEffect(() => {
    if (!preselectedPropertyId) return
    if (!properties.length) return
    const exists = properties.some((x) => String(x.id) === preselectedPropertyId)
    if (exists) {
      setSelectedPropertyId(preselectedPropertyId)
      setFormOpen(true)
    }
  }, [preselectedPropertyId, properties])

  useEffect(() => {
    if (!selectedPropertyId) return
    const exists = properties.some((x) => String(x.id) === String(selectedPropertyId))
    if (!exists) setSelectedPropertyId('')
  }, [selectedPropertyId, properties])

  const displayedItems = useMemo(() => {
    const active = sortByCreatedAtDesc(requestsBundle.activeRequests)
    const archived = sortByCreatedAtDesc(requestsBundle.archivedRequests)
    return listTab === 'active' ? active : archived
  }, [listTab, requestsBundle.activeRequests, requestsBundle.archivedRequests])
  const empty = useMemo(
    () => !loading && !error && displayedItems.length === 0,
    [loading, error, displayedItems.length],
  )
  const emptyMessage = 'Активных заявок пока нет'
  const noAvailableProperties = !propertiesLoading && properties.length === 0
  const selectedProperty = useMemo(
    () => properties.find((x) => String(x.id) === String(selectedPropertyId)) ?? null,
    [properties, selectedPropertyId],
  )

  const requestPhotoPreviews = useMemo(
    () => requestPhotos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [requestPhotos],
  )

  useEffect(() => {
    return () => {
      requestPhotoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [requestPhotoPreviews])

  const openCreateForm = () => {
    void loadAvailableProperties()
    setCreateError(null)
    setFormOpen(true)
  }

  const closeCreateForm = () => {
    if (createLoading) return
    setFormOpen(false)
    setCreateError(null)
    setRequestPhotos([])
  }

  const handleRequestPhotosChange = (files: FileList | null) => {
    setRequestPhotos(Array.from(files ?? []))
  }

  const handleDecision = (requestId: string, resolutionType: RequestDecisionResolutionType) => {
    setActionError(null)
    setDecisionBusyId(requestId)
    setRequestDecision(requestId, resolutionType)
      .then(() => refetchProfileRequests())
      .catch((e) => {
        setActionError(e instanceof Error ? e.message : 'Не удалось обновить решение по заявке')
      })
      .finally(() => setDecisionBusyId(null))
  }

  const handleConfirmExpense = (requestId: string) => {
    setActionError(null)
    setConfirmBusyId(requestId)
    confirmRequestExpense(requestId)
      .then(() => refetchProfileRequests())
      .catch((e) => {
        setActionError(e instanceof Error ? e.message : 'Не удалось подтвердить расходы')
      })
      .finally(() => setConfirmBusyId(null))
  }

  const handleCompleteOwnerRequest = (requestId: string) => {
    if (ownerCompleteInFlightRef.current != null) return

    ownerCompleteInFlightRef.current = requestId
    setActionError(null)
    setOwnerCompleteBusyId(requestId)

    completeOwnerRequest(requestId)
      .then((result) => {
        if (!result.ok) {
          setActionError(result.message)
          return
        }
        return refetchProfileRequests()
      })
      .catch((e) => {
        setActionError(e instanceof Error ? e.message : 'Не удалось завершить заявку')
      })
      .finally(() => {
        ownerCompleteInFlightRef.current = null
        setOwnerCompleteBusyId(null)
      })
  }

  const handleExpenseDraftChange = (
    requestId: string,
    patch: Partial<{ amount: string; comment: string; photos: File[] }>,
  ) => {
    setExpenseDrafts((prev) => ({
      ...prev,
      [requestId]: {
        amount: patch.amount ?? prev[requestId]?.amount ?? '',
        comment: patch.comment ?? prev[requestId]?.comment ?? '',
        photos: patch.photos ?? prev[requestId]?.photos ?? [],
      },
    }))
  }

  const handleExpensePhotosChange = (requestId: string, files: FileList | null) => {
    const list = Array.from(files ?? [])
    handleExpenseDraftChange(requestId, { photos: list })
  }

  const toggleExpenseForm = (requestId: string) => {
    setOpenExpenseForms((prev) => ({
      ...prev,
      [requestId]: !prev[requestId],
    }))
  }

  const handleSubmitExpense = (requestId: string) => {
    const draft = expenseDrafts[requestId] ?? { amount: '', comment: '', photos: [] }
    const amountNum = Number(draft.amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setActionError('Укажите корректную сумму расходов')
      return
    }
    const normalizedComment = draft.comment.trim()
    if (!normalizedComment) {
      setActionError('Добавьте комментарий к расходам')
      return
    }
    setActionError(null)
    setExpenseBusyId(requestId)
    const payload: SubmitRequestExpensePayload = {
      amount: amountNum,
      comment: normalizedComment,
      photos: draft.photos,
    }
    submitRequestExpense(requestId, payload)
      .then(() => refetchProfileRequests())
      .then(() => {
        setExpenseDrafts((prev) => {
          const next = { ...prev }
          delete next[requestId]
          return next
        })
        setOpenExpenseForms((prev) => ({
          ...prev,
          [requestId]: false,
        }))
      })
      .catch((e) => {
        setActionError(e instanceof Error ? e.message : 'Не удалось отправить расходы')
      })
      .finally(() => setExpenseBusyId(null))
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (noAvailableProperties) {
      setCreateError('У вас нет доступных объектов для создания заявки')
      return
    }
    if (!selectedPropertyId) {
      setCreateError('Выберите объект')
      return
    }
    const propertyIdNumber = Number(selectedPropertyId)
    if (!Number.isFinite(propertyIdNumber) || propertyIdNumber <= 0) {
      setCreateError('Выберите объект')
      return
    }
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setCreateError('Добавьте заголовок заявки')
      return
    }
    const normalizedDescription = description.trim()
    if (!normalizedDescription) {
      setCreateError('Добавьте описание заявки')
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    const createPayload = {
      propertyId: propertyIdNumber,
      title: normalizedTitle,
      description: normalizedDescription,
      category,
      photos: requestPhotos,
    }
    createProfileRequest(createPayload)
      .then(() => refetchProfileRequests())
      .then(() => {
        setTitle('')
        setDescription('')
        setCategory(REQUEST_CATEGORY_OPTIONS[0].value)
        setRequestPhotos([])
        setFormOpen(false)
      })
      .catch((e) => {
        setCreateError(e instanceof Error ? e.message : 'Не удалось создать заявку')
      })
      .finally(() => {
        setCreateLoading(false)
      })
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

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <nav className={styles.sidebarNav}>{profileSidebar}</nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.card}>
            <div className={pageStyles.topBar}>
              <h1 className={pageStyles.title}>Заявки</h1>
              <button
                type="button"
                className={pageStyles.createBtn}
                onClick={openCreateForm}
                disabled={propertiesLoading}
              >
                Создать заявку
              </button>
            </div>

            <ActiveArchiveTabs
              value={listTab}
              onChange={setListTab}
              archiveValue="archive"
              ariaLabel="Список заявок"
            />

            {error && (
              <p className={pageStyles.inlineError} role="alert">
                {error}
              </p>
            )}
            {actionError && (
              <p className={pageStyles.inlineError} role="alert">
                {actionError}
              </p>
            )}

            {empty ? (
              <EmptyState>{emptyMessage}</EmptyState>
            ) : (
              <div className={pageStyles.list}>
                {displayedItems.map((item) => {
                  const isActiveListTab = listTab === 'active'
                  const isTenant = isRequestTenant(currentUserId, item.requesterId)
                  const isOwner = isRequestOwner(
                    currentUserId,
                    item.propertyOwnerId,
                    item.property?.ownerId,
                  )
                  const isOwnerCard = isOwner
                  const photoOk = !!item.property.photoUrl && !brokenPhotos[item.id]
                  const visibleRequestPhotos = item.requestPhotos
                    .map((src, idx) => ({ src, idx }))
                    .filter(({ idx }) => !brokenRequestPhotos[`${item.id}-${idx}`])
                  const visibleExpensePhotos = item.expensePhotos
                    .map((src, idx) => ({ src, idx }))
                    .filter(({ idx }) => !brokenExpensePhotos[`${item.id}-${idx}`])
                  const canOwnerDecideByStatus =
                    isActiveListTab &&
                    item.status.toLowerCase() === 'pending' &&
                    isOwner
                  const showExpenseForm =
                    item.resolutionType === 'tenant' && !isOwner && isTenant && !item.expenseAmount
                  const isExpenseFormOpen = Boolean(openExpenseForms[item.id])
                  const isRequestCompleted = ['completed', 'closed', 'done'].includes(
                    item.status.toLowerCase(),
                  )
                  const ownerCanConfirmExpense =
                    item.resolutionType === 'tenant' && isOwner && Boolean(item.expenseAmount)
                  const showOwnerExpenseReview = ownerCanConfirmExpense
                  const showOwnerCompleteButton =
                    isActiveListTab &&
                    isOwnerCard &&
                    item.resolutionType === 'owner' &&
                    !isRequestCompleted
                  return (
                    <article key={item.id} className={pageStyles.item}>
                      <div className={pageStyles.photoWrap}>
                        {photoOk ? (
                          <img
                            className={pageStyles.photo}
                            src={item.property.photoUrl ?? undefined}
                            alt=""
                            loading="lazy"
                            onError={() => setBrokenPhotos((prev) => ({ ...prev, [item.id]: true }))}
                          />
                        ) : (
                          <span className={pageStyles.photoFallback}>Фото</span>
                        )}
                      </div>
                      <div className={pageStyles.meta}>
                        <p className={pageStyles.requestTitle}>{item.title || 'Заявка на обслуживание'}</p>
                        <p className={pageStyles.objectTitle}>
                          Объект: {item.property.title || `Объявление #${item.property.id}`}
                        </p>
                        {isOwnerCard ? (
                          <p className={pageStyles.extraMeta}>
                            Заявку создал: {item.requesterName?.trim() || 'Пользователь'}
                          </p>
                        ) : null}
                        <p className={pageStyles.address}>{formatPropertyAddress(item)}</p>
                        <p className={pageStyles.category}>Категория: {categoryLabel(item.category)}</p>
                        <p className={pageStyles.description}>
                          Проблема: {item.description || 'Описание отсутствует'}
                        </p>
                        {visibleRequestPhotos.length > 0 ? (
                          <div className={pageStyles.expensePhotosBlock}>
                            <p className={pageStyles.extraMeta}>Фото заявки</p>
                            <div className={pageStyles.expensePhotos}>
                              {visibleRequestPhotos.map(({ src, idx }) => (
                                <button
                                  key={`${item.id}-request-${idx}`}
                                  type="button"
                                  className={pageStyles.expensePhotoBtn}
                                  onClick={() => setPreviewPhoto(src)}
                                >
                                  <img
                                    src={src}
                                    alt=""
                                    className={pageStyles.expensePhotoImg}
                                    loading="lazy"
                                    onError={() =>
                                      setBrokenRequestPhotos((prev) => ({
                                        ...prev,
                                        [`${item.id}-${idx}`]: true,
                                      }))
                                    }
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className={pageStyles.metaRow}>
                          <span
                            className={`${pageStyles.badge} ${statusBadgeClass(item.status)}`.trim()}
                          >
                            {statusLabel(item.status)}
                          </span>
                          {item.priorityStatus === 'pending' ? (
                            <span className={`${pageStyles.priorityBadge} ${pageStyles.priorityPending}`.trim()}>
                              Приоритет определяется...
                            </span>
                          ) : item.priorityStatus === 'fallback' ? (
                            <span className={`${pageStyles.priorityBadge} ${pageStyles.priorityPending}`.trim()}>
                              Приоритет определён по умолчанию
                            </span>
                          ) : (
                            <span
                              className={`${pageStyles.priorityBadge} ${priorityBadgeClass(item.priority)}`.trim()}
                            >
                              Приоритет: {priorityLabel(item.priority)}
                            </span>
                          )}
                          <span className={pageStyles.date}>{formatDateTimeRu(item.createdAt)}</span>
                        </div>
                        {item.priorityStatus === 'ready' ? (
                          <p className={pageStyles.aiReason}>
                            Пояснение от AI: {item.priorityReason?.trim() || 'Пока недоступно'}
                          </p>
                        ) : null}
                        <p className={pageStyles.extraMeta}>
                          Тип решения: {resolutionTypeLabel(item.resolutionType)}
                        </p>
                        {showOwnerExpenseReview ? (
                          <>
                            <p className={pageStyles.extraMeta}>
                              Сумма расходов: {formatCurrency(item.expenseAmount)}
                            </p>
                            <p className={pageStyles.extraMeta}>
                              Комментарий по расходам: {item.expenseComment?.trim() || '—'}
                            </p>
                          </>
                        ) : null}
                        {showOwnerExpenseReview && visibleExpensePhotos.length > 0 ? (
                          <div className={pageStyles.expensePhotosBlock}>
                            <p className={pageStyles.extraMeta}>Фото затрат</p>
                            <div className={pageStyles.expensePhotos}>
                              {visibleExpensePhotos.map(({ src, idx }) => (
                                <button
                                  key={`${item.id}-expense-${idx}`}
                                  type="button"
                                  className={pageStyles.expensePhotoBtn}
                                  onClick={() => setPreviewPhoto(src)}
                                >
                                  <img
                                    src={src}
                                    alt=""
                                    className={pageStyles.expensePhotoImg}
                                    loading="lazy"
                                    onError={() =>
                                      setBrokenExpensePhotos((prev) => ({
                                        ...prev,
                                        [`${item.id}-${idx}`]: true,
                                      }))
                                    }
                                  />
                                </button>
                              ))}
                            </div>
                            <p className={pageStyles.extraMeta}>
                              Сумма: {formatCurrency(item.expenseAmount)} · Комментарий:{' '}
                              {item.expenseComment?.trim() || '—'}
                            </p>
                          </div>
                        ) : null}

                        {ownerCanConfirmExpense ? (
                          <div className={pageStyles.inlineActions}>
                            <button
                              type="button"
                              className={pageStyles.btnDecision}
                              onClick={() => handleConfirmExpense(item.id)}
                              disabled={confirmBusyId === item.id}
                            >
                              {confirmBusyId === item.id ? 'Подтверждение…' : 'Подтвердить'}
                            </button>
                          </div>
                        ) : null}

                        {showOwnerCompleteButton ? (
                          <div className={pageStyles.inlineActions}>
                            <button
                              type="button"
                              className={pageStyles.btnDecision}
                              onClick={() => handleCompleteOwnerRequest(item.id)}
                              disabled={
                                ownerCompleteBusyId != null ||
                                decisionBusyId === item.id ||
                                confirmBusyId === item.id
                              }
                            >
                              {ownerCompleteBusyId === item.id ? 'Завершение…' : 'Завершить'}
                            </button>
                          </div>
                        ) : null}

                        {canOwnerDecideByStatus ? (
                          <div className={pageStyles.inlineActions}>
                            <button
                              type="button"
                              className={pageStyles.btnDecision}
                              onClick={() => handleDecision(item.id, 'owner')}
                              disabled={decisionBusyId === item.id}
                            >
                              {decisionBusyId === item.id ? 'Сохранение…' : 'Я решу'}
                            </button>
                            <button
                              type="button"
                              className={pageStyles.btnDecisionSecondary}
                              onClick={() => handleDecision(item.id, 'tenant')}
                              disabled={decisionBusyId === item.id}
                            >
                              {decisionBusyId === item.id ? 'Сохранение…' : 'Пусть жилец решит'}
                            </button>
                          </div>
                        ) : null}

                        {showExpenseForm ? (
                          <div className={pageStyles.expenseFormWrap}>
                            <button
                              type="button"
                              className={pageStyles.expenseToggle}
                              onClick={() => toggleExpenseForm(item.id)}
                              disabled={expenseBusyId === item.id}
                            >
                              {isExpenseFormOpen ? 'Указать расходы ▾' : 'Указать расходы ▸'}
                            </button>
                            <div
                              className={`${pageStyles.expenseFormCollapse} ${
                                isExpenseFormOpen ? pageStyles.expenseFormOpen : ''
                              }`.trim()}
                            >
                              <div className={pageStyles.expenseForm}>
                                <div className={pageStyles.expenseRow}>
                                  <input
                                    type="number"
                                    min={0}
                                    step="1"
                                    className={pageStyles.input}
                                    placeholder="Сумма расходов"
                                    value={expenseDrafts[item.id]?.amount ?? ''}
                                    onChange={(e) =>
                                      handleExpenseDraftChange(item.id, { amount: e.target.value })
                                    }
                                    disabled={expenseBusyId === item.id}
                                  />
                                </div>
                                <textarea
                                  className={pageStyles.textarea}
                                  placeholder="Комментарий к расходам"
                                  value={expenseDrafts[item.id]?.comment ?? ''}
                                  onChange={(e) =>
                                    handleExpenseDraftChange(item.id, { comment: e.target.value })
                                  }
                                  disabled={expenseBusyId === item.id}
                                />
                                <div className={pageStyles.expenseRow}>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className={pageStyles.input}
                                    onChange={(e) => handleExpensePhotosChange(item.id, e.target.files)}
                                    disabled={expenseBusyId === item.id}
                                  />
                                  {(expenseDrafts[item.id]?.photos?.length ?? 0) > 0 ? (
                                    <p className={pageStyles.hint}>
                                      Выбрано фото: {expenseDrafts[item.id]?.photos.length}
                                    </p>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  className={pageStyles.btnSubmitInline}
                                  onClick={() => handleSubmitExpense(item.id)}
                                  disabled={expenseBusyId === item.id}
                                >
                                  {expenseBusyId === item.id ? 'Сохранение…' : 'Отправить'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {formOpen && (
        <div className={pageStyles.backdrop} role="presentation" onClick={closeCreateForm}>
          <div
            className={pageStyles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-create-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="request-create-title" className={pageStyles.modalTitle}>
              Создать заявку
            </h2>

            <form onSubmit={handleCreate}>
              <div className={pageStyles.field}>
                <label className={pageStyles.label} htmlFor="request-property">
                  Объявление
                </label>
                <select
                  id="request-property"
                  className={pageStyles.select}
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  disabled={propertiesLoading || createLoading}
                >
                  <option value="">Выберите объявление</option>
                  {properties.map((option) => (
                    <option key={option.id} value={option.id}>
                      {formatPropertyLabel(option)}
                    </option>
                  ))}
                </select>
                {propertiesError ? <p className={pageStyles.inlineError}>{propertiesError}</p> : null}
                {selectedProperty ? (
                  <div className={pageStyles.propertyPreview}>
                    <div className={pageStyles.propertyPreviewPhotoWrap}>
                      {selectedProperty.photoUrl && !brokenPhotos[`preview-${selectedProperty.id}`] ? (
                        <img
                          className={pageStyles.propertyPreviewPhoto}
                          src={selectedProperty.photoUrl}
                          alt=""
                          onError={() =>
                            setBrokenPhotos((prev) => ({ ...prev, [`preview-${selectedProperty.id}`]: true }))
                          }
                        />
                      ) : (
                        <span className={pageStyles.propertyPreviewFallback}>Фото</span>
                      )}
                    </div>
                    <div className={pageStyles.propertyPreviewMeta}>
                      <p className={pageStyles.propertyPreviewTitle}>
                        {selectedProperty.title || `Объявление #${selectedProperty.id}`}
                      </p>
                      <p className={pageStyles.propertyPreviewAddress}>
                        {[selectedProperty.address, selectedProperty.city, selectedProperty.district]
                          .filter(Boolean)
                          .join(' / ') || '—'}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={pageStyles.field}>
                <label className={pageStyles.label} htmlFor="request-title">
                  Заголовок
                </label>
                <input
                  id="request-title"
                  className={pageStyles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например, Не работает отопление"
                  disabled={createLoading}
                />
              </div>

              <div className={pageStyles.field}>
                <label className={pageStyles.label} htmlFor="request-description">
                  Описание проблемы
                </label>
                <textarea
                  id="request-description"
                  className={pageStyles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите неисправность и детали обращения"
                  disabled={createLoading}
                />
                <p className={pageStyles.hint}>Минимум 1 символ. Сообщение будет видно обслуживающей стороне.</p>
              </div>

              <div className={pageStyles.field}>
                <label className={pageStyles.label} htmlFor="request-category">
                  Категория
                </label>
                <select
                  id="request-category"
                  className={pageStyles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RequestCategory)}
                  disabled={createLoading}
                >
                  {REQUEST_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={pageStyles.field}>
                <label className={pageStyles.label} htmlFor="request-photos">
                  Фото проблемы (необязательно)
                </label>
                <input
                  id="request-photos"
                  type="file"
                  multiple
                  accept="image/*"
                  className={pageStyles.input}
                  onChange={(e) => handleRequestPhotosChange(e.target.files)}
                  disabled={createLoading}
                />
                {requestPhotoPreviews.length > 0 ? (
                  <div className={pageStyles.expensePhotosBlock}>
                    <p className={pageStyles.hint}>Выбрано фото: {requestPhotoPreviews.length}</p>
                    <div className={pageStyles.expensePhotos}>
                      {requestPhotoPreviews.map((preview, idx) => (
                        <button
                          key={`create-photo-${preview.name}-${idx}`}
                          type="button"
                          className={pageStyles.expensePhotoBtn}
                          onClick={() => setPreviewPhoto(preview.url)}
                        >
                          <img src={preview.url} alt="" className={pageStyles.expensePhotoImg} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {createError ? (
                <p className={pageStyles.inlineError} role="alert">
                  {createError}
                </p>
              ) : null}

              <div className={pageStyles.modalActions}>
                <button type="button" className={pageStyles.btnCancel} onClick={closeCreateForm} disabled={createLoading}>
                  Отмена
                </button>
                <button
                  type="submit"
                  className={pageStyles.btnSubmit}
                  disabled={createLoading || propertiesLoading || noAvailableProperties}
                >
                  {createLoading ? 'Создание…' : 'Создать заявку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div
          className={pageStyles.imagePreviewBackdrop}
          role="presentation"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className={pageStyles.imagePreviewModal}
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр фото"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={pageStyles.imagePreviewClose}
              onClick={() => setPreviewPhoto(null)}
            >
              Закрыть
            </button>
            <img src={previewPhoto} alt="" className={pageStyles.imagePreviewImg} />
          </div>
        </div>
      )}
    </div>
  )
}
