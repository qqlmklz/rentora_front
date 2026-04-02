import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { getApiBase, getAuthHeaders, getProfileUrl } from '../services/api'
import {
  mapPropertyApiToForm,
  parseAndNormalizePhotosFromPayload,
  extractPropertyPhotoPayload,
  normalizePhotoPathForStorage,
  resolvePhotoUrlForForm,
} from '../utils/propertyFormMap'
import styles from './NewPropertyPage.module.css'

type RentType = '' | 'long' | 'daily'
type Category = '' | 'residential' | 'commercial'

type ResidentialSubcategory = '' | 'apartment' | 'room' | 'house' | 'cottage'
type CommercialSubcategory = '' | 'office' | 'coworking' | 'building' | 'warehouse'

type FormState = {
  title: string
  rentType: RentType
  category: Category
  subcategory: ResidentialSubcategory | CommercialSubcategory

  address: string
  city: string
  district: string
  metro: string
  apartmentNumber: string

  rooms: string
  totalArea: string
  livingArea: string
  kitchenArea: string
  floor: string
  floorsTotal: string
  residentialType: '' | 'flat' | 'apartments'
  price: string
  utilitiesIncluded: '' | 'included' | 'not_included'
  utilitiesPrice: string
  deposit: string
  commission: '' | '25' | '50' | '75' | '100'
  prepayment: '' | '0' | '1' | '2'
  allowChildren: boolean
  allowPets: boolean
}

const initialState: FormState = {
  title: '',
  rentType: '',
  category: '',
  subcategory: '',

  address: '',
  city: '',
  district: '',
  metro: '',
  apartmentNumber: '',

  rooms: '',
  totalArea: '',
  livingArea: '',
  kitchenArea: '',
  floor: '',
  floorsTotal: '',
  residentialType: '',
  price: '',
  utilitiesIncluded: '',
  utilitiesPrice: '',
  deposit: '',
  commission: '',
  prepayment: '',
  allowChildren: false,
  allowPets: false,
}

const RESIDENTIAL_SUBCATEGORIES = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'room', label: 'Комната' },
  { value: 'house', label: 'Дом / дача' },
  { value: 'cottage', label: 'Коттедж' },
] as const

const COMMERCIAL_SUBCATEGORIES = [
  { value: 'office', label: 'Офис' },
  { value: 'coworking', label: 'Коворкинг' },
  { value: 'building', label: 'Здание' },
  { value: 'warehouse', label: 'Склад' },
] as const

const ROOMS_OPTIONS = [
  { value: 'studio', label: 'Студия' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6+', label: '6+' },
] as const

/** Поля PATCH /api/properties/:id (как в ТЗ) */
const PATCH_FORM_KEYS: (keyof FormState)[] = [
  'title',
  'rentType',
  'category',
  'subcategory',
  'address',
  'city',
  'district',
  'metro',
  'apartmentNumber',
  'rooms',
  'totalArea',
  'livingArea',
  'kitchenArea',
  'floor',
  'floorsTotal',
  'residentialType',
  'price',
  'utilitiesIncluded',
  'utilitiesPrice',
  'deposit',
  'commission',
  'prepayment',
  'allowChildren',
  'allowPets',
]

/** Объект с полем photos из ответа PATCH или GET */
function extractPhotosContainer(raw: unknown): Record<string, unknown> | null {
  return (
    extractPropertyPhotoPayload(raw) ??
    (raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as Record<string, unknown>).photos)
      ? (raw as Record<string, unknown>)
      : null)
  )
}

function appendPatchFormData(fd: FormData, form: FormState) {
  PATCH_FORM_KEYS.forEach((key) => {
    const value = form[key]
    if (typeof value === 'boolean') {
      fd.append(key, value ? 'true' : 'false')
    } else if (value !== '' && value !== null && value !== undefined) {
      fd.append(key, String(value))
    }
  })
  if (form.subcategory) {
    fd.append('propertyType', form.subcategory)
  }
}

