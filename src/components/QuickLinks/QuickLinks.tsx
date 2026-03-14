import type { FC } from 'react'
import { FileText, Inbox, Settings, FolderOutput } from 'lucide-react'
import styles from './quickLinks.module.css'

type LinkItem = {
  label: string
  href: string
  icon: JSX.Element
}

const items: LinkItem[] = [
  {
    label: 'Мои объекты',
    href: '/profile/properties',
    icon: <FolderOutput size={22} />,
  },
  {
    label: 'Документы',
    href: '/profile/documents',
    icon: <FileText size={22} />,
  },
  {
    label: 'Заявки',
    href: '/profile/requests',
    icon: <Inbox size={22} />,
  },
  {
    label: 'Настройки',
    href: '/profile/settings',
    icon: <Settings size={22} />,
  },
]

export const QuickLinks: FC = () => {
  return (
    <nav className={styles.wrapper} aria-label="Быстрые разделы">
      <div className={styles.inner}>
        {items.map((item) => (
          <a key={item.href} href={item.href} className={styles.item}>
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}

