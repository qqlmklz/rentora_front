import type { FC } from 'react'
import { Heart, MessageCircle, Menu } from 'lucide-react'
import styles from './header.module.css'

type HeaderUser = {
  name: string
  avatarUrl?: string | null
}

type HeaderProps = {
  onLoginClick?: () => void
  user?: HeaderUser | null
}

export const Header: FC<HeaderProps> = ({ onLoginClick, user }) => {
  return (
    <header className={styles.headerRoot}>
      <div className={styles.headerInner}>
        <div className={styles.left}>
          <button type="button" className={styles.logo} aria-label="rentora">
            rentora
          </button>
        </div>

        <nav className={styles.nav} aria-label="Основная навигация">
          <button type="button" className={`${styles.navItem} ${styles.navItemActive}`}>
            Каталог
          </button>
          <button type="button" className={styles.navItem}>
            Коммерческая
          </button>
          <button type="button" className={styles.navItem}>
            Услуги
          </button>
          <button type="button" className={styles.navItem}>
            Риелторы
          </button>
        </nav>

        <div className={styles.right}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Сообщения"
          >
            <MessageCircle size={20} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Избранное"
          >
            <Heart size={20} />
          </button>
          <button type="button" className={styles.secondaryButton}>
            Разместить объявление
          </button>
          {user ? (
            <a
              href="/profile"
              className={styles.avatarButton}
              aria-label={`Профиль пользователя ${user.name}`}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className={styles.avatarImage} />
              ) : (
                <span className={styles.avatarFallback}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'R'}
                </span>
              )}
            </a>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onLoginClick}
            >
              Войти
            </button>
          )}

          <button
            type="button"
            className={styles.menuButton}
            aria-label="Открыть меню"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}

