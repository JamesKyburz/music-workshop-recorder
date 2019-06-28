/* eslint-env serviceworker */
const cacheKey = '2'

const deleteOldCaches = newCacheKey => {
  return self.caches
    .keys()
    .then(keys =>
      Promise.all(
        keys.filter(key => key !== newCacheKey).map(x => self.caches.delete(x))
      )
    )
}

const notifyRefreshOnKeyChange = newCacheKey => {
  return self.caches.keys().then(keys => {
    if (keys.filter(key => key !== newCacheKey).length) {
      self.postMessage({ action: 'refresh' })
    }
  })
}

const assertCache = () => {
  return Promise.all([
    cacheKey,
    deleteOldCaches(cacheKey),
    notifyRefreshOnKeyChange(cacheKey)
  ]).catch({})
}

self.addEventListener('install', event => {
  event.waitUntil(assertCache().then(() => self.skipWaiting()))
})

self.addEventListener('fetch', event => {
  const url = new self.URL(event.request.url)

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
})
