import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react'
import { getApiBase, getAuthHeaders } from '../services/api'
import {
  addFavorite,
  deleteFavorite,
  fetchFavorites,
  FAVORITES_CHANGED_EVENT,
  isFavoritePropertyId,
} from '../services/favoritesApi'
import { getOrCreateChatForProperty } from '../services/chatsApi'
import styles from './PropertyPage.module.css'

type Property = {
  id: string
  title?: string | null
  price?: number | string | null
  propertyType?: string | null
  rooms?: number | string | null
  totalArea?: number | string | null
  livingArea?: number | string | null
  kitchenArea?: number | string | null
  floor?: number | string | null
  totalFloors?: number | string | null
  housingType?: string | null
  rentType?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  metro?: string | null
  photos: string[]
  description?: string | null
  utilitiesIncluded?: string | null
  utilitiesPrice?: number | string | null
  deposit?: number | string | null
  commissionPercent?: number | string | null
  prepayment?: string | null
  childrenAllowed?: boolean
  petsAllowed?: boolean
}

function extractPhotoPath(ph: unknown): string {
  if (typeof ph === 'string') return ph
  if (ph && typeof ph === 'object') {
    const o = ph as Record<string, unknown>
    return String(o.url ?? o.image_url ?? o.path ?? o.src ?? o.filename ?? '')
  }
  return ''
}

function parsePhotosFromApi(p: Record<string, unknown>): string[] {
  const raw = p?.photos
  if (!Array.isArray(raw)) return []
  return raw.map(extractPhotoPath).filter(Boolean)
}

function resolvePhotoUrl(photo: string | null | undefined): string | null {
  if (!photo) return null
  if (/^https?:\/\//.test(photo)) return photo
  const base = getApiBase()
  if (photo.startsWith('/uploads')) {
    const apiBase = base || 'http://localhost:8080'
    return `${apiBase}${photo}`
  }
  if (!base) return photo
  return photo.startsWith('/') ? `${base}${photo}` : `${base}/${photo}`
}

function formatPrice(value: Property['price']): string | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(num)) return String(value)
  return new Intl.NumberFormat('ru-RU').format(num) + ' ₽'
}

function labelRentType(v: string | null | undefined): string {
  if (!v) return ''
  if (v === 'long' || v === 'long_term') return 'Долгосрочная'
  if (v === 'daily' || v === 'short_term') return 'Посуточная'
  return v
}

function labelUtilities(v: string | null | undefined): string {
  if (!v) return ''
  if (v === 'included' || v === 'true') return 'Включена (без счётчиков)'
  if (v === 'not_included' || v === 'false') return 'Не включена'
  return v
}

/** API может отдавать строку или boolean — приводим к строке для отображения */
function normalizeUtilitiesIncluded(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'boolean') return raw ? 'included' : 'not_included'
  if (typeof raw === 'number') {
    if (raw === 1) return 'included'
    if (raw === 0) return 'not_included'
    return null
  }
  const s = String(raw).trim()
  if (s === '') return null
  if (s === 'true' || s === 'included' || s === '1') return 'included'
  if (s === 'false' || s === 'not_included' || s === '0') return 'not_included'
  return s
}

function labelPrepayment(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  if (v === '0' || v === 'none') return 'Нет'
  if (v === '1') return '1 месяц'
  if (v === '2') return '2 месяца'
  return v
}

function normalizeProperty(p: Record<string, unknown>, id: string): Property {
  const commission =
    p.commissionPercent ?? p.commission ?? p.commission_percent ?? null

  return {
    id: String(p?.id ?? p?._id ?? id),
    title: (p.title as string) ?? null,
    price: (p.price as Property['price']) ?? null,
    propertyType: (p.propertyType ?? p.subcategory ?? p.type) as string | null,
    rooms: (p.rooms ?? p.roomsCount) as Property['rooms'],
    totalArea: (p.totalArea ?? p.area ?? p.square) as Property['totalArea'],
    livingArea: (p.livingArea ?? p.living_area) as Property['livingArea'],
    kitchenArea: (p.kitchenArea ?? p.kitchen_area) as Property['kitchenArea'],
    floor: (p.floor) as Property['floor'],
    totalFloors: (p.totalFloors ?? p.floorsTotal ?? p.floors_total) as Property['totalFloors'],
    housingType: (p.housingType ?? p.residentialType ?? p.housing_type) as string | null,
    rentType: (p.rentType ?? p.rent_type) as string | null,
    address: (p.address) as string | null,
    city: (p.city) as string | null,
    district: (p.district ?? p.region) as string | null,
    metro: (p.metro) as string | null,
    photos: parsePhotosFromApi(p),
    description: (p.description) as string | null,
    utilitiesIncluded: normalizeUtilitiesIncluded(p.utilitiesIncluded ?? p.utilities_included),
    utilitiesPrice: (p.utilitiesPrice ?? p.utilities_price) as Property['utilitiesPrice'],
    deposit: (p.deposit) as Property['deposit'],
    commissionPercent: commission as Property['commissionPercent'],
    prepayment: (p.prepayment) as string | null,
    childrenAllowed: Boolean(p.childrenAllowed ?? p.allowChildren ?? p.children_allowed),
    petsAllowed: Boolean(p.petsAllowed ?? p.allowPets ?? p.pets_allowed),
  }
}

