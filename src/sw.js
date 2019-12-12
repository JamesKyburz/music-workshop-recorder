/* eslint-env serviceworker */
const { CACHE_KEY } = process.env

const createStore = dbName => {
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
      callback(transaction.objectStore(storeName))
    })
  }
}

const stores = {
  blob: createStore('blob-db'),
  meta: createStore('meta-db')
}

async function get (store, key) {
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

async function set (store, key, value) {
  await store('readwrite', store => store.put(value, key))
}

async function cursor (store, next) {
  let cursor
  await store('readonly', store => {
    cursor = store.openCursor()
    cursor.onsuccess = next
  })
}

async function dump () {
  const stream = new self.ReadableStream({
    async start (controller) {
      const headerSize = new self.TextEncoder().encode(
        JSON.stringify({
          next: {
            size: '0'.padStart(5, '0'),
            key: '0'.padStart(15, '0'),
            type: 'X'
          }
        }).length.toString(32)
      )
      controller.enqueue(headerSize)
      await cursor(stores.meta, event => {
        const cursor = event.target.result
        if (cursor) {
          const value = new self.TextEncoder().encode(
            JSON.stringify(cursor.value)
          )
          const header = new self.TextEncoder().encode(
            JSON.stringify({
              next: {
                size: value.byteLength.toString(32).padStart(5, '0'),
                key: cursor.key.padStart(15, '0'),
                type: 'M'
              }
            })
          )
          controller.enqueue(header)
          controller.enqueue(value)
          cursor.continue()
        }
      })
      const pending = []
      let more = true
      cursor(stores.blob, event => {
        const cursor = event.target.result
        if (cursor) {
          pending.push({ key: cursor.key, value: cursor.value.slice() })
          cursor.continue()
        } else {
          more = false
        }
      }).catch(console.error)
      // eslint-disable-next-line
      while (more) {
        for (const cursor of pending) {
          const value = new Uint8Array(await cursor.value.arrayBuffer())
          const header = new self.TextEncoder().encode(
            JSON.stringify({
              next: {
                size: value.byteLength.toString(32).padStart(5, '0'),
                key: cursor.key.padStart(15, '0'),
                type: 'B'
              }
            })
          )
          controller.enqueue(header)
          controller.enqueue(value)
        }
        await new Promise((resolve, reject) => setTimeout(resolve, 100))
      }
      controller.close()
    }
  })
  return new self.Response(stream, {
    headers: [
      [
        'Content-Disposition',
        `attachment; filename=db-${new Date().toISOString().slice(0, 10)}.mwr`
      ]
    ]
  })
}

self.addEventListener('install', event => {
  event.waitUntil(install())
  async function install () {
    const keys = await self.caches.keys()
    for (const key of keys) {
      if (key !== CACHE_KEY) {
        await self.caches.delete(key)
      }
    }
    await self.skipWaiting()
  }
})

self.addEventListener('activate', event =>
  event.waitUntil(self.clients.claim())
)

const parseRange = value =>
  Number(((value || '').match(/^bytes=(\d+)/) || [])[1]) || 0

self.addEventListener('fetch', async event => {
  const { pathname } = new self.URL(event.request.url)
  if (event.request.method === 'GET' && pathname.startsWith('/download/')) {
    return event.respondWith(download(event.request))
  }
  if (event.request.method === 'GET' && pathname.startsWith('/stream/')) {
    return event.respondWith(stream(event.request))
  }
  if (event.request.method === 'PUT' && pathname === '/upload') {
    return event.respondWith(upload(event.request))
  }
  if (event.request.method === 'GET' && pathname === '/dump') {
    return event.respondWith(dump())
  }
  if (self.location.hostname === 'localhost' && !process.env.CACHE_LOCAL) {
    return
  }
  event.respondWith(cacheResponse(event.request))
})

async function download (request) {
  const prefix = requestPrefix(request)

  const meta = await get(stores.meta, prefix.slice(0, -1))

  if (!meta) return new self.Response(null, { status: 404 })

  const { duration, mimeType, totalSize, title } = meta
  const stream = new self.ReadableStream({
    start (controller) {
      const next = async offset => {
        try {
          const chunk = await get(stores.blob, prefix + offset)
          if (!chunk) {
            controller.close()
          } else {
            controller.enqueue(new Uint8Array(await chunk.arrayBuffer()))
            next(offset + 1)
          }
        } catch (err) {
          console.error('download failed for %s/%s', prefix, offset)
          controller.close()
        }
      }
      next(0)
    }
  })
  return new self.Response(stream, {
    headers: [
      ['Content-Length', totalSize],
      ['Content-Type', mimeType],
      [
        'Content-Disposition',
        `attachment; filename=${prefix.slice(0, -1)}_${durationToMs(
          duration
        )}_${title.replace(/_/, '')}_${mimeType.replace('/', ' ')}.${fileType(
          mimeType
        )}`
      ]
    ]
  })
}

async function stream (request) {
  const prefix = requestPrefix(request)

  const range = parseRange(
    request.headers.get('range') || request.headers.get('if-range')
  )
  const meta = await get(stores.meta, prefix.slice(0, -1))

  if (!meta) return new self.Response(null, { status: 404 })

  const { mimeType, totalSize, fixedSize } = meta
  const offset = Math.floor(range / fixedSize)
  const chunk = await get(stores.blob, prefix + offset)

  if (chunk) {
    return new self.Response(chunk, {
      status: 206,
      headers: [
        ['Accept-Ranges', 'bytes'],
        ['Content-Range', `bytes ${range}-${totalSize - 1}/${totalSize}`],
        ['Content-Length', chunk.size],
        ['Content-Type', mimeType]
      ]
    })
  } else {
    const all = await get(stores.blob, prefix.slice(0, -1))
    if (!all) {
      return new self.Response(null, {
        status: 404
      })
    }
    return new self.Response(all, {
      headers: [['Content-Length', all.size], ['Content-Type', mimeType]]
    })
  }
}

async function cacheResponse (request) {
  const cache = await self.caches.open(CACHE_KEY)
  const res = await cache.match(request.url)
  if (res) return res

  return nohit(cache)

  async function nohit (cache) {
    try {
      await cacheAsset(cache)
    } catch (err) {
      console.warn(`error caching ${request.url}`, err)
      return self.fetch(request)
    }
  }

  async function cacheAsset (cache) {
    console.warn(`no cache hit for ${request.url}`)
    const res = await self.fetch(request, { cache: 'no-cache' })
    if (res.status < 300) {
      try {
        await cache.put(request, res.clone())
      } catch (err) {
        console.warn(`failed to cache ${request.url}`, err)
      }
    }
    return res
  }
}

async function upload (request) {
  try {
    const formData = await request.formData()
    for (const file of formData.values()) {
      const { name, size } = file
      if (/.mwr$/i.test(name)) {
        await uploadFromDbFile(file)
        continue
      }
      const [prefix, ms, title = '', type = ''] = name
        .replace(/\..*$/, '')
        .split('_')
      const mimeType = type.replace(/ /, '/') || file.type
      const duration = ms ? msToTime(ms) : '\xa0'
      const fixedSize = 100000
      const key = name.includes('_') ? prefix : Date.now().toString(32)
      await set(stores.meta, key, {
        duration,
        fixedSize,
        mimeType,
        totalSize: size,
        title: name.includes('_') ? title : prefix
      })
      let range = 0
      let offset = 0
      while (offset < size) {
        await set(
          stores.blob,
          `${key}-${range}`,
          file.slice(offset, offset + fixedSize)
        )
        offset += fixedSize
        range++
      }
    }
    return new self.Response()
  } catch (err) {
    return new self.Response(err.toString(), { status: 500 })
  }
}

async function uploadFromDbFile (file) {
  const headerSize = parseInt(await file.slice(0, 2).text(), 32)
  let offset = 2

  while (true) {
    const headerData = file.slice(offset, offset + headerSize)
    if (headerData.size === 0) break
    const {
      next: { size, type, key }
    } = JSON.parse(await headerData.text())
    offset += headerSize
    const trackSize = parseInt(size, 32)
    const trackData = file.slice(offset, offset + trackSize)
    const trackValue =
      type === 'M' ? JSON.parse(await trackData.text()) : trackData
    offset += trackSize
    await set(
      type === 'M' ? stores.meta : stores.blob,
      key.replace(/^0+/, ''),
      trackValue
    )
  }
}

function requestPrefix (request) {
  return decodeURIComponent(request.url.split('/').slice(-1)[0])
}

function durationToMs (duration) {
  const parts = duration.split(':')
  return (
    (parts.pop() || 0) * 1000 +
    (parts.pop() || 0) * 60000 +
    (parts.pop() || 0) * 3600000
  )
}

function msToTime (ms) {
  const twoDigits = s =>
    Math.floor(s)
      .toString()
      .padStart(2, '0')
  const seconds = twoDigits((ms / 1000) % 60)
  const minutes = twoDigits((ms / 60000) % 60)
  const hours = twoDigits((ms / 3600000) % 24)
  return `${hours}:${minutes}:${seconds}`.replace(/^00:/, '')
}

function fileType (mimeType) {
  return mimeType.split('/').slice(-1)[0]
}
