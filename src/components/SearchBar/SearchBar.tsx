import { type FC, useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import styles from './searchBar.module.css'

const CATEGORIES = [
  { value: 'residential', label: 'Жилое' },
  { value: 'commercial', label: 'Коммерция' },
] as const

const RESIDENTIAL_TYPES = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'room', label: 'Комната' },
  { value: 'house', label: 'Дом' },
]

const COMMERCIAL_TYPES = [
  { value: 'warehouse', label: 'Склад' },
  { value: 'office', label: 'Офис' },
  { value: 'coworking', label: 'Коворкинг' },
]

const ROOMS = [
  { value: 'studio', label: 'Студия' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6+', label: '6+' },
]

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
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)

  const propertyTypes = filters.category === 'residential' ? RESIDENTIAL_TYPES : filters.category === 'commercial' ? COMMERCIAL_TYPES : []
  const isRoomsDisabled = filters.category === 'commercial'

  const updateFilter = useCallback(<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'category') {
        next.propertyType = ''
        if (value === 'commercial') next.rooms = ''
      }
      return next
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Search filters:', filters)
  }

  return (
    <section className={styles.wrapper} aria-label="Поиск недвижимости">
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Категория */}
        <div className={styles.field}>
          <label htmlFor="search-category" className={styles.label}>
            Тип недвижимости
          </label>
          <select
            id="search-category"
            className={styles.select}
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            aria-label="Категория"
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.separator} aria-hidden="true" />

        {/* Подкатегория (тип объекта) */}
        <div className={styles.field}>
          <label htmlFor="search-type" className={styles.label}>
            Объект
          </label>
          <select
            id="search-type"
            className={styles.select}
            value={filters.propertyType}
            onChange={(e) => updateFilter('propertyType', e.target.value)}
            disabled={!filters.category}
            aria-label="Тип объекта"
          >
            <option value="">—</option>
            {propertyTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.separator} aria-hidden="true" />

        {/* Комнаты */}
        <div className={styles.field}>
          <label htmlFor="search-rooms" className={styles.label}>
            Комнаты
          </label>
          <select
            id="search-rooms"
            className={styles.select}
            value={filters.rooms}
            onChange={(e) => updateFilter('rooms', e.target.value)}
            disabled={isRoomsDisabled}
            aria-label="Количество комнат"
          >
            <option value="">—</option>
            {ROOMS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.separator} aria-hidden="true" />

        {/* Цена */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Цена</label>
          <div className={styles.priceRow}>
            <input
              type="number"
              className={styles.input}
              placeholder="От"
              value={filters.priceFrom}
              onChange={(e) => updateFilter('priceFrom', e.target.value)}
              min={0}
              aria-label="Цена от"
            />
            <span className={styles.priceDash}>—</span>
            <input
              type="number"
              className={styles.input}
              placeholder="До"
              value={filters.priceTo}
              onChange={(e) => updateFilter('priceTo', e.target.value)}
              min={0}
              aria-label="Цена до"
            />
          </div>
        </div>

        <div className={styles.separator} aria-hidden="true" />

        {/* Локация */}
        <div className={styles.field}>
          <label htmlFor="search-location" className={styles.label}>
            Локация
          </label>
          <input
            id="search-location"
            type="text"
            className={styles.input}
            placeholder="Город, метро, район"
            value={filters.location}
            onChange={(e) => updateFilter('location', e.target.value)}
            aria-label="Город, метро, район"
          />
        </div>

        <div className={styles.buttonWrap}>
          <button type="submit" className={styles.submitButton} aria-label="Искать">
            <Search size={20} strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </section>
  )
}