const OPEN_AUTH_EVENT = 'rentora:open-auth'

export function PropertyPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [brokenPhotos, setBrokenPhotos] = useState<Record<number, boolean>>({})
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [writeBusy, setWriteBusy] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [saveFlash, setSaveFlash] = useState<string | null>(null)

  useEffect(() => {
    setActivePhoto(0)
    setBrokenPhotos({})
    setSaveFlash(null)
  }, [id])

  useEffect(() => {
    const msg = (location.state as { flashSuccess?: string } | null)?.flashSuccess
    if (!msg) return
    setSaveFlash(msg)
    navigate(location.pathname + location.search, { replace: true, state: {} })
  }, [location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (!id) {
      setError('ID объявления не указан')
      setLoading(false)
      setNotFound(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setNotFound(false)

    const base = getApiBase()
    const url = base ? `${base}/api/properties/${encodeURIComponent(id)}` : `/api/properties/${encodeURIComponent(id)}`

    fetch(url, { headers: getAuthHeaders() })
      .then(async (res) => {
        if (res.status === 404) {
          return { notFound: true as const }
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Ошибка загрузки: ${res.status}`)
        }
        const data = await res.json()
        return { notFound: false as const, data }
      })
      .then((result) => {
        if (cancelled) return
        if (result.notFound) {
          setNotFound(true)
          setProperty(null)
          return
        }
        const p = result.data?.property ?? result.data
        setProperty(normalizeProperty(p as Record<string, unknown>, id))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить объявление')
        setProperty(null)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!property?.id) return
    if (!localStorage.getItem('token')) {
      setIsFavorite(false)
      return
    }
    let cancelled = false
    fetchFavorites()
      .then((list) => {
        if (cancelled) return
        setIsFavorite(isFavoritePropertyId(list, property.id))
      })
      .catch(() => {
        if (!cancelled) setIsFavorite(false)
      })
    return () => {
      cancelled = true
    }
  }, [property?.id])

  const handleWriteClick = async () => {
    if (!property) return
    if (!localStorage.getItem('token')) {
      window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT))
      return
    }
    setWriteError(null)
    setWriteBusy(true)
    try {
      const { chatId, raw } = await getOrCreateChatForProperty(property.id)
      console.log('[Написать → чат]', {
        propertyId: property.id,
        response: raw,
        chatId,
      })
      navigate(`/chats/${encodeURIComponent(chatId)}`)
    } catch (e) {
      setWriteError(e instanceof Error ? e.message : 'Не удалось открыть чат')
    } finally {
      setWriteBusy(false)
    }
  }

  const handleFavoriteToggle = async () => {
    if (!property) return
    if (!localStorage.getItem('token')) {
      window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT))
      return
    }
    setFavoriteBusy(true)
    try {
      if (isFavorite) {
        await deleteFavorite(property.id)
        setIsFavorite(false)
      } else {
        await addFavorite(property.id)
        setIsFavorite(true)
      }
      window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT))
    } catch {
      // тихо: можно позже показать toast
    } finally {
      setFavoriteBusy(false)
    }
  }

  const photos = property?.photos ?? []
  const photoCount = photos.length

  const goPrev = useCallback(() => {
    if (photoCount <= 1) return
    setActivePhoto((i) => (i <= 0 ? photoCount - 1 : i - 1))
  }, [photoCount])

  const goNext = useCallback(() => {
    if (photoCount <= 1) return
    setActivePhoto((i) => (i >= photoCount - 1 ? 0 : i + 1))
  }, [photoCount])

  const currentSrc = useMemo(() => {
    if (!photos.length) return null
    const ph = photos[activePhoto]
    return ph && !brokenPhotos[activePhoto] ? resolvePhotoUrl(ph) : null
  }, [photos, activePhoto, brokenPhotos])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.stateText}>Загрузка…</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.stateCard}>
            <p className={styles.stateTitle}>Объявление не найдено</p>
            <p className={styles.stateHint}>Возможно, оно снято с публикации или ссылка устарела.</p>
            <Link to="/catalog" className={styles.accentLink}>
              Перейти в каталог
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.stateCard}>
            <p className={styles.errorText}>{error || 'Не удалось загрузить объявление'}</p>
            <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
              Назад
            </button>
          </div>
        </div>
      </div>
    )
  }

  const price = formatPrice(property.price)
  const housingLabel =
    property.housingType === 'flat'
      ? 'Квартира'
      : property.housingType === 'apartments'
        ? 'Апартаменты'
        : property.housingType ?? ''

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <nav className={styles.breadcrumbs} aria-label="Навигация">
          <Link to="/catalog" className={styles.breadcrumbLink}>
            Каталог
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{property.title || 'Объявление'}</span>
        </nav>

        {saveFlash && (
          <div className={styles.saveFlash} role="status">
            <span>{saveFlash}</span>
            <div className={styles.saveFlashActions}>
              <Link to="/profile/properties" className={styles.saveFlashLink}>
                Мои объекты
              </Link>
              <button type="button" className={styles.saveFlashDismiss} onClick={() => setSaveFlash(null)}>
                Закрыть
              </button>
            </div>
          </div>
        )}

        <div className={styles.pageGrid}>
          <section className={styles.gallerySlot} aria-label="Галерея">
            <div className={styles.galleryCard}>
              {photoCount === 0 ? (
                <div className={styles.galleryPlaceholder}>
                  <span>Фото</span>
                </div>
              ) : (
                <>
                  <div className={styles.mainPhotoWrap}>
                    {currentSrc ? (
                      <img
                        src={currentSrc}
                        alt=""
                        className={styles.mainPhotoImg}
                        onError={() => setBrokenPhotos((prev) => ({ ...prev, [activePhoto]: true }))}
                      />
                    ) : (
                      <div className={styles.galleryPlaceholderInner}>
                        <span>Фото</span>
                      </div>
                    )}
                    {photoCount > 1 && (
                      <>
                        <button
                          type="button"
                          className={styles.navBtn}
                          aria-label="Предыдущее фото"
                          onClick={(e) => {
                            e.stopPropagation()
                            goPrev()
                          }}
                        >
                          <ChevronLeft size={28} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.navBtn} ${styles.navBtnRight}`}
                          aria-label="Следующее фото"
                          onClick={(e) => {
                            e.stopPropagation()
                            goNext()
                          }}
                        >
                          <ChevronRight size={28} strokeWidth={2} />
                        </button>
                        <div className={styles.photoCounter}>
                          {activePhoto + 1} / {photoCount}
                        </div>
                      </>
                    )}
                  </div>
                  {photoCount > 1 && (
                    <div className={styles.thumbs} role="tablist" aria-label="Миниатюры">
                      {photos.map((ph, idx) => {
                        const src = resolvePhotoUrl(ph)
                        return (
                          <button
                            key={idx}
                            type="button"
                            role="tab"
                            aria-selected={idx === activePhoto}
                            className={`${styles.thumb} ${idx === activePhoto ? styles.thumbActive : ''}`}
                            onClick={() => setActivePhoto(idx)}
                          >
                            {src && !brokenPhotos[idx] ? (
                              <img
                                src={src}
                                alt=""
                                className={styles.thumbImg}
                                onError={() => setBrokenPhotos((prev) => ({ ...prev, [idx]: true }))}
                              />
                            ) : (
                              <span className={styles.thumbPlaceholder} />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className={styles.sidebarSlot}>
            <div className={styles.sidebarSticky}>
              <div className={styles.sidebarCard}>
                <h1 className={styles.sidebarTitle}>{property.title || 'Объявление'}</h1>
                {price && <p className={styles.sidebarPrice}>{price}</p>}

                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleWriteClick}
                    disabled={writeBusy}
                    aria-busy={writeBusy}
                  >
                    <MessageCircle size={18} strokeWidth={2} aria-hidden />
                    Написать
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnFavorite} ${isFavorite ? styles.btnFavoriteActive : ''}`}
                    onClick={handleFavoriteToggle}
                    disabled={favoriteBusy}
                    aria-pressed={isFavorite}
                    aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                  >
                    <Heart
                      size={18}
                      strokeWidth={2}
                      className={styles.btnFavoriteIcon}
                      fill={isFavorite ? 'currentColor' : 'none'}
                      aria-hidden
                    />
                    {isFavorite ? 'В избранном' : 'В избранное'}
                  </button>
                </div>

                {writeError && (
                  <p className={styles.sidebarWriteError} role="alert">
                    {writeError}
                  </p>
                )}

                <div className={styles.sidebarDivider} />

                <h2 className={styles.sidebarSectionTitle}>Финансовые условия</h2>
                <dl className={styles.sidebarDl}>
                  {property.utilitiesIncluded != null && property.utilitiesIncluded !== '' && (
                    <>
                      <dt>Оплата ЖКХ</dt>
                      <dd>{labelUtilities(property.utilitiesIncluded)}</dd>
                    </>
                  )}
                  {property.utilitiesPrice != null && property.utilitiesPrice !== '' && (
                    <>
                      <dt>Цена ЖКХ</dt>
                      <dd>{formatPrice(property.utilitiesPrice)}</dd>
                    </>
                  )}
                  {property.deposit != null && property.deposit !== '' && (
                    <>
                      <dt>Залог</dt>
                      <dd>{formatPrice(property.deposit)}</dd>
                    </>
                  )}
                  {property.commissionPercent != null && property.commissionPercent !== '' && (
                    <>
                      <dt>Комиссия</dt>
                      <dd>{property.commissionPercent}%</dd>
                    </>
                  )}
                  {property.prepayment != null && property.prepayment !== '' && (
                    <>
                      <dt>Предоплата</dt>
                      <dd>{labelPrepayment(property.prepayment)}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </aside>

          <div className={styles.belowSlot}>
            <section className={styles.card}>
              <h2 className={styles.cardHeading}>Основная информация</h2>
              <dl className={styles.dl}>
                {property.propertyType && (
                  <>
                    <dt>Тип недвижимости</dt>
                    <dd>{property.propertyType}</dd>
                  </>
                )}
                {property.rooms != null && property.rooms !== '' && (
                  <>
                    <dt>Комнат</dt>
                    <dd>{property.rooms}</dd>
                  </>
                )}
                {property.totalArea != null && property.totalArea !== '' && (
                  <>
                    <dt>Общая площадь</dt>
                    <dd>{property.totalArea} м²</dd>
                  </>
                )}
                {property.livingArea != null && property.livingArea !== '' && (
                  <>
                    <dt>Жилая площадь</dt>
                    <dd>{property.livingArea} м²</dd>
                  </>
                )}
                {property.kitchenArea != null && property.kitchenArea !== '' && (
                  <>
                    <dt>Кухня</dt>
                    <dd>{property.kitchenArea} м²</dd>
                  </>
                )}
                {property.floor != null && property.floor !== '' && (
                  <>
                    <dt>Этаж</dt>
                    <dd>{property.floor}</dd>
                  </>
                )}
                {property.totalFloors != null && property.totalFloors !== '' && (
                  <>
                    <dt>Этажей в доме</dt>
                    <dd>{property.totalFloors}</dd>
                  </>
                )}
                {housingLabel && (
                  <>
                    <dt>Тип жилья</dt>
                    <dd>{housingLabel}</dd>
                  </>
                )}
                {property.rentType && (
                  <>
                    <dt>Тип аренды</dt>
                    <dd>{labelRentType(property.rentType)}</dd>
                  </>
                )}
                {property.address && (
                  <>
                    <dt>Адрес</dt>
                    <dd>{property.address}</dd>
                  </>
                )}
                {property.city && (
                  <>
                    <dt>Город</dt>
                    <dd>{property.city}</dd>
                  </>
                )}
                {property.district && (
                  <>
                    <dt>Район</dt>
                    <dd>{property.district}</dd>
                  </>
                )}
                {property.metro && (
                  <>
                    <dt>Метро</dt>
                    <dd>{property.metro}</dd>
                  </>
                )}
              </dl>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardHeading}>Условия проживания</h2>
              <ul className={styles.checkList}>
                <li>{property.childrenAllowed ? 'Можно с детьми' : 'Без детей'}</li>
                <li>{property.petsAllowed ? 'Можно с животными' : 'Без животных'}</li>
              </ul>
            </section>

            {property.description && (
              <section className={styles.card}>
                <h2 className={styles.cardHeading}>Описание</h2>
                <p className={styles.description}>{property.description}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
