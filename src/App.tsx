import './App.css'
import { InstallPWAButton } from './components/InstallPWAButton'

function App() {
  return (
    <div className="app-shell">
      <div className="safe-area">
        <main className="app-main">
          <section className="card" aria-labelledby="rentora-title">
            <header className="app-header">
              <div className="brand">
                <span className="brand-name">Rentora</span>
                <span className="brand-tagline">Платформа аренды недвижимости</span>
              </div>
              <span className="pill">Оптимизировано для мобильных устройств</span>
            </header>
            <h1 id="rentora-title" className="title">
              Быстрая аренда — прямо в браузере.
            </h1>
            <p className="subtitle">
              Установите Rentora как прогрессивное веб‑приложение (PWA), чтобы получить
              нативный опыт, быстрый доступ с главного экрана и стабильную работу офлайн.
            </p>

            <div className="actions">
              <InstallPWAButton className="primary-button" />
              <p className="secondary-text">
                Работает в <span className="secondary-highlight">Chrome, Safari, на Android и iOS</span>.
              </p>
            </div>

            <footer className="footer">
              <span>Кэширование страниц, ресурсов и изображений для работы офлайн.</span>
              <span>Сервис‑воркер автоматически обновляется в фоновом режиме.</span>
            </footer>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
