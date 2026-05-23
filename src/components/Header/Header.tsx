import type { FC } from 'react'
import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Heart, MessageCircle, Menu } from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import styles from './header.module.css'

type HeaderUser = {
  name: string
  avatarUrl?: string | null
}

type HeaderProps = {
  onLoginClick?: () => void
  user?: HeaderUser | null
}

function navItemClass(base: string, active: string, isActive: boolean): string {
  return `${base} ${isActive ? active : ''}`.trim()
}

export const Header: FC<HeaderProps> = ({ onLoginClick, user }) => {
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  const isServices =
    location.pathname === ROUTES.services || location.pathname.startsWith(`${ROUTES.services}/`)
  const isRealtors =
    location.pathname === ROUTES.realtors || location.pathname.startsWith(`${ROUTES.realtors}/`)
  const isCommercial =
    location.pathname === ROUTES.catalog &&
    new URLSearchParams(location.search).get('category') === 'commercial'
  const isCatalog = location.pathname === ROUTES.catalog && !isCommercial

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

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname, location.search])

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
          <Link to={ROUTES.home} className={styles.logo} aria-label="rentora">
            rentora
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Основная навигация">
          <Link
            to={ROUTES.catalog}
            className={navItemClass(styles.navItem, styles.navItemActive, isCatalog)}
          >
            Каталог
          </Link>
          <Link
            to={ROUTES.catalogCommercial}
            className={navItemClass(styles.navItem, styles.navItemActive, isCommercial)}
          >
            Коммерческая
          </Link>
          <Link
            to={ROUTES.services}
            className={navItemClass(styles.navItem, styles.navItemActive, isServices)}
          >
            Услуги
          </Link>
          <Link
            to={ROUTES.realtors}
            className={navItemClass(styles.navItem, styles.navItemActive, isRealtors)}
          >
            Риелторы
          </Link>
        </nav>

        <div className={styles.right}>
          <Link to={ROUTES.chats} className={styles.iconButton} aria-label="Сообщения">
            <MessageCircle size={20} />
          </Link>
          {user ? (
            <Link to={ROUTES.profileFavorites} className={styles.iconButton} aria-label="Избранное">
              <Heart size={20} />
            </Link>
          ) : (
            <button type="button" className={styles.iconButton} aria-label="Избранное" onClick={onLoginClick}>
              <Heart size={20} />
            </button>
          )}
          {user ? (
            <Link to={ROUTES.propertyNew} className={styles.secondaryButton}>
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
            aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {mobileNavOpen ? (
        <nav className={styles.mobileNav} aria-label="Мобильная навигация">
          <Link
            to={ROUTES.catalog}
            className={navItemClass(styles.mobileNavItem, styles.mobileNavItemActive, isCatalog)}
            onClick={() => setMobileNavOpen(false)}
          >
            Каталог
          </Link>
          <Link
            to={ROUTES.catalogCommercial}
            className={navItemClass(styles.mobileNavItem, styles.mobileNavItemActive, isCommercial)}
            onClick={() => setMobileNavOpen(false)}
          >
            Коммерческая
          </Link>
          <Link
            to={ROUTES.services}
            className={navItemClass(styles.mobileNavItem, styles.mobileNavItemActive, isServices)}
            onClick={() => setMobileNavOpen(false)}
          >
            Услуги
          </Link>
          <Link
            to={ROUTES.realtors}
            className={navItemClass(styles.mobileNavItem, styles.mobileNavItemActive, isRealtors)}
            onClick={() => setMobileNavOpen(false)}
          >
            Риелторы
          </Link>
        </nav>
      ) : null}
    </header>
  )
}

