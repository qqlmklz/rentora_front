import type { FC } from 'react'
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handleLogout = () => {
    window.dispatchEvent(new CustomEvent('rentora:logout'))
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setDropdownOpen(false)
    window.location.reload()
  }

  return (
    <header className={styles.headerRoot}>
      <div className={styles.headerInner}>
        <div className={styles.left}>
          <Link to="/" className={styles.logo} aria-label="rentora">
            rentora
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Основная навигация">
          <Link to="/catalog" className={`${styles.navItem} ${styles.navItemActive}`}>
            Каталог
          </Link>
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
          <Link to="/chats" className={styles.iconButton} aria-label="Сообщения">
            <MessageCircle size={20} />
          </Link>
          {user ? (
            <Link to="/profile/favorites" className={styles.iconButton} aria-label="Избранное">
              <Heart size={20} />
            </Link>
          ) : (
            <button type="button" className={styles.iconButton} aria-label="Избранное" onClick={onLoginClick}>
              <Heart size={20} />
            </button>
          )}
          {user ? (
            <Link to="/properties/new" className={styles.secondaryButton}>
              Разместить объявление
            </Link>
          ) : (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onLoginClick}
            >
              Разместить объявление
            </button>
          )}
          {user ? (
            <div className={styles.avatarWrap} ref={avatarRef}>
              <button
                type="button"
                className={styles.avatarButton}
                aria-label={`Профиль пользователя ${user.name}`}
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen((v) => !v)}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className={styles.avatarImage} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'R'}
                  </span>
                )}
              </button>
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <Link
                    to="/profile"
                    className={styles.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    Личный кабинет
                  </Link>
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
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

