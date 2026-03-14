import type { FC, FormEvent } from 'react'
import styles from './registerModal.module.css'

type RegisterModalProps = {
  open: boolean
  onClose: () => void
  onSwitchToLogin?: () => void
}

export const RegisterModal: FC<RegisterModalProps> = ({ open, onClose, onSwitchToLogin }) => {
  if (!open) return null

  const handleBackdropClick = () => {
    onClose()
  }

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    // TODO: заменить на реальную регистрацию
    onClose()
  }

  const handleSwitchToLogin = () => {
    onClose()
    if (onSwitchToLogin) onSwitchToLogin()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-modal="true" role="dialog">
      <div className={styles.dialog} onClick={handleContentClick}>
        <h2 className={styles.title}>Регистрация</h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="register-name" className={styles.label}>
              Имя
            </label>
            <input
              id="register-name"
              type="text"
              className={styles.input}
              placeholder="Ваше имя"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-email" className={styles.label}>
              Email
            </label>
            <input
              id="register-email"
              type="email"
              className={styles.input}
              placeholder="Введите email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-password" className={styles.label}>
              Пароль
            </label>
            <input
              id="register-password"
              type="password"
              className={styles.input}
              placeholder="Придумайте пароль"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-password-confirm" className={styles.label}>
              Повтор пароля
            </label>
            <input
              id="register-password-confirm"
              type="password"
              className={styles.input}
              placeholder="Повторите пароль"
              required
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            Зарегистрироваться
          </button>
        </form>

        <div className={styles.footer}>
          <span>Уже есть аккаунт?</span>
          <button type="button" className={styles.footerLinkButton} onClick={handleSwitchToLogin}>
            Войти
          </button>
        </div>
      </div>
    </div>
  )
}

