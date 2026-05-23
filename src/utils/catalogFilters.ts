import type { CatalogFilters } from '../services/catalogApi'
import {
  CATEGORY_ALIASES,
  CATEGORY_VALUES,
  isPropertyTypeValidForCategory,
  PROPERTY_TYPE_ALIASES,
  PROPERTY_TYPE_VALUES,
  ROOMS_VALUES,
  SORT_ALIASES,
  SORT_VALUES,
} from '../constants/property'

export function normalizeByAliases(value: string | null, aliases: Record<string, string>): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  return aliases[raw.toLowerCase()] ?? raw
}

export function normalizeOptionValue(
  value: string | null,
  aliases: Record<string, string>,
  allowedValues: Set<string>,
  fallback = '',
): string {
  const normalized = normalizeByAliases(value, aliases)
  if (!normalized) return fallback
  return allowedValues.has(normalized) ? normalized : fallback
}

export function filtersFromSearchParams(params: URLSearchParams): CatalogFilters {
  const category = normalizeOptionValue(params.get('category'), CATEGORY_ALIASES, CATEGORY_VALUES)
  const propertyType = normalizeOptionValue(
    params.get('propertyType'),
    PROPERTY_TYPE_ALIASES,
    PROPERTY_TYPE_VALUES,
  )
  const rooms = normalizeOptionValue(params.get('rooms'), {}, ROOMS_VALUES)
  return {
    category,
    propertyType: isPropertyTypeValidForCategory(category, propertyType) ? propertyType : '',
    rooms: category === 'commercial' ? '' : rooms,
    priceFrom: (params.get('priceFrom') ?? '').trim(),
    priceTo: (params.get('priceTo') ?? '').trim(),
    location: (params.get('location') ?? '').trim(),
    sort: normalizeOptionValue(params.get('sort'), SORT_ALIASES, SORT_VALUES, 'newest'),
  }
}
