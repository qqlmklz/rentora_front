import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Profile } from '../services/profileApi'
import {
  fetchProfile,
  updateProfile,
  updateAvatar,
  deleteAvatar,
  changePassword,
} from '../services/profileApi'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true })
      return
    }
    let cancelled = false
    fetchProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data)
          setEditName(data.name)
          setEditEmail(data.email)
          setEditPhone(data.phone ?? '')
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Не удалось загрузить профиль')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [navigate])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    const newPreview = URL.createObjectURL(file)
    setSelectedFile(file)
    setAvatarPreview(newPreview)
    e.target.value = ''

    setAvatarLoading(true)
    updateAvatar(file)
      .then((data) => {
        const url = data.avatarUrl ?? null
        setProfile((p) => (p ? { ...p, avatarUrl: url ?? p.avatarUrl } : null))
        URL.revokeObjectURL(newPreview)
        setAvatarPreview(null)
        setSelectedFile(null)
        const raw = localStorage.getItem('user')
        if (raw) {
          try {
            const u = JSON.parse(raw)
            localStorage.setItem('user', JSON.stringify({ ...u, avatarUrl: url }))
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => setAvatarError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setAvatarLoading(false))
  }

  const handleAvatarUpdate = async () => {
    if (!selectedFile) return
    setAvatarError(null)
    setAvatarLoading(true)
    try {
      const data = await updateAvatar(selectedFile)
      setProfile((p) => (p ? { ...p, avatarUrl: data.avatarUrl ?? p.avatarUrl } : null))
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
      setSelectedFile(null)
      const raw = localStorage.getItem('user')
      if (raw && data.avatarUrl) {
        try {
          const u = JSON.parse(raw)
          localStorage.setItem('user', JSON.stringify({ ...u, avatarUrl: data.avatarUrl }))
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleAvatarRemove = () => {
    setAvatarError(null)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
    }
    setSelectedFile(null)
    setAvatarLoading(true)
    deleteAvatar()
      .then(() => {
        setProfile((p) => (p ? { ...p, avatarUrl: null } : null))
        const raw = localStorage.getItem('user')
        if (raw) {
          try {
            const u = JSON.parse(raw)
            const { avatarUrl, ...rest } = u
            localStorage.setItem('user', JSON.stringify(rest))
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => setAvatarError(err instanceof Error ? err.message : 'Ошибка удаления'))
      .finally(() => setAvatarLoading(false))
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setEditError(null)
    setEditSaving(true)
    try {
      const updated = await updateProfile({
        name: editName,
        email: editEmail,
        phone: editPhone || null,
      })
      setProfile(updated)
      setEditMode(false)
      const raw = localStorage.getItem('user')
      if (raw) {
        try {
          const u = JSON.parse(raw)
          localStorage.setItem('user', JSON.stringify({ ...u, name: updated.name, email: updated.email }))
        } catch {
          // ignore
        }
      }
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setEditSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== newPasswordRepeat) {
      setPasswordError('Пароли не совпадают')
      return
    }
    setPasswordError(null)
    setPasswordSaving(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setPasswordOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordRepeat('')
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Не удалось изменить пароль')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.root}>
        <aside className={styles.sidebar} />
        <main className={styles.main}>
          <div className={styles.container}>
            <p className={styles.loading}>Загрузка…</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.root}>
        <aside className={styles.sidebar} />
        <main className={styles.main}>
          <div className={styles.container}>
            <p className={styles.error}>{error || 'Профиль не найден'}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <nav className={styles.sidebarNav}>
          <a href="/profile" className={styles.sidebarLinkActive}>
            Профиль
          </a>
          <a href="/profile/properties" className={styles.sidebarLink}>
            Мои объекты
          </a>
          <a href="/profile/documents" className={styles.sidebarLink}>
            Документы
          </a>
          <a href="/profile/requests" className={styles.sidebarLink}>
            Заявки
          </a>
          <a href="/profile/settings" className={styles.sidebarLink}>
            Настройки
          </a>
        </nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.card}>
            <h1 className={styles.title}>Личные данные</h1>

            <div className={styles.avatarRow}>
              <div className={styles.avatarWrap}>
                {avatarPreview || profile.avatarUrl ? (
                  <img
                    src={avatarPreview ?? profile.avatarUrl ?? ''}
                    alt={profile.name}
                    className={styles.avatarImg}
                  />
                ) : (
                  <span className={styles.avatarFallback}>
                    {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>
              <div className={styles.avatarActions}>
                {!(avatarPreview || profile.avatarUrl) ? (
                  <label className={styles.avatarButton}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={avatarLoading}
                      className={styles.avatarInput}
                    />
                    {avatarLoading ? 'Загрузка…' : 'Загрузить фото'}
                  </label>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={avatarLoading}
                      className={styles.avatarInput}
                      style={{ display: 'none' }}
                      aria-hidden
                    />
                    <button
                      type="button"
                      className={styles.avatarButton}
                      onClick={selectedFile ? handleAvatarUpdate : () => fileInputRef.current?.click()}
                      disabled={avatarLoading}
                    >
                      {avatarLoading ? 'Загрузка…' : 'Обновить'}
                    </button>
                    <button
                      type="button"
                      className={styles.avatarDelete}
                      onClick={handleAvatarRemove}
                      disabled={avatarLoading}
                    >
                      Удалить
                    </button>
                  </>
                )}
              </div>
              {avatarError && <p className={styles.fieldError}>{avatarError}</p>}
            </div>

            {editMode ? (
              <div className={styles.form}>
                {editError && <p className={styles.fieldError}>{editError}</p>}
                <div className={styles.field}>
                  <label className={styles.label}>ФИО</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="ФИО"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Телефон</label>
                  <input
                    type="tel"
                    className={styles.input}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Телефон"
                  />
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleSaveProfile}
                    disabled={editSaving}
                  >
                    {editSaving ? 'Сохранение…' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setEditMode(false)}
                    disabled={editSaving}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.info}>
                  <p className={styles.infoRow}>
                    <span className={styles.infoLabel}>ФИО</span>
                    <span className={styles.infoValue}>{profile.name || '—'}</span>
                  </p>
                  <p className={styles.infoRow}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{profile.email || '—'}</span>
                  </p>
                  <p className={styles.infoRow}>
                    <span className={styles.infoLabel}>Телефон</span>
                    <span className={styles.infoValue}>{profile.phone || '—'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setEditMode(true)}
                >
                  Изменить данные
                </button>
              </>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Безопасность</h2>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setPasswordOpen(true)}
            >
              Изменить пароль
            </button>

            {passwordOpen && (
              <div className={styles.passwordForm}>
                {passwordError && <p className={styles.fieldError}>{passwordError}</p>}
                <div className={styles.field}>
                  <label className={styles.label}>Текущий пароль</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Текущий пароль"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Новый пароль</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Новый пароль"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Повторите новый пароль</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={newPasswordRepeat}
                    onChange={(e) => setNewPasswordRepeat(e.target.value)}
                    placeholder="Повторите новый пароль"
                  />
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleChangePassword}
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? 'Сохранение…' : 'Изменить пароль'}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setPasswordOpen(false)
                      setPasswordError(null)
                      setCurrentPassword('')
                      setNewPassword('')
                      setNewPasswordRepeat('')
                    }}
                    disabled={passwordSaving}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
