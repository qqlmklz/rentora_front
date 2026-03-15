import type { FC, FormEvent } from 'react'
import { useState, useEffect } from 'react'
import styles from './registerModal.module.css'

type RegisterModalProps = {
  open: boolean
  onClose: () => void
  onSwitchToLogin?: () => void
}

export const RegisterModal: FC<RegisterModalProps> = ({ open, onClose, onSwitchToLogin }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setError(null)
      setSuccess(false)
    }
  }, [open])

  if (!open) return null

  const handleBackdropClick = () => {
    onClose()
  }

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const getRegisterUrl = () => {
    const base = import.meta.env.VITE_API_URL
    if (base && typeof base === 'string') {
      return `${base.replace(/\/$/, '')}/api/auth/register`
    }
    return '/api/auth/register'
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    const url = getRegisterUrl()
    const body = { name, email, password }

    setLoading(true)
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

      // Временно: диагностика в консоль
      console.log('[Register] URL:', url)
      console.log('[Register] Status:', status)
      console.log('[Register] Response body:', responseBody)

      if (!response.ok) {
        let errorText: string
        if (status === 409) {
          errorText = 'Пользователь с таким email уже существует'
        } else if (status === 400 && responseBody && typeof responseBody === 'object' && 'message' in responseBody && typeof (responseBody as { message: unknown }).message === 'string') {
          errorText = (responseBody as { message: string }).message
        } else if (responseBody && typeof responseBody === 'object' && 'message' in responseBody && typeof (responseBody as { message: unknown }).message === 'string') {
          errorText = (responseBody as { message: string }).message
        } else if (typeof responseBody === 'string' && responseBody.trim()) {
          errorText = responseBody.trim()
        } else {
          errorText = `Ошибка регистрации: ${status}`
        }
        setError(errorText)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        onSwitchToLogin?.()
      }, 1500)
    } catch (err) {
      console.log('[Register] Request failed:', err)
      setError('Сервер недоступен. Проверьте, запущен ли backend.')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchToLogin = () => {
    onClose()
    onSwitchToLogin?.()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-modal="true" role="dialog">
      <div className={styles.dialog} onClick={handleContentClick}>
        <h2 className={styles.title}>Регистрация</h2>

        {success ? (
          <p className={styles.successMessage}>Регистрация прошла успешно</p>
        ) : (
          <>
            <form className={styles.form} onSubmit={handleSubmit}>
              {error && <p className={styles.errorMessage}>{error}</p>}

              <div className={styles.field}>
                <label htmlFor="register-name" className={styles.label}>
                  Имя
                </label>
                <input
                  id="register-name"
                  type="text"
                  className={styles.input}
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Отправка…' : 'Зарегистрироваться'}
              </button>
            </form>

            <div className={styles.footer}>
              <span>Уже есть аккаунт?</span>
              <button
                type="button"
                className={styles.footerLinkButton}
                onClick={handleSwitchToLogin}
                disabled={loading}
              >
                Войти
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