export function NewPropertyPage() {
  const navigate = useNavigate()
  const matchEdit = useMatch('/properties/:id/edit')
  const editId = matchEdit?.params.id
  const isEdit = Boolean(editId)

  const [form, setForm] = useState<FormState>(initialState)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  /** Новые файлы (только что выбранные пользователем) */
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([])
  /** Пути сохранённых на бэке фото (оставшиеся после удаления из UI) — уходит в PATCH existingPhotos */
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [propertyLoading, setPropertyLoading] = useState(isEdit)
  const [propertyLoadError, setPropertyLoadError] = useState<string | null>(null)
  const [loadForbidden, setLoadForbidden] = useState(false)

  useEffect(() => {
    return () => {
      newPhotoPreviews.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [newPhotoPreviews])

  useEffect(() => {
    if (!isEdit || !editId) return
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true })
      return
    }
    let cancelled = false
    setPropertyLoading(true)
    setPropertyLoadError(null)
    setLoadForbidden(false)
    const url = getProfileUrl(`/api/properties/${encodeURIComponent(editId)}`)
    fetch(url, { headers: getAuthHeaders() })
      .then(async (res) => {
        if (res.status === 401) {
          navigate('/', { replace: true })
          return null
        }
        if (res.status === 403) {
          return { kind: 'forbidden' as const }
        }
        if (res.status === 404) {
          return { kind: 'not_found' as const }
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Ошибка загрузки: ${res.status}`)
        }
        const data = (await res.json()) as Record<string, unknown>
        return { kind: 'ok' as const, data }
      })
      .then((result) => {
        if (cancelled || result === null) return
        if (result.kind === 'forbidden') {
          setLoadForbidden(true)
          setPropertyLoadError('Нет доступа к редактированию этого объявления.')
          return
        }
        if (result.kind === 'not_found') {
          setPropertyLoadError('Объявление не найдено.')
          return
        }
        setForm(mapPropertyApiToForm(result.data) as FormState)
        const loaded = parseAndNormalizePhotosFromPayload(result.data)
        setExistingPhotos(loaded)
      })
      .catch((e) => {
        if (!cancelled) setPropertyLoadError(e instanceof Error ? e.message : 'Не удалось загрузить объявление')
      })
      .finally(() => {
        if (!cancelled) setPropertyLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEdit, editId, navigate])

  const subcategoryOptions = useMemo(() => {
    if (form.category === 'residential') return RESIDENTIAL_SUBCATEGORIES
    if (form.category === 'commercial') return COMMERCIAL_SUBCATEGORIES
    return []
  }, [form.category])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Введите название объявления'
    if (!form.rentType) e.rentType = 'Выберите тип аренды'
    if (!form.category) e.category = 'Выберите категорию недвижимости'
    if (!form.subcategory) e.subcategory = 'Выберите подкатегорию'
    if (!form.address.trim()) e.address = 'Введите адрес'
    if (!form.city.trim()) e.city = 'Введите город'
    if (!form.district.trim()) e.district = 'Введите район'
    if (!form.price.trim()) e.price = 'Укажите цену'
    if (!form.utilitiesIncluded) e.utilitiesIncluded = 'Укажите, включена ли оплата ЖКХ'
    if (form.utilitiesIncluded === 'not_included' && !form.utilitiesPrice.trim()) {
      e.utilitiesPrice = 'Укажите стоимость ЖКХ'
    }
    const totalPhotos = newPhotos.length + (isEdit ? existingPhotos.length : 0)
    if (totalPhotos < 5) {
      e.photos = isEdit
        ? 'Должно быть не менее 5 фото (включая уже загруженные). Добавьте новые фото.'
        : 'Загрузите минимум 5 фото'
    }
    return e
  }, [form, newPhotos.length, isEdit, existingPhotos.length])

  const canSubmit = Object.keys(errors).length === 0

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      if (key === 'category') {
        // При смене категории сбрасываем подкатегорию и несоответствующие поля
        const next: FormState = { ...prev, category: value as Category, subcategory: '' }
        if (value === 'commercial') {
          next.rooms = ''
          next.residentialType = ''
        }
        return next
      }
      return { ...prev, [key]: value }
    })
  }

  const showError = (key: string) => touched[key] && !!errors[key]

  const handlePickFiles = () => fileRef.current?.click()

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? [])
    if (!list.length) return

    const nextFiles = [...newPhotos, ...list]
    const nextPreviews = [...newPhotoPreviews, ...list.map((f) => URL.createObjectURL(f))]
    setNewPhotos(nextFiles)
    setNewPhotoPreviews(nextPreviews)
    e.target.value = ''
  }

  const removeExistingPhoto = (pathToRemove: string) => {
    const normalized = normalizePhotoPathForStorage(pathToRemove)
    setExistingPhotos((prev) => prev.filter((p) => normalizePhotoPathForStorage(p) !== normalized))
  }

  const removeNewPhoto = (index: number) => {
    setNewPhotoPreviews((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
    setNewPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched((prev) => ({
      ...prev,
      title: true,
      rentType: true,
      category: true,
      subcategory: true,
      address: true,
      city: true,
      district: true,
      price: true,
      utilitiesIncluded: true,
      utilitiesPrice: true,
      photos: true,
    }))
    if (!canSubmit) return

    setSubmitError(null)
    setSubmitSuccess(null)
    setSubmitLoading(true)

    const base = getApiBase()
    const url = isEdit && editId
      ? getProfileUrl(`/api/properties/${encodeURIComponent(editId)}`)
      : base
        ? `${base}/api/properties`
        : '/api/properties'
    const token = localStorage.getItem('token')

    const formData = new FormData()

    if (isEdit && editId) {
      appendPatchFormData(formData, form)
      const existingPhotosToKeep = existingPhotos.map((p) => normalizePhotoPathForStorage(p))

      console.log('[PATCH property photos]', {
        existingPhotos: existingPhotosToKeep,
        newPhotosCount: newPhotos.length,
        propertyId: editId,
      })

      formData.append('existingPhotos', JSON.stringify(existingPhotosToKeep))
      newPhotos.forEach((file, index) => {
        formData.append('photos', file, file.name || `photo-${index + 1}.jpg`)
      })
    } else {
      Object.entries(form).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false')
        } else if (value !== '') {
          formData.append(key, value as string)
        }
      })

      newPhotos.forEach((file, index) => {
        formData.append('photos', file, file.name || `photo-${index + 1}.jpg`)
      })
    }

    fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
      .then(async (res) => {
        if (res.status === 403) {
          throw new Error('Нет прав на редактирование этого объявления.')
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(
            text || (isEdit ? `Ошибка сохранения: ${res.status}` : `Ошибка создания объявления: ${res.status}`),
          )
        }
        return res.json().catch(() => null)
      })
      .then(async (data) => {
        if (isEdit && editId) {
          const previewsToRevoke = [...newPhotoPreviews]
          let raw: unknown = data
          let photoPayload = extractPhotosContainer(raw)
          if (!photoPayload) {
            const r = await fetch(
              getProfileUrl(`/api/properties/${encodeURIComponent(editId)}`),
              { headers: getAuthHeaders() },
            )
            if (r.ok) {
              raw = await r.json()
              photoPayload = extractPhotosContainer(raw)
            }
          }
          if (photoPayload) {
            const next = parseAndNormalizePhotosFromPayload(photoPayload)
            setExistingPhotos(next)
          }
          previewsToRevoke.forEach((u) => URL.revokeObjectURL(u))
          setNewPhotos([])
          setNewPhotoPreviews([])
          setSubmitSuccess('Объявление успешно сохранено.')
          navigate(`/properties/${encodeURIComponent(editId)}`, {
            state: { flashSuccess: 'Объявление успешно сохранено' },
          })
          return
        }
        setSubmitSuccess('Объявление успешно отправлено на модерацию.')
        setForm(initialState)
        setTouched({})
        setNewPhotos([])
        newPhotoPreviews.forEach((u) => URL.revokeObjectURL(u))
        setNewPhotoPreviews([])

        const id = data?.id ?? data?._id
        if (id) {
          navigate(`/properties/${encodeURIComponent(String(id))}`)
        } else {
          navigate('/profile')
        }
      })
      .catch((err) => {
        setSubmitError(
          err instanceof Error ? err.message : isEdit ? 'Не удалось сохранить объявление' : 'Не удалось создать объявление',
        )
      })
      .finally(() => {
        setSubmitLoading(false)
      })
  }

  if (isEdit && propertyLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.inner}>
          <p className={styles.pageLoading}>Загрузка объявления…</p>
        </div>
      </div>
    )
  }

  if (isEdit && propertyLoadError) {
    return (
      <div className={styles.root}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Редактирование</h1>
          <p className={styles.pageError}>{propertyLoadError}</p>
          <div className={styles.errorActions}>
            {loadForbidden ? (
              <Link to="/profile/properties" className={styles.errorLink}>
                Перейти в «Мои объекты»
              </Link>
            ) : (
              <Link to="/catalog" className={styles.errorLink}>
                В каталог
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{isEdit ? 'Редактирование объявления' : 'Новое объявление'}</h1>

        <form onSubmit={handleSubmit}>
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Основная информация</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="title">
                  Название объявления
                </label>
                <input
                  id="title"
                  className={styles.input}
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  placeholder="Например, Уютная квартира в центре"
                />
                {showError('title') && <p className={styles.error}>{errors.title}</p>}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Тип объявления</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="rentType">
                  Тип аренды
                </label>
                <select
                  id="rentType"
                  className={styles.select}
                  value={form.rentType}
                  onChange={(e) => setField('rentType', e.target.value as RentType)}
                  onBlur={() => setTouched((t) => ({ ...t, rentType: true }))}
                >
                  <option value="">—</option>
                  <option value="long">Долгосрочная</option>
                  <option value="daily">Посуточная</option>
                </select>
                {showError('rentType') && <p className={styles.error}>{errors.rentType}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="category">
                  Категория недвижимости
                </label>
                <select
                  id="category"
                  className={styles.select}
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value as Category)}
                  onBlur={() => setTouched((t) => ({ ...t, category: true }))}
                >
                  <option value="">—</option>
                  <option value="residential">Жилая недвижимость</option>
                  <option value="commercial">Коммерческая</option>
                </select>
                {showError('category') && <p className={styles.error}>{errors.category}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="subcategory">
                  Подкатегория
                </label>
                <select
                  id="subcategory"
                  className={styles.select}
                  value={form.subcategory}
                  onChange={(e) => setField('subcategory', e.target.value as FormState['subcategory'])}
                  onBlur={() => setTouched((t) => ({ ...t, subcategory: true }))}
                  disabled={!form.category}
                >
                  <option value="">—</option>
                  {subcategoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {showError('subcategory') && <p className={styles.error}>{errors.subcategory}</p>}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Адрес</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="address">
                  Введите адрес
                </label>
                <input
                  id="address"
                  className={styles.input}
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                  placeholder="Например, ул. Тверская, 1"
                />
                {showError('address') && <p className={styles.error}>{errors.address}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="city">
                  Город
                </label>
                <input
                  id="city"
                  className={styles.input}
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                  placeholder="Например, Москва"
                />
                {showError('city') && <p className={styles.error}>{errors.city}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="district">
                  Район
                </label>
                <input
                  id="district"
                  className={styles.input}
                  value={form.district}
                  onChange={(e) => setField('district', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, district: true }))}
                  placeholder="Например, Тверской"
                />
                {showError('district') && <p className={styles.error}>{errors.district}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="metro">
                  Основная станция метро
                </label>
                <input
                  id="metro"
                  className={styles.input}
                  value={form.metro}
                  onChange={(e) => setField('metro', e.target.value)}
                  placeholder="Например, Охотный ряд"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="apartmentNumber">
                  Номер квартиры
                </label>
                <input
                  id="apartmentNumber"
                  className={styles.input}
                  value={form.apartmentNumber}
                  onChange={(e) => setField('apartmentNumber', e.target.value)}
                  placeholder="Например, 12"
                />
                <p className={styles.help}>Номер квартиры не будет показываться в публичном объявлении.</p>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Параметры квартиры</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="rooms">
                  Количество комнат
                </label>
                <select
                  id="rooms"
                  className={styles.select}
                  value={form.rooms}
                  onChange={(e) => setField('rooms', e.target.value)}
                  disabled={form.category === 'commercial'}
                >
                  <option value="">—</option>
                  {ROOMS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="totalArea">
                  Общая площадь, м²
                </label>
                <input
                  id="totalArea"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={form.totalArea}
                  onChange={(e) => setField('totalArea', e.target.value)}
                  placeholder="Например, 45"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="livingArea">
                  Жилая площадь, м²
                </label>
                <input
                  id="livingArea"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={form.livingArea}
                  onChange={(e) => setField('livingArea', e.target.value)}
                  placeholder="Например, 28"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="kitchenArea">
                  Кухня, м²
                </label>
                <input
                  id="kitchenArea"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={form.kitchenArea}
                  onChange={(e) => setField('kitchenArea', e.target.value)}
                  placeholder="Например, 10"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="floor">
                  Этаж
                </label>
                <input
                  id="floor"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={form.floor}
                  onChange={(e) => setField('floor', e.target.value)}
                  placeholder="Например, 7"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="floorsTotal">
                  Этажей в доме
                </label>
                <input
                  id="floorsTotal"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={form.floorsTotal}
                  onChange={(e) => setField('floorsTotal', e.target.value)}
                  placeholder="Например, 16"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="residentialType">
                  Тип недвижимости
                </label>
                <select
                  id="residentialType"
                  className={styles.select}
                  value={form.residentialType}
                  onChange={(e) => setField('residentialType', e.target.value as FormState['residentialType'])}
                  disabled={form.category === 'commercial'}
                >
                  <option value="">—</option>
                  <option value="flat">Квартира</option>
                  <option value="apartments">Апартаменты</option>
                </select>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Финансовые условия</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="price">
                  Цена
                </label>
                <input
                  id="price"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, price: true }))}
                  placeholder="Например, 65 000"
                />
                {showError('price') && <p className={styles.error}>{errors.price}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="utilitiesIncluded">
                  Оплата ЖКХ
                </label>
                <select
                  id="utilitiesIncluded"
                  className={styles.select}
                  value={form.utilitiesIncluded}
                  onChange={(e) => setField('utilitiesIncluded', e.target.value as FormState['utilitiesIncluded'])}
                  onBlur={() => setTouched((t) => ({ ...t, utilitiesIncluded: true }))}
                >
                  <option value="">—</option>
                  <option value="included">Включена (без счетчиков)</option>
                  <option value="not_included">Не включена</option>
                </select>
                {showError('utilitiesIncluded') && <p className={styles.error}>{errors.utilitiesIncluded}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="utilitiesPrice">
                  Цена ЖКХ
                </label>
                <input
                  id="utilitiesPrice"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={form.utilitiesPrice}
                  onChange={(e) => setField('utilitiesPrice', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, utilitiesPrice: true }))}
                  placeholder="Например, 5 000"
                  disabled={form.utilitiesIncluded === 'included' || !form.utilitiesIncluded}
                />
                {showError('utilitiesPrice') && <p className={styles.error}>{errors.utilitiesPrice}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="deposit">
                  Залог
                </label>
                <input
                  id="deposit"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={form.deposit}
                  onChange={(e) => setField('deposit', e.target.value)}
                  placeholder="Например, 65 000"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="commission">
                  Комиссия
                </label>
                <select
                  id="commission"
                  className={styles.select}
                  value={form.commission}
                  onChange={(e) => setField('commission', e.target.value as FormState['commission'])}
                >
                  <option value="">—</option>
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="prepayment">
                  Предоплата
                </label>
                <select
                  id="prepayment"
                  className={styles.select}
                  value={form.prepayment}
                  onChange={(e) => setField('prepayment', e.target.value as FormState['prepayment'])}
                >
                  <option value="">—</option>
                  <option value="0">Нет</option>
                  <option value="1">1 месяц</option>
                  <option value="2">2 месяца</option>
                </select>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Условия проживания</span>
                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.allowChildren}
                      onChange={(e) => setField('allowChildren', e.target.checked)}
                    />
                    <span>Можно с детьми</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.allowPets}
                      onChange={(e) => setField('allowPets', e.target.checked)}
                    />
                    <span>Можно с животными</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Фото и планировка</h2>

            <div className={styles.photosBox}>
              {isEdit && existingPhotos.length > 0 && (
                <div className={styles.existingPhotos} aria-label="Текущие фото">
                  <p className={styles.existingPhotosLabel}>Текущие фото ({existingPhotos.length})</p>
                  <div className={styles.previews}>
                    {existingPhotos.map((path, idx) => (
                      <div key={`${path}-${idx}`} className={styles.preview}>
                        <img
                          src={resolvePhotoUrlForForm(path)}
                          alt=""
                          className={styles.previewImg}
                        />
                        <button
                          type="button"
                          className={styles.previewRemove}
                          aria-label="Удалить фото"
                          onClick={() => removeExistingPhoto(path)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.photosTop}>
                <p className={styles.photosCount}>
                  Новых файлов: {newPhotos.length}
                  {isEdit && existingPhotos.length > 0 && (
                    <span className={styles.photosCountHint}>
                      {' '}
                      · всего: {existingPhotos.length + newPhotos.length}
                    </span>
                  )}
                </p>
                <button type="button" className={styles.fileButton} onClick={handlePickFiles}>
                  Выберите файл
                </button>
                <input
                  ref={fileRef}
                  className={styles.fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesChange}
                />
              </div>

              <p className={styles.rules}>
                На фото не должно быть людей, животных, алкоголя, табака, оружия.
                Не добавляйте чужие фото, картинки с водяными знаками и рекламу.
              </p>

              {newPhotoPreviews.length > 0 && (
                <div className={styles.previews} aria-label="Превью загруженных фото">
                  {newPhotoPreviews.map((src, idx) => (
                    <div key={src + idx} className={styles.preview}>
                      <img src={src} alt="" className={styles.previewImg} />
                      <button
                        type="button"
                        className={styles.previewRemove}
                        aria-label="Убрать из загрузки"
                        onClick={() => removeNewPhoto(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {touched.photos && errors.photos && <p className={styles.error}>{errors.photos}</p>}
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Публикация</h2>
            <div className={styles.actions}>
              <button type="submit" className={styles.submit} disabled={!canSubmit || submitLoading}>
                {submitLoading ? (isEdit ? 'Сохранение…' : 'Отправка…') : isEdit ? 'Сохранить' : 'Опубликовать'}
              </button>
            </div>
            {!canSubmit && (
              <p className={styles.help}>
                {isEdit
                  ? 'Заполните обязательные поля. Всего должно быть не менее 5 фото (уже загруженные и новые).'
                  : 'Заполните обязательные поля и загрузите минимум 5 фото, чтобы отправить форму.'}
              </p>
            )}
            {submitSuccess && <p className={styles.help}>{submitSuccess}</p>}
            {submitError && <p className={styles.error}>{submitError}</p>}
          </section>
        </form>
      </div>
    </div>
  )
}

