import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchCatalog, type CatalogFilters, type CatalogItem } from '../services/catalogApi'
import styles from './CatalogPage.module.css'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Любой тип' },
  { value: 'residential', label: 'Жилое' },
  { value: 'commercial', label: 'Коммерция' },
]

const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Любой объект' },
  { value: 'apartment', label: 'Квартира' },
  { value: 'room', label: 'Комната' },
  { value: 'house', label: 'Дом' },
  { value: 'studio', label: 'Студия' },
  { value: 'warehouse', label: 'Склад' },
  { value: 'office', label: 'Офис' },
  { value: 'coworking', label: 'Коворкинг' },
  { value: 'space', label: 'Помещение' },
]

const ROOMS_OPTIONS = [
  { value: '', label: 'Любые' },
  { value: 'studio', label: 'Студия' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6+', label: '6+' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'cheapest', label: 'Сначала дешёвые' },
  { value: 'expensive', label: 'Сначала дорогие' },
]

function filtersFromSearchParams(params: URLSearchParams): CatalogFilters {
  return {
    category: params.get('category') ?? '',
    propertyType: params.get('propertyType') ?? '',
    rooms: params.get('rooms') ?? '',
    priceFrom: params.get('priceFrom') ?? '',
    priceTo: params.get('priceTo') ?? '',
    location: params.get('location') ?? '',
    sort: params.get('sort') ?? 'newest',
  }
}

function applySort(items: CatalogItem[], sort: string | undefined): CatalogItem[] {
  if (!sort || sort === 'newest') return items
  const copy = [...items]
  if (sort === 'cheapest') {
    copy.sort((a, b) => Number(a.price ?? Infinity) - Number(b.price ?? Infinity))
  } else if (sort === 'expensive') {
    copy.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))
  }
  return copy
}

function formatPrice(value: CatalogItem['price']): string | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(num)) return String(value)
  return new Intl.NumberFormat('ru-RU').format(num) + ' ₽'
}

function formatDetails(item: CatalogItem): string {
  const parts: string[] = []
  if (item.propertyType) parts.push(item.propertyType)
  if (item.rooms !== null && item.rooms !== undefined && item.rooms !== '') parts.push(`${item.rooms} комн.`)
  if (item.totalArea !== null && item.totalArea !== undefined && item.totalArea !== '') parts.push(`${item.totalArea} м²`)
  return parts.join(' · ')
}

function formatLocation(item: CatalogItem): string | null {
  const parts = [item.city, item.district].filter(Boolean) as string[]
  return parts.length ? parts.join(' / ') : null
}

export function CatalogPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({})

  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCatalog(filters)
      .then((data) => {
        if (cancelled) return
        setItems(data)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить каталог')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters])

  const sortedItems = useMemo(() => applySort(items, filters.sort), [items, filters.sort])
  const empty = !loading && !error && sortedItems.length === 0

  const updateFilter = (patch: Partial<CatalogFilters>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      })
      // если сортировка не задана явно — по умолчанию newest
      if (!next.get('sort')) next.set('sort', 'newest')
      return next
    })
  }

  const handleCardClick = (id: string) => {
    navigate(`/properties/${encodeURIComponent(id)}`)
  }

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Каталог</h1>
        </div>

        <div className={styles.contentRow}>
          <section className={styles.filtersCard} aria-label="Фильтры каталога">
            <form
              className={styles.filtersForm}
              onSubmit={(e) => {
                e.preventDefault()
              }}
            >
              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-category">
                  Тип недвижимости
                </label>
                <select
                  id="catalog-category"
                  className={styles.select}
                  value={filters.category ?? ''}
                  onChange={(e) => updateFilter({ category: e.target.value, propertyType: '' })}
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-property-type">
                  Вид объекта
                </label>
                <select
                  id="catalog-property-type"
                  className={styles.select}
                  value={filters.propertyType ?? ''}
                  onChange={(e) => updateFilter({ propertyType: e.target.value })}
                >
                  {PROPERTY_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-rooms">
                  Комнаты
                </label>
                <select
                  id="catalog-rooms"
                  className={styles.select}
                  value={filters.rooms ?? ''}
                  onChange={(e) => updateFilter({ rooms: e.target.value })}
                  disabled={filters.category === 'commercial'}
                >
                  {ROOMS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Цена</label>
                <div className={styles.priceRow}>
                  <input
                    type="number"
                    min={0}
                    className={styles.input}
                    placeholder="От"
                    value={filters.priceFrom ?? ''}
                    onChange={(e) => updateFilter({ priceFrom: e.target.value })}
                  />
                  <span className={styles.priceDash}>—</span>
                  <input
                    type="number"
                    min={0}
                    className={styles.input}
                    placeholder="До"
                    value={filters.priceTo ?? ''}
                    onChange={(e) => updateFilter({ priceTo: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-location">
                  Локация
                </label>
                <input
                  id="catalog-location"
                  type="text"
                  className={styles.input}
                  placeholder="Город, метро, район"
                  value={filters.location ?? ''}
                  onChange={(e) => updateFilter({ location: e.target.value })}
                />
              </div>

              <div className={`${styles.field} ${styles.sortField}`}>
                <label className={styles.label} htmlFor="catalog-sort">
                  Сортировка
                </label>
                <select
                  id="catalog-sort"
                  className={styles.select}
                  value={filters.sort ?? 'newest'}
                  onChange={(e) => updateFilter({ sort: e.target.value })}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </section>

          <section className={styles.listCard} aria-label="Список объявлений">
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>Найденные объявления</h2>
              <p className={styles.listInfo}>
                {loading ? 'Загрузка…' : sortedItems.length ? `${sortedItems.length} объектов` : ''}
              </p>
            </div>

            {loading && <p className={styles.loading}>Загрузка…</p>}
            {error && !loading && <p className={styles.error}>{error}</p>}
            {empty && !error && !loading && (
              <p className={styles.empty}>По вашему запросу ничего не найдено</p>
            )}

            {!loading && !error && !empty && (
              <div className={styles.grid}>
                {sortedItems.map((item) => {
                  const price = formatPrice(item.price)
                  const details = formatDetails(item)
                  const location = formatLocation(item)
                  const hasPhoto = !!item.photoUrl && !brokenPhotos[item.id]

                  return (
                    <article
                      key={item.id}
                      className={styles.card}
                      onClick={() => handleCardClick(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleCardClick(item.id)
                      }}
                    >
                      <div className={styles.cardImageWrap}>
                        {hasPhoto ? (
                          <img
                            src={item.photoUrl ?? undefined}
                            alt=""
                            className={styles.cardImage}
                            loading="lazy"
                            onError={() =>
                              setBrokenPhotos((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }))
                            }
                          />
                        ) : (
                          <span className={styles.cardImagePlaceholder}>Фото</span>
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        {price && <p className={styles.price}>{price}</p>}
                        {item.title && <p className={styles.cardTitle}>{item.title}</p>}
                        <p className={styles.meta}>{details || 'Объявление'}</p>
                        {location && <p className={styles.location}>{location}</p>}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

