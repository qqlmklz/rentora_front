import { InstallPWAButton } from '../components/InstallPWAButton'

export function HomePage() {
  return (
    <div className="safe-area">
      <main className="app-main">
        <section className="card" aria-labelledby="rentora-title">
          <header className="app-header">
            <div className="brand">
              <span className="brand-name">Rentora</span>
              <span className="brand-tagline">Платформа аренды недвижимости</span>
            </div>
            <span className="pill">PWA включено</span>
          </header>

          <h1 id="rentora-title" className="title">
            Арендуйте умнее, где угодно.
          </h1>
          <p className="subtitle">
            Установите Rentora как приложение, чтобы просматривать объявления об аренде
            с быстрым, мобильным интерфейсом и страницами, учитывающими работу офлайн.
          </p>

          <div className="actions">
            <InstallPWAButton className="primary-button" />
            <p className="secondary-text">
              Это PWA настроено для работы офлайн, кэширования во время выполнения и
              автоматических обновлений.
            </p>
          </div>

          <footer className="footer">
            <span>Оптимизировано для Chrome и Safari.</span>
            <span>Отлично работает на Android и iOS.</span>
          </footer>
        </section>
      </main>
    </div>
  )
}

