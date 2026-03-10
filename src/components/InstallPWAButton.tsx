import type React from 'react'
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt'

type Props = {
  className?: string
}

export const InstallPWAButton: React.FC<Props> = ({ className }) => {
  const { canInstall, promptInstall, isInstalled } = usePWAInstallPrompt()

  if (isInstalled) {
    return (
      <button className={className} type="button" disabled>
        <span className="primary-button-icon">✓</span>
        Приложение установлено
      </button>
    )
  }

  if (!canInstall) {
    return (
      <button className={className} type="button" disabled>
        <span className="primary-button-icon">⬇︎</span>
        Установку можно запустить из меню браузера
      </button>
    )
  }

  return (
    <button className={className} type="button" onClick={promptInstall}>
      <span className="primary-button-icon">⬇︎</span>
      Установить приложение
    </button>
  )
}

