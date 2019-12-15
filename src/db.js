/* global indexedDB */
export function store (dbName) {
  const storeName = 'keyval'
  const openDB = new Promise((resolve, reject) => {
    const openreq = indexedDB.open(dbName, 1)
    openreq.onerror = () => reject(openreq.error)
    openreq.onsuccess = () => resolve(openreq.result)
    openreq.onupgradeneeded = () => {
      openreq.result.createObjectStore(storeName)
    }
  })
  return async (type, callback) => {
    const db = await openDB
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, type)
      transaction.oncomplete = resolve
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error)
      callback(transaction.objectStore(storeName), reject)
    })
  }
}

export async function get (store, key) {
  try {
    let req
    await store('readonly', store => {
      req = store.get(key)
    })
    return req.result
  } catch (_) {
    return null
  }
}

export async function set (store, key, value) {
  await store('readwrite', store => store.put(value, key))
}

export async function del (store, key) {
  await store('readwrite', store => {
    store.delete(key)
  })
}

export async function cursor (store, direction, next) {
  let cursor
  await store('readonly', (store, reject) => {
    cursor = store.openCursor(null, direction)
    cursor.onsuccess = next
    cursor.onerror = reject
  })
}
