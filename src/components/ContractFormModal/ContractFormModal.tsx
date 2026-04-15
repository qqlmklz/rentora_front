import type { FC, FormEvent } from 'react'
import type { ContractFormFields } from '../../services/contractsApi'
import styles from './ContractFormModal.module.css'

type Props = {
  open: boolean
  onClose: () => void
  value: ContractFormFields
  onChange: (next: ContractFormFields) => void
  onSubmit: () => void
  busy?: boolean
  error?: string | null
}

export const ContractFormModal: FC<Props> = ({
  open,
  onClose,
  value,
  onChange,
  onSubmit,
  busy,
  error,
}) => {
  if (!open) return null

  const patch = (partial: Partial<ContractFormFields>) => {
    onChange({ ...value, ...partial })
  }

  const handleNum =
    (key: 'price' | 'deposit' | 'utilitiesPrice') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      if (v === '') patch({ [key]: '' })
      else {
        const n = Number(v)
        patch({ [key]: Number.isFinite(n) ? n : '' })
      }
    }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-form-title"
      >
        <h2 id="contract-form-title" className={styles.title}>
          Договор аренды
        </h2>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Арендодатель</span>
              <input
                className={styles.input}
                value={value.landlordName}
                onChange={(e) => patch({ landlordName: e.target.value })}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Арендатор</span>
              <input
                className={styles.input}
                value={value.tenantName}
                onChange={(e) => patch({ tenantName: e.target.value })}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Город</span>
              <input
                className={styles.input}
                value={value.city}
                onChange={(e) => patch({ city: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Дата договора</span>
              <input
                className={styles.input}
                type="date"
                value={value.contractDate}
                onChange={(e) => patch({ contractDate: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Район</span>
              <input
                className={styles.input}
                value={value.district}
                onChange={(e) => patch({ district: e.target.value })}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Адрес</span>
              <input
                className={styles.input}
                value={value.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Тип аренды</span>
              <input
                className={styles.input}
                value={value.rentType}
                onChange={(e) => patch({ rentType: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Тип жилья</span>
              <input
                className={styles.input}
                value={value.propertyType}
                onChange={(e) => patch({ propertyType: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Цена, ₽</span>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={value.price === '' ? '' : value.price}
                onChange={handleNum('price')}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Залог, ₽</span>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={value.deposit === '' ? '' : value.deposit}
                onChange={handleNum('deposit')}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Коммунальные включены</span>
              <select
                className={styles.input}
                value={value.utilitiesIncluded ? 'yes' : 'no'}
                onChange={(e) => patch({ utilitiesIncluded: e.target.value === 'yes' })}
              >
                <option value="no">Нет</option>
                <option value="yes">Да</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Коммунальные, ₽</span>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={value.utilitiesPrice === '' ? '' : value.utilitiesPrice}
                onChange={handleNum('utilitiesPrice')}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Предоплата</span>
              <input
                className={styles.input}
                value={value.prepayment}
                onChange={(e) => patch({ prepayment: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Дети разрешены</span>
              <select
                className={styles.input}
                value={value.childrenAllowed ? 'yes' : 'no'}
                onChange={(e) => patch({ childrenAllowed: e.target.value === 'yes' })}
              >
                <option value="no">Нет</option>
                <option value="yes">Да</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Животные разрешены</span>
              <select
                className={styles.input}
                value={value.petsAllowed ? 'yes' : 'no'}
                onChange={(e) => patch({ petsAllowed: e.target.value === 'yes' })}
              >
                <option value="no">Нет</option>
                <option value="yes">Да</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Начало</span>
              <input
                className={styles.input}
                type="date"
                value={value.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Окончание</span>
              <input
                className={styles.input}
                type="date"
                value={value.endDate}
                onChange={(e) => patch({ endDate: e.target.value })}
              />
            </label>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={busy}>
              Отмена
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? 'Отправка…' : 'Отправить договор'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
