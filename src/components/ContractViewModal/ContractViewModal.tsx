import type { FC, ReactNode } from 'react'
import type { ContractFormFields } from '../../services/contractsApi'
import styles from './ContractViewModal.module.css'

export type ContractViewTenantActions = {
  onAccept: () => void
  onReject: () => void
  busy?: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  data: ContractFormFields | null
  loading?: boolean
  error?: string | null
  /** Принять / отклонить (арендатор, статус pending) */
  tenantActions?: ContractViewTenantActions | null
}

function fmtMoney(v: number | ''): string {
  if (v === '') return '—'
  return `${v.toLocaleString('ru-RU')} ₽`
}

function row(label: string, value: ReactNode) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionRows}>{children}</div>
    </section>
  )
}

function structuredDocument(data: ContractFormFields) {
  return (
    <>
      <Section title="Стороны">
        {row('Арендодатель', data.landlordName || '—')}
        {row('Арендатор', data.tenantName || '—')}
      </Section>
      <Section title="Объект аренды">
        {row('Город', data.city || '—')}
        {row('Район', data.district || '—')}
        {row('Адрес', data.address || '—')}
        {row('Тип аренды', data.rentType || '—')}
        {row('Тип жилья', data.propertyType || '—')}
      </Section>
      <Section title="Финансовые условия">
        {row('Цена в месяц', fmtMoney(data.price))}
        {row('Залог', fmtMoney(data.deposit))}
        {row('Коммунальные включены', data.utilitiesIncluded ? 'Да' : 'Нет')}
        {row('Коммунальные платежи', fmtMoney(data.utilitiesPrice))}
        {row('Предоплата', data.prepayment || '—')}
      </Section>
      <Section title="Срок аренды">
        {row('Дата договора', data.contractDate || '—')}
        {row('Начало аренды', data.startDate || '—')}
        {row('Окончание аренды', data.endDate || '—')}
      </Section>
      <Section title="Условия проживания">
        {row('Дети разрешены', data.childrenAllowed ? 'Да' : 'Нет')}
        {row('Животные разрешены', data.petsAllowed ? 'Да' : 'Нет')}
      </Section>
    </>
  )
}

export const ContractViewModal: FC<Props> = ({
  open,
  onClose,
  data,
  loading = false,
  error = null,
  tenantActions = null,
}) => {
  if (!open) return null

  const showTenantBtns = Boolean(tenantActions)

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-view-title"
      >
        <div className={styles.dialogHeader}>
          <h2 id="contract-view-title" className={styles.docTitle}>
            Договор аренды
          </h2>
          {error ? (
            <p className={styles.inlineError} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className={styles.scrollArea}>
          {loading ? (
            <p className={styles.loading}>Загрузка…</p>
          ) : data ? (
            <div className={styles.document}>{structuredDocument(data)}</div>
          ) : !error ? (
            <p className={styles.emptyHint}>Нет данных для отображения.</p>
          ) : null}
        </div>

        <div className={styles.footer}>
          {showTenantBtns && tenantActions ? (
            <>
              <button
                type="button"
                className={styles.btnReject}
                onClick={tenantActions.onReject}
                disabled={tenantActions.busy}
              >
                {tenantActions.busy ? '…' : 'Отклонить'}
              </button>
              <button
                type="button"
                className={styles.btnAccept}
                onClick={tenantActions.onAccept}
                disabled={tenantActions.busy}
              >
                {tenantActions.busy ? '…' : 'Принять'}
              </button>
            </>
          ) : null}
          <button type="button" className={styles.btnClose} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
