import { Link } from 'react-router-dom'
import styles from './ServicesPage.module.css'

export function ServicesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Услуги</h1>
        <p className={styles.lead}>Раздел скоро появится</p>
        <p className={styles.text}>
          Мы готовим новые сервисы для арендаторов и арендодателей.
        </p>
        <Link to="/" className={styles.button}>
          На главную
        </Link>
      </div>
    </div>
  )
}
