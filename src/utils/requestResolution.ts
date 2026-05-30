import type { ProfileRequestItem } from '../services/requestsApi'

export type RequestResolutionType = 'owner' | 'tenant' | null

type ResolutionSource = {
  resolution_type?: unknown
  resolutionType?: unknown
  status?: unknown
}

function coerceResolutionType(raw: string): RequestResolutionType {
  const value = raw.trim().toLowerCase()
  if (value === 'owner' || value === 'owner_resolves') return 'owner'
  if (value === 'tenant' || value === 'tenant_resolves') return 'tenant'
  return null
}

/** Единый источник: resolution_type / resolutionType, иначе вывод из status. */
export function getResolutionType(source: ResolutionSource): RequestResolutionType {
  const fromField = coerceResolutionType(String(source.resolution_type ?? source.resolutionType ?? ''))
  if (fromField) return fromField

  const status = String(source.status ?? '').trim().toLowerCase()
  if (status === 'tenant_resolves' || status === 'waiting_expense') return 'tenant'
  if (status === 'owner_resolves') return 'owner'
  return null
}

export function resolutionTypeLabel(resolutionType: RequestResolutionType): string {
  if (resolutionType === 'tenant') return 'Жилец решает проблему'
  if (resolutionType === 'owner') return 'Владелец решает проблему'
  return 'Не назначено'
}

export function getExpensesSubmitted(source: {
  expenses_submitted?: unknown
  expensesSubmitted?: unknown
}): boolean {
  const raw = source.expenses_submitted ?? source.expensesSubmitted
  return raw === true || raw === 'true' || raw === 1 || raw === '1'
}

export function hasSubmittedExpenses(item: Pick<
  ProfileRequestItem,
  'expensesSubmitted' | 'expenseAmount' | 'expenseComment' | 'expensePhotos'
> & {
  expenses_submitted?: unknown
}): boolean {
  if (getExpensesSubmitted(item)) return true
  if (item.expenseAmount != null && item.expenseAmount > 0) return true
  if (item.expenseComment?.trim()) return true
  if (item.expensePhotos.length > 0) return true
  return false
}

type ExpensesConfirmedSource = {
  expenses_confirmed?: unknown
  expensesConfirmed?: unknown
  expense_confirmed?: unknown
  expenseConfirmed?: unknown
  expense_confirmed_by_owner?: unknown
  expenseConfirmedByOwner?: unknown
}

export function getExpensesConfirmed(source: ExpensesConfirmedSource): boolean {
  const raw =
    source.expenses_confirmed ??
    source.expensesConfirmed ??
    source.expense_confirmed_by_owner ??
    source.expenseConfirmedByOwner ??
    source.expense_confirmed ??
    source.expenseConfirmed
  return raw === true || raw === 'true' || raw === 1 || raw === '1'
}

export function getTenantExpensesConfirmedAt(source: {
  tenant_expenses_confirmed_at?: unknown
  tenantExpensesConfirmedAt?: unknown
}): string | null {
  const raw = source.tenant_expenses_confirmed_at ?? source.tenantExpensesConfirmedAt
  if (raw == null || raw === '') return null
  const value = String(raw).trim()
  return value === '' ? null : value
}

export function canShowConfirmTenantExpensesButton(params: {
  item: ProfileRequestItem
  isOwner: boolean
  isActiveListTab: boolean
}): boolean {
  const { item, isOwner, isActiveListTab } = params
  if (!isActiveListTab) return false

  const resolutionType = getResolutionType(item)
  const status = item.status.trim().toLowerCase()
  const expensesSubmitted = getExpensesSubmitted(item)
  const expensesConfirmed = getExpensesConfirmed(item)
  const tenantExpensesConfirmedAt = getTenantExpensesConfirmedAt(item)

  return (
    resolutionType === 'tenant' &&
    isOwner &&
    expensesSubmitted &&
    status !== 'completed' &&
    !item.isArchived &&
    !expensesConfirmed &&
    tenantExpensesConfirmedAt == null
  )
}
