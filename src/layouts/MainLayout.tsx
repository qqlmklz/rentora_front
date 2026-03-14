import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { Header } from '../components/Header/Header'
import { AuthModal } from '../components/AuthModal/AuthModal'
import { RegisterModal } from '../components/RegisterModal/RegisterModal'

export function MainLayout({ children }: PropsWithChildren) {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

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
      <Header onLoginClick={openAuth} />
      {children}
      <AuthModal open={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSwitchToRegister={openRegister} />
      <RegisterModal open={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onSwitchToLogin={openAuth} />
    </div>
  )
}

