import type { FC, FormEvent } from 'react'
import { useState, useEffect } from 'react'
import styles from './authModal.module.css'

type AuthModalProps = {
  open: boolean
  onClose: () => void
  onSwitchToRegister?: () => void
}

export const AuthModal: FC<AuthModalProps> = ({ open, onClose, onSwitchToRegister }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEmail('')
      setPassword('')
      setError(null)
    }
  }, [open])

  if (!open) return null

  const getLoginUrl = () => {
    const base = import.meta.env.VITE_API_URL
    if (base && typeof base === 'string') {
      return `${base.replace(/\/$/, '')}/api/auth/login`
    }
    return '/api/auth/login'
  }

  const handleBackdropClick = () => {
    onClose()
  }

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const url = getLoginUrl()
    const body = { email, password }

    setIsLoading(true)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const status = response.status
      const contentType = response.headers.get('content-type')
      const isJson = contentType?.includes('application/json')
      const rawBody = await response.text()
      let responseBody: unknown = rawBody
      if (isJson && rawBody) {
        try {
          responseBody = JSON.parse(rawBody)
        } catch {
          responseBody = rawBody
        }
      }

      if (!response.ok) {
        let errorText: string
        if (status === 401) {
          errorText = 'Неверный email или пароль'
        } else if (responseBody && typeof responseBody === 'object' && 'message' in responseBody && typeof (responseBody as { message: unknown }).message === 'string') {
          errorText = (responseBody as { message: string }).message
        } else if (typeof responseBody === 'string' && responseBody.trim()) {
          errorText = responseBody.trim()
        } else {
          errorText = `Ошибка входа: ${status}`
        }
        setError(errorText)
        return
      }

      if (responseBody && typeof responseBody === 'object' && 'token' in responseBody) {
        const data = responseBody as { token: string; user?: unknown }
        localStorage.setItem('token', data.token)
        if (data.user !== undefined) {
          localStorage.setItem('user', JSON.stringify(data.user))
        }
      }

      onClose()
      window.location.reload()
    } catch {
      setError('Сервер недоступен. Проверьте, запущен ли backend.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-modal="true" role="dialog">
      <div className={styles.dialog} onClick={handleContentClick}>
        <h2 className={styles.title}>Авторизация</h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.errorMessage}>{error}</p>}

          <div className={styles.field}>
            <label htmlFor="auth-email" className={styles.label}>
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className={styles.input}
              placeholder="Введите email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.forgotRow}>
            <button type="button" className={styles.linkButton} disabled={isLoading}>
              Забыли пароль?
            </button>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <div className={styles.footer}>
          <span>Нет аккаунта?</span>
          <button
            type="button"
            className={styles.footerLinkButton}
            onClick={onSwitchToRegister}
            disabled={isLoading}
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  )
}

