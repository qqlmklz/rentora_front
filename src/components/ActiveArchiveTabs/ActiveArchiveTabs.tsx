import styles from './ActiveArchiveTabs.module.css'

type Props<TArchive extends string> = {
  value: 'active' | TArchive
  onChange: (value: 'active' | TArchive) => void
  archiveValue: TArchive
  ariaLabel: string
  className?: string
}

export function ActiveArchiveTabs<TArchive extends string>({
  value,
  onChange,
  archiveValue,
  ariaLabel,
  className,
}: Props<TArchive>) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root

  return (
    <div className={rootClass} role="tablist" aria-label={ariaLabel}>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'active'}
        className={`${styles.tab} ${value === 'active' ? styles.tabActive : ''}`.trim()}
        onClick={() => onChange('active')}
      >
        Активные
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === archiveValue}
        className={`${styles.tab} ${value === archiveValue ? styles.tabActive : ''}`.trim()}
        onClick={() => onChange(archiveValue)}
      >
        Архив
      </button>
    </div>
  )
}
