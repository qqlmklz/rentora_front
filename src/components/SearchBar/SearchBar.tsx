import { type FC, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import {
  applyPropertyFilterCascade,
  COMMERCIAL_TYPES,
  RESIDENTIAL_TYPES,
  SEARCH_CATEGORIES,
  SEARCH_ROOMS,
} from '../../constants/property'
import { ROUTES } from '../../constants/routes'
import styles from './searchBar.module.css'

export type SearchFilters = {
  category: string
  propertyType: string
  rooms: string
  priceFrom: string
  priceTo: string
  location: string
}

const initialFilters: SearchFilters = {
  category: '',
  propertyType: '',
  rooms: '',
  priceFrom: '',
  priceTo: '',
  location: '',
}

export const SearchBar: FC = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)

  const propertyTypes =
    filters.category === 'residential'
      ? RESIDENTIAL_TYPES
      : filters.category === 'commercial'
        ? COMMERCIAL_TYPES
        : []
  const isRoomsDisabled =
    filters.category === 'commercial' || filters.propertyType === 'studio'

  const updateFilter = useCallback(<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => {
      if (key === 'category' || key === 'propertyType') {
        return applyPropertyFilterCascade(prev, key, String(value))
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    const keys: Array<keyof SearchFilters> = [
      'category',
      'propertyType',
      'rooms',
      'priceFrom',
      'priceTo',
      'location',
    ]

    keys.forEach((key) => {
      const value = filters[key].trim()
      if (!value) return
      params.set(key, value)
    })

    const query = params.toString()
    const targetUrl = query ? `${ROUTES.catalog}?${query}` : ROUTES.catalog
    console.log('[SearchBar] navigate to:', targetUrl)
    navigate(targetUrl)
  }

  return (
    <section className={styles.wrapper} aria-label="Поиск недвижимости">
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Категория */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="search-category">
            Категория
          </label>
          <select
            id="search-category"
            className={styles.select}
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
          >
            <option value="">Выберите</option>
            {SEARCH_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Тип объекта */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="search-property-type">
            Тип объекта
          </label>
          <select
            id="search-property-type"
            className={styles.select}
            value={filters.propertyType}
            disabled={!filters.category}
            onChange={(e) => updateFilter('propertyType', e.target.value)}
          >
            <option value="">Выберите</option>
            {propertyTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Комнаты */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="search-rooms">
            Комнат
          </label>
          <select
            id="search-rooms"
            className={styles.select}
            value={filters.rooms}
            disabled={isRoomsDisabled}
            onChange={(e) => updateFilter('rooms', e.target.value)}
          >
            <option value="">Любое</option>
            {SEARCH_ROOMS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Цена */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="search-price-from">
            Цена от
          </label>
          <input
            id="search-price-from"
            className={styles.input}
            type="text"
            inputMode="numeric"
            placeholder="от"
            value={filters.priceFrom}
            onChange={(e) => updateFilter('priceFrom', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="search-price-to">
            Цена до
          </label>
          <input
            id="search-price-to"
            className={styles.input}
            type="text"
            inputMode="numeric"
            placeholder="до"
            value={filters.priceTo}
            onChange={(e) => updateFilter('priceTo', e.target.value)}
          />
        </div>

        {/* Локация */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="search-location">
            Район / город
          </label>
          <input
            id="search-location"
            className={styles.input}
            type="text"
            placeholder="Введите район или город"
            value={filters.location}
            onChange={(e) => updateFilter('location', e.target.value)}
          />
        </div>

        <button type="submit" className={styles.submitButton}>
          <Search size={18} aria-hidden />
          Найти
        </button>
      </form>
    </section>
  )
}
