import type { FC, ReactNode } from 'react'
import { FileText, Inbox, FolderOutput } from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import styles from './quickLinks.module.css'

type LinkItem = {
  label: string
  href: string
  icon: ReactNode
}

const items: LinkItem[] = [
  {
    label: 'Мои объекты',
    href: ROUTES.profileProperties,
    icon: <FolderOutput size={22} />,
  },
  {
    label: 'Документы',
    href: ROUTES.profileDocuments,
    icon: <FileText size={22} />,
  },
  {
    label: 'Заявки',
    href: ROUTES.profileRequests,
    icon: <Inbox size={22} />,
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
