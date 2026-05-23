import { Link } from 'react-router-dom'
import styles from './RealtorsPage.module.css'

export function RealtorsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Риелторы</h1>
        <p className={styles.lead}>Раздел скоро появится</p>
        <p className={styles.text}>
          Мы готовим возможность работы с риелторами в системе.
        </p>
        <Link to="/" className={styles.button}>
          На главную
        </Link>
      </div>
    </div>
  )
}
