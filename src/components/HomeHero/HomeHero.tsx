import type { FC } from 'react'
import styles from './homeHero.module.css'

export const HomeHero: FC = () => {
  return (
    <section className={styles.heroSection} aria-labelledby="home-hero-title">
      <div className={styles.heroBanner}>
        {/* Основное изображение (z-index: 1) */}
        <div className={styles.heroImageLayer} />
        {/* Второе изображение поверх основного: сюда вставить свою картинку (z-index: 2) */}
        <div className={styles.heroImageOverlay} />
        {/* Текстовый слой (z-index: 3) */}
        <div className={styles.heroTextLayer}>
          <p className={styles.subtitle}>Ваш новый дом начинается здесь</p>
          <h1 id="home-hero-title" className={styles.title}>
            RENTORA
          </h1>
        </div>
      </div>
    </section>
  )
}
