import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { Header } from '../components/Header/Header'
import { AuthModal } from '../components/AuthModal/AuthModal'
import { RegisterModal } from '../components/RegisterModal/RegisterModal'

function getAuthUser(): { name: string; avatarUrl?: string | null } | null {
  if (!localStorage.getItem('token')) return null
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const u = JSON.parse(raw)
    if (u && typeof u.name === 'string') return { name: u.name, avatarUrl: u.avatarUrl ?? null }
    return null
  } catch {
    return null
  }
}

export function MainLayout({ children }: PropsWithChildren) {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [user] = useState(getAuthUser)

  const openAuth = () => {
    setIsRegisterOpen(false)
    setIsAuthOpen(true)
  }

  const openRegister = () => {
    setIsAuthOpen(false)
    setIsRegisterOpen(true)
  }

  return (
    <div className="app-shell">
      <Header onLoginClick={openAuth} user={user} />
      {children}
      <AuthModal open={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSwitchToRegister={openRegister} />
      <RegisterModal open={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onSwitchToLogin={openAuth} />
    </div>
  )
}

