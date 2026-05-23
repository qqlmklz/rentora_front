import type { FC } from 'react'
import { contractStatusLabel } from '../../constants/requests'
import type { ChatContract } from '../../services/contractsApi'
import styles from './ChatContractCard.module.css'

type Props = {
  contract: ChatContract
  isLandlord: boolean
  onOpen: () => void
  onAccept?: () => void
  onReject?: () => void
  actionBusy?: boolean
}

export const ChatContractCard: FC<Props> = ({
  contract,
  isLandlord,
  onOpen,
  onAccept,
  onReject,
  actionBusy,
}) => {
  const pending = String(contract.status).toLowerCase() === 'pending'
  const showTenantActions = !isLandlord && pending && onAccept && onReject

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Договор аренды</span>
        <span className={styles.badge}>{contractStatusLabel(contract.status)}</span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btnOpen} onClick={onOpen}>
          Открыть
        </button>
        {showTenantActions ? (
          <>
            <button
              type="button"
              className={styles.btnAccept}
              onClick={onAccept}
              disabled={actionBusy}
            >
              {actionBusy ? '…' : 'Принять'}
            </button>
            <button
              type="button"
              className={styles.btnReject}
              onClick={onReject}
              disabled={actionBusy}
            >
              Отклонить
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
