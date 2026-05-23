import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { PropertyListingCard } from '../components/PropertyListingCard/PropertyListingCard'
import {
  CATEGORY_OPTIONS,
  isPropertyTypeValidForCategory,
  PROPERTY_TYPE_ALIASES,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_TYPE_VALUES,
  PROPERTY_TYPES_BY_CATEGORY,
  ROOMS_OPTIONS,
  ROOMS_VALUES,
  SORT_OPTIONS,
  applyPropertyFilterCascade,
} from '../constants/property'
import { ROUTES } from '../constants/routes'
import { fetchCatalog, type CatalogFilters, type CatalogItem } from '../services/catalogApi'
import { filtersFromSearchParams, normalizeOptionValue } from '../utils/catalogFilters'
import styles from './CatalogPage.module.css'

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

export function CatalogPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({})

  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams])
  const propertyTypeOptions = useMemo(() => {
    if (filters.category === 'residential' || filters.category === 'commercial') {
      const allowed = new Set(PROPERTY_TYPES_BY_CATEGORY[filters.category])
      return PROPERTY_TYPE_OPTIONS.filter((option) => !option.value || allowed.has(option.value))
    }
    return PROPERTY_TYPE_OPTIONS
  }, [filters.category])
  const requestFilters = useMemo(() => {
    const next: CatalogFilters = { ...filters }
    if (!isPropertyTypeValidForCategory(filters.category ?? '', filters.propertyType ?? '')) {
      next.propertyType = ''
    }
    return next
  }, [filters])

  useEffect(() => {
    const query = searchParams.toString()
    const url = query ? `${ROUTES.catalog}?${query}` : ROUTES.catalog
    console.log('[CatalogPage] current query params:', query)
    console.log('[CatalogPage] current category:', filters.category ?? '')
    console.log('[CatalogPage] filters state:', filters)
    console.log('[CatalogPage] current query URL:', url)
  }, [filters, searchParams])

  useEffect(() => {
    const rawPropertyType = (searchParams.get('propertyType') ?? '').trim()
    if (!rawPropertyType) return
    const normalizedRawPropertyType = normalizeOptionValue(
      rawPropertyType,
      PROPERTY_TYPE_ALIASES,
      PROPERTY_TYPE_VALUES,
    )
    if (isPropertyTypeValidForCategory(filters.category ?? '', normalizedRawPropertyType)) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('propertyType')
      return next
    })
  }, [filters.category, filters.propertyType, searchParams, setSearchParams])

  useEffect(() => {
    const rawRooms = (searchParams.get('rooms') ?? '').trim()
    if (!rawRooms) return
    const normalizedRooms = normalizeOptionValue(rawRooms, {}, ROOMS_VALUES)
    if (normalizedRooms) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('rooms')
      return next
    })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const requestParams = new URLSearchParams()
    Object.entries(requestFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        requestParams.set(key, String(value))
      }
    })
    console.log('[CatalogPage] category:', requestFilters.category ?? '')
    console.log('[CatalogPage] propertyType:', requestFilters.propertyType ?? '')
    console.log('[CatalogPage] request query:', requestParams.toString())
    console.log('[CatalogPage] requesting with filters:', requestFilters)
    fetchCatalog(requestFilters)
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
  }, [requestFilters])

  const visibleItems = useMemo(() => items.filter((item) => !item.isArchived), [items])
  const sortedItems = useMemo(() => applySort(visibleItems, filters.sort), [visibleItems, filters.sort])
  const empty = !loading && !error && sortedItems.length === 0

  const updateFilter = (patch: Partial<CatalogFilters>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(patch).forEach(([key, value]) => {
        const v = value === undefined || value === null ? '' : String(value).trim()
        if (!v) next.delete(key)
        else next.set(key, v)
      })
      return next
    })
  }

  const handleCategoryChange = (category: string) => {
    const cascaded = applyPropertyFilterCascade(
      {
        category: filters.category ?? '',
        propertyType: filters.propertyType ?? '',
        rooms: filters.rooms ?? '',
      },
      'category',
      category,
    )
    updateFilter({
      category: cascaded.category,
      propertyType: cascaded.propertyType,
      rooms: cascaded.rooms,
    })
  }

  const handlePropertyTypeChange = (propertyType: string) => {
    const cascaded = applyPropertyFilterCascade(
      {
        category: filters.category ?? '',
        propertyType: filters.propertyType ?? '',
        rooms: filters.rooms ?? '',
      },
      'propertyType',
      propertyType,
    )
    updateFilter({
      propertyType: cascaded.propertyType,
      rooms: cascaded.rooms,
    })
  }

  const handleCardClick = (id: string) => {
    navigate(ROUTES.property(id))
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
                  Тип
                </label>
                <select
                  id="catalog-category"
                  className={styles.select}
                  value={filters.category ?? ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value || 'any'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-property-type">
                  Объект
                </label>
                <select
                  id="catalog-property-type"
                  className={styles.select}
                  value={filters.propertyType ?? ''}
                  onChange={(e) => handlePropertyTypeChange(e.target.value)}
                >
                  {propertyTypeOptions.map((o) => (
                    <option key={o.value || 'any-type'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-rooms">
                  Комнат
                </label>
                <select
                  id="catalog-rooms"
                  className={styles.select}
                  value={filters.rooms ?? ''}
                  disabled={filters.category === 'commercial' || filters.propertyType === 'studio'}
                  onChange={(e) => updateFilter({ rooms: e.target.value })}
                >
                  {ROOMS_OPTIONS.map((o) => (
                    <option key={o.value || 'any-rooms'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-price-from">
                  Цена от
                </label>
                <input
                  id="catalog-price-from"
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  value={filters.priceFrom ?? ''}
                  onChange={(e) => updateFilter({ priceFrom: e.target.value })}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-price-to">
                  Цена до
                </label>
                <input
                  id="catalog-price-to"
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  value={filters.priceTo ?? ''}
                  onChange={(e) => updateFilter({ priceTo: e.target.value })}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="catalog-location">
                  Район / город
                </label>
                <input
                  id="catalog-location"
                  className={styles.input}
                  type="text"
                  value={filters.location ?? ''}
                  onChange={(e) => updateFilter({ location: e.target.value })}
                />
              </div>

              <div className={styles.field}>
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
              <EmptyState className={styles.empty}>По вашему запросу ничего не найдено</EmptyState>
            )}

            {!loading && !error && !empty && (
              <div className={styles.grid}>
                {sortedItems.map((item) => (
                  <PropertyListingCard
                    key={item.id}
                    item={item}
                    variant="grid"
                    photoBroken={Boolean(brokenPhotos[item.id])}
                    onPhotoError={() =>
                      setBrokenPhotos((prev) => ({
                        ...prev,
                        [item.id]: true,
                      }))
                    }
                    onOpen={() => handleCardClick(item.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
