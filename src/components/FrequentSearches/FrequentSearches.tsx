import type { FC } from 'react'
import styles from './frequentSearches.module.css'

type FrequentItem = {
  label: string
  href: string
}

const items: FrequentItem[] = [
  {
    label: 'Снять комнату',
    href: '/catalog?propertyType=Комната',
  },
  {
    label: 'Снять студию',
    href: '/catalog?propertyType=Студия',
  },
  {
    label: 'Снять склад',
    href: '/catalog?propertyType=Склад',
  },
  {
    label: 'Снять помещение',
    href: '/catalog?propertyType=Помещение',
  },
]

export const FrequentSearches: FC = () => {
  return (
    <section className={styles.section} aria-labelledby="frequent-searches-title">
      <div className={styles.headerRow}>
        <h2 id="frequent-searches-title" className={styles.title}>
          Часто ищут
        </h2>
      </div>

      <div className={styles.grid}>
        {items.map((item) => (
          <a key={item.href} href={item.href} className={styles.card}>
            <div className={styles.imagePlaceholder}>
              {/* Здесь позже можно разместить превью или иконку категории */}
            </div>
            <div className={styles.caption}>{item.label}</div>
          </a>
        ))}
      </div>
    </section>
  )
}

