export const REQUEST_CATEGORY_OPTIONS = [
  { value: 'electrical', label: 'Электрика' },
  { value: 'plumbing', label: 'Сантехника' },
  { value: 'heating', label: 'Отопление' },
  { value: 'appliance', label: 'Техника' },
  { value: 'cleaning', label: 'Клининг' },
  { value: 'other', label: 'Другое' },
] as const

export type RequestCategory = (typeof REQUEST_CATEGORY_OPTIONS)[number]['value']

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  pending: 'На согласовании',
  accepted: 'Принят',
  rejected: 'Отклонён',
  declined: 'Отклонён',
  terminated: 'Расторгнут',
}

export function contractStatusLabel(status: string): string {
  const key = status.toLowerCase()
  return CONTRACT_STATUS_LABELS[key] ?? status
}
