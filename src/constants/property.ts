export type PropertyCategory = 'residential' | 'commercial'

export const CATEGORY_OPTIONS = [
  { value: '', label: 'Любой тип' },
  { value: 'residential', label: 'Жилое' },
  { value: 'commercial', label: 'Коммерция' },
] as const

export const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Любой объект' },
  { value: 'apartment', label: 'Квартира' },
  { value: 'room', label: 'Комната' },
  { value: 'studio', label: 'Студия' },
  { value: 'house', label: 'Дом' },
  { value: 'cottage', label: 'Коттедж' },
  { value: 'office', label: 'Офис' },
  { value: 'coworking', label: 'Коворкинг' },
  { value: 'building', label: 'Здание' },
  { value: 'warehouse', label: 'Склад' },
] as const

export const ROOMS_OPTIONS = [
  { value: '', label: 'Любые' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6+', label: '6+' },
] as const

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'cheapest', label: 'Сначала дешёвые' },
  { value: 'expensive', label: 'Сначала дорогие' },
] as const

export const CATEGORY_ALIASES: Record<string, string> = {
  жилое: 'residential',
  коммерция: 'commercial',
}

export const PROPERTY_TYPE_ALIASES: Record<string, string> = {
  квартира: 'apartment',
  комната: 'room',
  студия: 'studio',
  дом: 'house',
  коттедж: 'cottage',
  офис: 'office',
  коворкинг: 'coworking',
  здание: 'building',
  склад: 'warehouse',
}

export const SORT_ALIASES: Record<string, string> = {
  'сначала новые': 'newest',
  'сначала дешёвые': 'cheapest',
  'сначала дорогие': 'expensive',
}

export const CATEGORY_VALUES = new Set(
  CATEGORY_OPTIONS.map((option) => option.value).filter(Boolean),
)

export const PROPERTY_TYPE_VALUES = new Set<string>(
  PROPERTY_TYPE_OPTIONS.map((option) => option.value).filter(Boolean),
)

export const ROOMS_VALUES = new Set(ROOMS_OPTIONS.map((option) => option.value))

export const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

export const PROPERTY_TYPES_BY_CATEGORY: Record<PropertyCategory, string[]> = {
  residential: ['apartment', 'room', 'studio', 'house', 'cottage'],
  commercial: ['office', 'coworking', 'building', 'warehouse'],
}

/** Поисковая строка / главная — без пустой опции «любое». */
export const SEARCH_CATEGORIES = [
  { value: 'residential', label: 'Жилое' },
  { value: 'commercial', label: 'Коммерция' },
] as const

export const RESIDENTIAL_TYPES = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'room', label: 'Комната' },
  { value: 'studio', label: 'Студия' },
  { value: 'house', label: 'Дом' },
  { value: 'cottage', label: 'Коттедж' },
] as const

export const COMMERCIAL_TYPES = [
  { value: 'warehouse', label: 'Склад' },
  { value: 'office', label: 'Офис' },
  { value: 'coworking', label: 'Коворкинг' },
  { value: 'building', label: 'Здание' },
] as const

export const SEARCH_ROOMS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6+', label: '6+' },
] as const

/** Подкатегории в форме нового объявления */
export const RESIDENTIAL_SUBCATEGORIES = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'room', label: 'Комната' },
  { value: 'studio', label: 'Студия' },
  { value: 'house', label: 'Дом / дача' },
  { value: 'cottage', label: 'Коттедж' },
] as const

export const COMMERCIAL_SUBCATEGORIES = [
  { value: 'office', label: 'Офис' },
  { value: 'coworking', label: 'Коворкинг' },
  { value: 'building', label: 'Здание' },
  { value: 'warehouse', label: 'Склад' },
] as const

export function isPropertyTypeValidForCategory(category: string, propertyType: string): boolean {
  if (!propertyType) return true
  if (category !== 'residential' && category !== 'commercial') {
    return PROPERTY_TYPE_VALUES.has(propertyType)
  }
  return PROPERTY_TYPES_BY_CATEGORY[category].includes(propertyType)
}

export function getPropertyTypesForCategory(category: string) {
  if (category === 'residential') return RESIDENTIAL_TYPES
  if (category === 'commercial') return COMMERCIAL_TYPES
  return []
}

/** Сброс зависимых фильтров при смене категории / типа объекта (каталог, поиск, форма). */
export function applyPropertyFilterCascade<T extends { category: string; propertyType: string; rooms: string }>(
  prev: T,
  key: 'category' | 'propertyType',
  value: string,
): T {
  const next = { ...prev, [key]: value }
  if (key === 'category') {
    next.propertyType = ''
    if (value === 'commercial') next.rooms = ''
  }
  if (key === 'propertyType' && value === 'studio') {
    next.rooms = ''
  }
  return next
}
