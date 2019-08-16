/* eslint-env serviceworker */
const cacheKey = process.env.CACHE_KEY
const dbName = 'blob-db'
const storeName = 'keyval'

const store = {
  db: new Promise((resolve, reject) => {
    const openreq = indexedDB.open(dbName, 1)
    openreq.onerror = () => reject(openreq.error)
    openreq.onsuccess = () => resolve(openreq.result)
    openreq.onupgradeneeded = () => {
      openreq.result.createObjectStore(storeName)
    }
  }),
  idbStore (type, callback) {
    return store.db.then(
      db =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, type)
          transaction.oncomplete = () => resolve()
          transaction.onabort = transaction.onerror = () =>
            reject(transaction.error)
          callback(transaction.objectStore(storeName))
        })
    )
  }
}

function get (key) {
  let req
  return store
    .idbStore('readonly', store => {
      req = store.get(key)
    })
    .then(() => req.result)
}

const deleteOldCaches = newCacheKey => {
  return self.caches
    .keys()
    .then(keys =>
      Promise.all(
        keys.filter(key => key !== newCacheKey).map(x => self.caches.delete(x))
      )
    )
}

const assertCache = () => {
  return Promise.all([cacheKey, deleteOldCaches(cacheKey)]).catch({})
}

self.addEventListener('install', event => {
  event.waitUntil(assertCache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', event =>
  event.waitUntil(self.clients.claim())
)

const parseQuery = search => {
  const query = {}
  for (const [key, value] of [
    ...(search.match(/[?&]([^?&]+)=([^&]+)/g) || [])
  ].map(x => x.slice(1).split(/=/))) {
    query[key] = value
  }
  return query
}

const parseRange = value =>
  Number(((value || '').match(/^bytes=(\d+)/) || [])[1]) || 0

self.addEventListener('fetch', event => {
  const url = new self.URL(event.request.url)

  if (event.request.method === 'GET' && url.pathname.startsWith('/stream')) {
    const { totalSize, fixedSize, prefix } = parseQuery(url.search)
    const range = parseRange(
      event.request.headers.get('range') ||
        event.request.headers.get('if-range')
    )
    const offset = Math.floor(range / fixedSize)
    event.respondWith(
      get(prefix + offset)
        .catch(_ => null)
        .then(chunk => {
          if (!chunk) {
            return new Response(null, {
              status: 404
            })
          }
          return new Response(chunk, {
            status: 206,
            headers: [
              ['Accept-Ranges', 'bytes'],
              ['Content-Range', `bytes ${range}-${totalSize - 1}/${totalSize}`],
              ['Content-Length', chunk.size],
              ['Content-Type', chunk.type]
            ]
          })
        })
    )
  } else {
    if (self.location.hostname === 'localhost' && !process.env.CACHE_LOCAL) return
    const cacheAsset = () => {
      console.warn(`no cache hit for ${url.pathname}`)
      const options = { cache: 'no-cache' }
      return self.caches
        .open(cacheKey)
        .then(cache => Promise.all([cache, self.fetch(event.request, options)]))
        .then(([cache, res]) =>
          Promise.all([
            res,
            res.status < 300 && cache.put(event.request, res.clone()).catch({})
          ])
        )
        .then(([res, _]) => res)
    }

    const passthrough = () => {
      return self.fetch(event.request)
    }

    const nohit = () => {
      return cacheAsset().catch(err => {
        console.warn(`error caching ${url.pathname}`, err)
        return passthrough()
      })
    }

    event.respondWith(
      self.caches
        .open(cacheKey)
        .then(cache => Promise.all([cache, cache.match(event.request.url)]))
        .then(([cache, response]) => {
          if (response) return response
        })
        .then(response => {
          if (response) return response
          return nohit()
        })
    )
  }
})
