import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchChats,
  fetchChatMessages,
  fetchOpenChat,
  getCurrentUserId,
  markChatAsRead,
  messagePreviewText,
  sendChatMessage,
  type ChatListItem,
  type ChatMessage,
  type OpenChatDetail,
} from '../services/chatsApi'
import { ChatContractCard } from '../components/ChatContractCard/ChatContractCard'
import { ContractFormModal } from '../components/ContractFormModal/ContractFormModal'
import { ContractViewModal } from '../components/ContractViewModal/ContractViewModal'
import { useChatsWebSocket } from '../hooks/useChatsWebSocket'
import {
  acceptContract,
  createContract,
  emptyDraft,
  fetchContract,
  fetchContractDraft,
  prefillContractFormFromChat,
  rejectContract,
  validateContractFormForSubmit,
  type ChatContract,
  type ContractFormFields,
} from '../services/contractsApi'
import { isChatLandlord, isChatTenant } from '../utils/requestRoles'
import styles from './ChatsPage.module.css'

const OPEN_AUTH_EVENT = 'rentora:open-auth'

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Сегодня — время; вчера — «Вчера»; иначе дата */
function formatChatListTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const dayDiff = (startOfLocalDay(now) - startOfLocalDay(d)) / 86_400_000
  if (dayDiff === 0) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  if (dayDiff === 1) {
    return 'Вчера'
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function companionInitialLetter(displayName: string): string {
  const d = displayName.trim()
  if (!d) return 'П'
  return d.charAt(0).toUpperCase()
}

const CompanionAvatar: FC<{
  url: string | null
  displayName: string
  className: string
}> = ({ url, displayName, className }) => {
  const [imgError, setImgError] = useState(false)
  useEffect(() => {
    setImgError(false)
  }, [url])
  const showImg = Boolean(url) && !imgError
  return (
    <div className={className}>
      {showImg ? (
        <img src={url!} alt="" onError={() => setImgError(true)} />
      ) : (
        <span className={`${styles.chatThumbFallback} ${styles.companionInitial}`}>
          {companionInitialLetter(displayName)}
        </span>
      )}
    </div>
  )
}

export function ChatsPage() {
  const navigate = useNavigate()
  const { chatId } = useParams<{ chatId: string }>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatIdRef = useRef<string | undefined>(chatId)

  const [chats, setChats] = useState<ChatListItem[]>([])
  const [chatsLoading, setChatsLoading] = useState(true)
  const [chatsError, setChatsError] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [sendBusy, setSendBusy] = useState(false)
  /** Данные открытого чата (GET /api/chats/:id), не из списка */
  const [openChat, setOpenChat] = useState<OpenChatDetail | null>(null)
  const [openChatLoading, setOpenChatLoading] = useState(false)

  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [contractFormDraft, setContractFormDraft] = useState<ContractFormFields>(emptyDraft())
  const [contractDraftLoading, setContractDraftLoading] = useState(false)
  const [contractDraftError, setContractDraftError] = useState<string | null>(null)
  const [contractSubmitBusy, setContractSubmitBusy] = useState(false)
  const [contractFormError, setContractFormError] = useState<string | null>(null)
  const [contractViewOpen, setContractViewOpen] = useState(false)
  const [contractViewData, setContractViewData] = useState<ChatContract | null>(null)
  const [contractViewLoading, setContractViewLoading] = useState(false)
  const [contractViewError, setContractViewError] = useState<string | null>(null)
  const [contractActionBusyId, setContractActionBusyId] = useState<string | null>(null)

  useEffect(() => {
    chatIdRef.current = chatId
  }, [chatId])

  useEffect(() => {
    if (!localStorage.getItem('token') || !chatId) {
      setOpenChat(null)
      return
    }
    let cancelled = false
    setOpenChatLoading(true)
    setOpenChat(null)
    fetchOpenChat(chatId)
      .then((detail) => {
        if (cancelled) return
        setOpenChat(detail)
      })
      .catch((e) => {
        if (!cancelled) {
          setOpenChat(null)
          console.warn('[ChatsPage] не удалось загрузить открытый чат', e)
        }
      })
      .finally(() => {
        if (!cancelled) setOpenChatLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [chatId])

  useEffect(() => {
    if (!openChat) return
    const currentUserId = getCurrentUserId()
    console.log('currentUser.id:', currentUserId)
    console.log('chat.propertyOwnerId:', openChat.propertyOwnerId)
    console.log('chat:', openChat.chat)
    if (openChat.propertyOwnerId == null || String(openChat.propertyOwnerId).trim() === '') {
      console.warn(
        '[ChatsPage] propertyOwnerId отсутствует в данных открытого чата — кнопка «Договор» скрыта',
        openChat.chat,
      )
    }
  }, [openChat])

  const loadChats = useCallback((silent = false) => {
    if (!localStorage.getItem('token')) return
    if (!silent) {
      setChatsError(null)
      setChatsLoading(true)
    }
    fetchChats()
      .then((list) => {
        const active = chatIdRef.current
        if (active) {
          setChats(
            list.map((c) =>
              String(c.id) === String(active) ? { ...c, unreadCount: 0 } : c,
            ),
          )
        } else {
          setChats(list)
        }
      })
      .catch((e) => {
        if (!silent) setChatsError(e instanceof Error ? e.message : 'Не удалось загрузить чаты')
      })
      .finally(() => {
        if (!silent) setChatsLoading(false)
      })
  }, [])

  const onWsNewMessage = useCallback(
    ({ chatId: incomingChatId, message }: { chatId: string; message: ChatMessage }) => {
      const active = chatIdRef.current
      const isOpen = active != null && String(active) === String(incomingChatId)

      if (isOpen) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev
          const next = [...prev, message]
          next.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          return next
        })
        setChats((prev) =>
          prev.map((c) =>
            String(c.id) === String(incomingChatId)
              ? {
                  ...c,
                  lastMessage: messagePreviewText(message),
                  lastMessageAt: message.createdAt,
                  unreadCount: 0,
                }
              : c,
          ),
        )
        return
      }

      setChats((prev) => {
        const idx = prev.findIndex((c) => String(c.id) === String(incomingChatId))
        if (idx === -1) {
          loadChats(true)
          return prev
        }
        const bump = message.isMine ? 0 : 1
        return prev.map((c) => {
          if (String(c.id) !== String(incomingChatId)) return c
          return {
            ...c,
            lastMessage: messagePreviewText(message),
            lastMessageAt: message.createdAt,
            unreadCount: c.unreadCount + bump,
          }
        })
      })
    },
    [loadChats],
  )

  useChatsWebSocket({ enabled: true, onNewMessage: onWsNewMessage })

  useEffect(() => {
    loadChats()
  }, [loadChats])

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    const id = window.setInterval(() => loadChats(true), 60_000)
    return () => window.clearInterval(id)
  }, [loadChats])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) loadChats(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [loadChats])

  useEffect(() => {
    if (!localStorage.getItem('token') || !chatId) return
    let cancelled = false
    markChatAsRead(chatId)
      .then(() => {
        if (!cancelled) {
          setChats((prev) =>
            prev.map((c) => (String(c.id) === String(chatId) ? { ...c, unreadCount: 0 } : c)),
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [chatId])

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setMessages([])
      setMessagesLoading(false)
      setMessagesError(null)
      return
    }
    if (!chatId) {
      setMessages([])
      setMessagesError(null)
      return
    }
    setMessages([])
    let cancelled = false
    setMessagesLoading(true)
    setMessagesError(null)
    fetchChatMessages(chatId)
      .then((list) => {
        if (!cancelled) setMessages(list)
      })
      .catch((e) => {
        if (!cancelled) setMessagesError(e instanceof Error ? e.message : 'Не удалось загрузить сообщения')
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatId])

  const activeChat = useMemo(
    () => chats.find((c) => String(c.id) === String(chatId)),
    [chats, chatId],
  )

  const showContractButton = useMemo(() => {
    if (openChatLoading || !openChat) return false
    const uid = getCurrentUserId()
    const pid = openChat.propertyOwnerId
    if (uid == null || pid == null || String(pid).trim() === '') return false
    return String(uid) === String(pid)
  }, [openChat, openChatLoading])

  const handleContractClick = async () => {
    console.log('open contract modal')
    if (!chatId) {
      console.warn('[ChatsPage] Договор: нет chatId')
      return
    }
    setContractDraftLoading(true)
    setContractDraftError(null)
    try {
      const fields = await fetchContractDraft(chatId)
      const uid = getCurrentUserId()
      const isLandlord =
        uid != null &&
        openChat?.propertyOwnerId != null &&
        String(openChat.propertyOwnerId) === String(uid)
      const companionName =
        activeChat?.companionName?.trim() ??
        (() => {
          const c = openChat?.chat as Record<string, unknown> | undefined
          if (!c) return ''
          const v = c.companionName ?? c.companion_name
          return v != null ? String(v).trim() : ''
        })()
      setContractFormDraft(
        prefillContractFormFromChat(fields, openChat?.chat ?? null, {
          isLandlord,
          companionName: companionName || '',
        }),
      )
      setContractModalOpen(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить черновик договора'
      setContractDraftError(msg)
    } finally {
      setContractDraftLoading(false)
    }
  }

  const handleSend = async () => {
    if (!chatId || !draft.trim() || sendBusy) return
    setSendBusy(true)
    setMessagesError(null)
    try {
      await sendChatMessage(chatId, draft)
      setDraft('')
      const next = await fetchChatMessages(chatId)
      console.log('updated messages list:', next)
      setMessages(next)
      loadChats(true)
    } catch (e) {
      setMessagesError(e instanceof Error ? e.message : 'Не удалось отправить')
    } finally {
      setSendBusy(false)
    }
  }

  const handleContractSubmit = async () => {
    if (!chatId || contractSubmitBusy) return
    setContractFormError(null)
    const validationError = validateContractFormForSubmit(contractFormDraft)
    if (validationError) {
      setContractFormError(validationError)
      return
    }
    setContractSubmitBusy(true)
    try {
      await createContract(chatId, contractFormDraft)
      setContractModalOpen(false)
      setContractFormDraft(emptyDraft())
      const next = await fetchChatMessages(chatId)
      console.log('updated messages list:', next)
      setMessages(next)
      loadChats(true)
    } catch (e) {
      setContractFormError(e instanceof Error ? e.message : 'Не удалось отправить договор')
    } finally {
      setContractSubmitBusy(false)
    }
  }

  const currentUid = getCurrentUserId()
  const isLandlordInOpenChat = isChatLandlord(currentUid, openChat?.propertyOwnerId)
  const isTenantInOpenChat = isChatTenant(currentUid, openChat?.propertyOwnerId)

  const runContractAction = async (contractId: string, action: 'accept' | 'reject') => {
    if (!chatId) return
    setContractActionBusyId(contractId)
    try {
      if (action === 'accept') await acceptContract(contractId)
      else await rejectContract(contractId)
      const next = await fetchChatMessages(chatId)
      console.log('updated messages list:', next)
      setMessages(next)
      loadChats(true)
    } catch (e) {
      setMessagesError(e instanceof Error ? e.message : 'Не удалось выполнить действие')
    } finally {
      setContractActionBusyId(null)
    }
  }

  const clearSelectedDialog = useCallback(() => {
    navigate('/chats')
  }, [navigate])

  const emptyChats = !chatsLoading && !chatsError && chats.length === 0
  const emptyMessages =
    Boolean(chatId) && !messagesLoading && !messagesError && messages.length === 0

  if (!localStorage.getItem('token')) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Сообщения</h1>
          <div className={styles.authGate}>
            <p className={styles.authGateText}>Войдите, чтобы просматривать сообщения.</p>
            <button
              type="button"
              className={styles.sendBtn}
              onClick={() => window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT))}
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Сообщения</h1>

        {chatsError && (
          <div className={styles.errorBanner} role="alert">
            {chatsError}
          </div>
        )}

        <div
          className={`${styles.layout} ${chatId ? styles.hasSelectedDialog : ''}`.trim()}
        >
          <aside className={styles.sidebar} aria-label="Список чатов">
            <div className={styles.sidebarHeader}>Диалоги</div>
            <div className={styles.list}>
              {chatsLoading && <p className={styles.listLoading}>Загрузка…</p>}
              {emptyChats && <p className={styles.listEmpty}>У вас пока нет сообщений</p>}
              {!chatsLoading &&
                chats.map((c) => {
                  const isActive = chatId != null && String(c.id) === String(chatId)
                  const hasUnread = c.unreadCount > 0
                  const previewText = c.lastMessage.trim() ? c.lastMessage : 'Нет сообщений'
                  const badge =
                    c.unreadCount > 99 ? '99+' : String(c.unreadCount)
                  return (
                  <Link
                    key={c.id}
                    to={`/chats/${encodeURIComponent(String(c.id))}`}
                    className={`${styles.chatRow} ${isActive ? styles.chatRowActive : ''} ${hasUnread ? styles.chatRowUnread : ''}`}
                  >
                    <CompanionAvatar
                      className={styles.chatThumb}
                      url={c.companionAvatar}
                      displayName={c.companionName}
                    />
                    <div className={styles.chatMeta}>
                      <div className={styles.chatRowTop}>
                        <p className={styles.chatTitle}>{c.propertyTitle}</p>
                        <div className={styles.chatRowMeta}>
                          {c.lastMessageAt ? (
                            <span className={styles.chatTime}>{formatChatListTime(c.lastMessageAt)}</span>
                          ) : null}
                          {hasUnread ? (
                            <span className={styles.unreadBadge} aria-label={`Непрочитано: ${c.unreadCount}`}>
                              {badge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className={styles.chatPeer}>{c.companionName}</p>
                      <p className={`${styles.chatPreview} ${hasUnread ? styles.chatPreviewUnread : ''}`}>
                        {previewText}
                      </p>
                    </div>
                  </Link>
                  )
                })}
            </div>
          </aside>

          <section className={styles.thread} aria-label="Переписка">
            {!chatId && (
              <div className={styles.placeholder}>Выберите диалог слева или напишите автору объявления</div>
            )}

            {chatId && (
              <>
                <div className={styles.threadHeader}>
                  {activeChat ? (
                    <div className={styles.threadHeaderMain}>
                      <div className={styles.threadHeaderRowWithBack}>
                        <button
                          type="button"
                          className={styles.backBtn}
                          onClick={clearSelectedDialog}
                          aria-label="Назад к списку диалогов"
                        >
                          ← Назад
                        </button>
                        <div className={styles.threadHeaderRow}>
                          <CompanionAvatar
                            className={styles.chatThumb}
                            url={activeChat.companionAvatar}
                            displayName={activeChat.companionName}
                          />
                          <div className={styles.threadHeaderText}>
                            <p className={styles.threadHeaderTitle}>{activeChat.propertyTitle}</p>
                            <p className={styles.threadHeaderSub}>{activeChat.companionName}</p>
                          </div>
                        </div>
                      </div>
                      {showContractButton ? (
                        <button
                          type="button"
                          className={styles.contractHeaderBtn}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            void handleContractClick()
                          }}
                          disabled={contractDraftLoading}
                          aria-busy={contractDraftLoading}
                        >
                          {contractDraftLoading ? '…' : 'Договор'}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className={styles.threadHeaderRowWithBack}>
                      <button
                        type="button"
                        className={styles.backBtn}
                        onClick={clearSelectedDialog}
                        aria-label="Назад к списку диалогов"
                      >
                        ← Назад
                      </button>
                      <p className={styles.threadHeaderTitle}>Чат</p>
                    </div>
                  )}
                </div>

                {contractDraftError ? (
                  <div className={styles.errorBanner} role="alert" style={{ margin: '0 16px 8px' }}>
                    {contractDraftError}
                  </div>
                ) : null}

                <div
                  className={styles.threadBody}
                  aria-busy={messagesLoading}
                  aria-live="polite"
                >
                  {messagesLoading && (
                    <p className={styles.threadLoading}>Загрузка сообщений…</p>
                  )}

                  {messagesError && (
                    <div className={styles.errorBanner} role="alert" style={{ margin: '0 16px' }}>
                      {messagesError}
                    </div>
                  )}

                  {emptyMessages && (
                    <p className={styles.threadEmpty}>Сообщений пока нет</p>
                  )}

                  {!messagesLoading && !messagesError && messages.length > 0 && (
                    <div className={styles.messages}>
                      {messages.map((m: ChatMessage) => {
                        if (m.type === 'contract') {
                          const contractIdForApi = m.contractId.trim()
                          return (
                            <div
                              key={m.id}
                              className={`${styles.contractMsgWrap} ${m.isMine ? styles.contractMsgWrapMine : styles.contractMsgWrapOther}`}
                            >
                              <ChatContractCard
                                contract={m.contract}
                                isLandlord={isLandlordInOpenChat}
                                onOpen={() => {
                                  console.log('message', m)
                                  console.log('message.id', m.id)
                                  console.log('message.contractId', m.contractId)
                                  const requestId = m.contractId.trim()
                                  console.log('GET /api/contracts/:id — id used in request', requestId)
                                  if (!requestId) {
                                    console.warn(
                                      '[ChatsPage] contractId отсутствует — запрос не отправляется',
                                      m,
                                    )
                                    setContractViewOpen(true)
                                    setContractViewLoading(false)
                                    setContractViewError(
                                      'Не удалось открыть договор: в сообщении нет идентификатора договора (contractId).',
                                    )
                                    setContractViewData(null)
                                    return
                                  }
                                  void (async () => {
                                    setContractViewOpen(true)
                                    setContractViewLoading(true)
                                    setContractViewError(null)
                                    setContractViewData(null)
                                    try {
                                      const c = await fetchContract(requestId)
                                      setContractViewData(c)
                                      if (!c.contractText?.trim()) {
                                        setContractViewError(
                                          'Договор пустой или не был сформирован',
                                        )
                                      }
                                    } catch (e) {
                                      setContractViewError(
                                        e instanceof Error
                                          ? e.message
                                          : 'Не удалось загрузить договор',
                                      )
                                    } finally {
                                      setContractViewLoading(false)
                                    }
                                  })()
                                }}
                                onAccept={
                                  isTenantInOpenChat && contractIdForApi
                                    ? () => void runContractAction(contractIdForApi, 'accept')
                                    : undefined
                                }
                                onReject={
                                  isTenantInOpenChat && contractIdForApi
                                    ? () => void runContractAction(contractIdForApi, 'reject')
                                    : undefined
                                }
                                actionBusy={contractActionBusyId === contractIdForApi}
                              />
                              <span className={styles.msgTime}>{formatMessageTime(m.createdAt)}</span>
                            </div>
                          )
                        }
                        if (m.type === 'text') {
                          return (
                            <div
                              key={m.id}
                              className={`${styles.bubble} ${m.isMine ? styles.bubbleMine : styles.bubbleOther}`}
                            >
                              {m.body}
                              <span className={styles.msgTime}>{formatMessageTime(m.createdAt)}</span>
                            </div>
                          )
                        }
                        return null
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className={styles.composer}>
                  <textarea
                    className={styles.textarea}
                    rows={2}
                    placeholder="Написать сообщение…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    disabled={sendBusy}
                  />
                  <button
                    type="button"
                    className={styles.sendBtn}
                    onClick={handleSend}
                    disabled={sendBusy || !draft.trim()}
                  >
                    {sendBusy ? '…' : 'Отправить'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <ContractFormModal
        open={contractModalOpen}
        onClose={() => {
          setContractModalOpen(false)
          setContractDraftError(null)
          setContractFormError(null)
        }}
        value={contractFormDraft}
        onChange={(next) => {
          setContractFormDraft(next)
          setContractFormError(null)
        }}
        onSubmit={() => void handleContractSubmit()}
        busy={contractSubmitBusy}
        error={contractFormError}
      />

      <ContractViewModal
        open={contractViewOpen}
        onClose={() => {
          setContractViewOpen(false)
          setContractViewData(null)
          setContractViewError(null)
          setContractViewLoading(false)
        }}
        data={contractViewData}
        loading={contractViewLoading}
        error={contractViewError}
        tenantActions={
          contractViewData &&
          isTenantInOpenChat &&
          String(contractViewData.status).toLowerCase() === 'pending'
            ? {
                onAccept: () => void runContractAction(contractViewData.id, 'accept'),
                onReject: () => void runContractAction(contractViewData.id, 'reject'),
                busy: contractActionBusyId === contractViewData.id,
              }
            : null
        }
      />
    </div>
  )
}
