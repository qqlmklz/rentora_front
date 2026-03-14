import type { FC, FormEvent } from 'react'
import styles from './authModal.module.css'

type AuthModalProps = {
  open: boolean
  onClose: () => void
  onSwitchToRegister?: () => void
}

export const AuthModal: FC<AuthModalProps> = ({ open, onClose, onSwitchToRegister }) => {
  if (!open) return null

  const handleBackdropClick = () => {
    onClose()
  }

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    // TODO: заменить на реальную авторизацию
    // Временно просто закрываем модалку
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-modal="true" role="dialog">
      <div className={styles.dialog} onClick={handleContentClick}>
        <h2 className={styles.title}>Авторизация</h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="auth-email" className={styles.label}>
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className={styles.input}
              placeholder="Введите email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="auth-password" className={styles.label}>
              Пароль
            </label>
            <input
              id="auth-password"
              type="password"
              className={styles.input}
              placeholder="Введите пароль"
              required
            />
          </div>

          <div className={styles.forgotRow}>
            <button type="button" className={styles.linkButton}>
              Забыли пароль?
            </button>
          </div>

          <button type="submit" className={styles.submitButton}>
            Войти
          </button>
        </form>

        <div className={styles.footer}>
          <span>Нет аккаунта?</span>
          <button
            type="button"
            className={styles.footerLinkButton}
            onClick={onSwitchToRegister}
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  )
}

