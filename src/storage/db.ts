import type { AppSettings, MealEntry, UserProfile } from '../domain/types'

const DB_NAME = 'eight-constitution-diary'
const DB_VERSION = 1

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('meals')) {
        const store = db.createObjectStore('meals', { keyPath: 'id' })
        store.createIndex('profileId', 'profileId')
      }
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllProfiles() {
  const db = await openDatabase()
  return requestResult<UserProfile[]>(db.transaction('profiles').objectStore('profiles').getAll())
}

export async function saveProfile(profile: UserProfile) {
  const db = await openDatabase()
  await requestResult(db.transaction('profiles', 'readwrite').objectStore('profiles').put(profile))
}

export async function deleteProfile(profileId: string) {
  const db = await openDatabase()
  const meals = await requestResult<MealEntry[]>(db.transaction('meals').objectStore('meals').index('profileId').getAll(profileId))
  const transaction = db.transaction(['profiles', 'meals', 'photos'], 'readwrite')
  transaction.objectStore('profiles').delete(profileId)
  for (const meal of meals) {
    transaction.objectStore('meals').delete(meal.id)
    if (meal.photoId) transaction.objectStore('photos').delete(meal.photoId)
  }
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getSettings() {
  const db = await openDatabase()
  return requestResult<(AppSettings & { id: 'app' }) | undefined>(db.transaction('settings').objectStore('settings').get('app'))
}

export async function saveSettings(settings: AppSettings) {
  const db = await openDatabase()
  await requestResult(db.transaction('settings', 'readwrite').objectStore('settings').put({ id: 'app', ...settings }))
}

export async function getAllMeals() {
  const db = await openDatabase()
  return requestResult<MealEntry[]>(db.transaction('meals').objectStore('meals').getAll())
}

export async function saveMeal(meal: MealEntry, photo?: Blob) {
  const db = await openDatabase()
  const transaction = db.transaction(['meals', 'photos'], 'readwrite')
  transaction.objectStore('meals').put(meal)
  if (meal.photoId && photo) transaction.objectStore('photos').put({ id: meal.photoId, blob: photo })
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getPhoto(photoId?: string) {
  if (!photoId) return undefined
  const db = await openDatabase()
  const result = await requestResult<{ id: string; blob: Blob } | undefined>(db.transaction('photos').objectStore('photos').get(photoId))
  return result?.blob
}

export async function deleteMeal(meal: MealEntry) {
  const db = await openDatabase()
  const transaction = db.transaction(['meals', 'photos'], 'readwrite')
  transaction.objectStore('meals').delete(meal.id)
  if (meal.photoId) transaction.objectStore('photos').delete(meal.photoId)
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
