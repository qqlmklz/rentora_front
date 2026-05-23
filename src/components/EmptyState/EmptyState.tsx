import type { FC } from 'react'
import styles from './EmptyState.module.css'

type Props = {
  children: string
  className?: string
}

export const EmptyState: FC<Props> = ({ children, className }) => {
  return <p className={className ? `${styles.root} ${className}` : styles.root}>{children}</p>
}
