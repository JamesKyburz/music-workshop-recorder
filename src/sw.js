/* eslint-env serviceworker */
import { store, get, set, del, cursor } from './db.js'
import { msToTime, durationToMs } from './date.js'

const { CACHE_KEY } = process.env
const FILE_DELIMITER = ';'

const stores = {
  blob: store('blob-db'),
  meta: store('meta-db')
}

let progressController

async function dump () {
  try {
    reportProgress(0)

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
        let trackTotal = 0
        await cursor(stores.meta, {
          next: ({ target: { result: cursor } }) => {
            if (cursor) {
              const value = new self.TextEncoder().encode(
                JSON.stringify(cursor.value)
              )
              const header = new self.TextEncoder().encode(
                JSON.stringify({
                  next: {
                    size: value.byteLength.toString(32).padStart(5, '0'),
                    key: cursor.key.toString().padStart(15, '0'),
                    type: 'M'
                  }
                })
              )
              controller.enqueue(header)
              controller.enqueue(value)
              trackTotal++
              cursor.continue()
            }
          }
        })
        const pending = []
        let more = true
        let lastKey
        let tracksProcessed = 0
        cursor(stores.blob, {
          next: ({ target: { result: cursor } }) => {
            if (cursor) {
              const { key, value } = cursor
              const copy = value.slice
                ? value.slice()
                : new self.Blob(value.data)
              pending.push({ key, value: copy })
              cursor.continue()
            } else {
              more = false
            }
          }
        }).catch(console.error)
        // eslint-disable-next-line
        while (more || pending.length) {
          while (true) {
            const cursor = pending.pop()
            if (!cursor) break
            const processKey = cursor.key
              .toString()
              .replace(/^0+/, '')
              .split('-')[0]
            const value = new Uint8Array(await cursor.value.arrayBuffer())
            const header = new self.TextEncoder().encode(
              JSON.stringify({
                next: {
                  size: value.byteLength.toString(32).padStart(5, '0'),
                  key: cursor.key.toString().padStart(15, '0'),
                  type: 'B'
                }
              })
            )
            controller.enqueue(header)
            controller.enqueue(value)
            if (processKey !== lastKey) {
              tracksProcessed++
              reportProgress((tracksProcessed / trackTotal) * 100)
            }
            lastKey = processKey
          }
          await new Promise((resolve, reject) => setTimeout(resolve, 100))
        }
        reportProgress(100)
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
  } catch (err) {
    reportProgress('failed')
    return new self.Response(err.toString(), { status: 500 })
  }
}

self.addEventListener('install', async event => {
  event.waitUntil(self.skipWaiting())
  try {
    const keys = await self.caches.keys()
    for (const key of keys) {
      if (key !== CACHE_KEY) {
        await self.caches.delete(key)
      }
    }
  } catch (err) {
    console.error('failed to delete old caches', err)
  }
})

self.addEventListener('activate', event =>
  event.waitUntil(
    self.clients
      .claim()
      .catch(err => console.error('failed to claim clients', err))
  )
)

const parseRange = value =>
  Number(((value || '').match(/^bytes=(\d+)/) || [])[1]) || 0

self.addEventListener('fetch', event => {
  const { pathname } = new self.URL(event.request.url)
  if (event.request.method === 'GET' && pathname.startsWith('/download/')) {
    return event.respondWith(download(event.request))
  }
  if (event.request.method === 'GET' && pathname.startsWith('/stream/')) {
    return event.respondWith(stream(event.request))
  }
  if (event.request.method === 'DELETE' && pathname.startsWith('/delete/')) {
    return event.respondWith(deleteTrack(event.request))
  }
  if (event.request.method === 'PUT' && pathname === '/upload') {
    return event.respondWith(upload(event.request))
  }
  if (event.request.method === 'GET' && pathname === '/dump') {
    return event.respondWith(dump())
  }
  if (event.request.method === 'GET' && pathname === '/progress') {
    return event.respondWith(getProgress())
  }
  if (self.location.hostname === 'localhost' && !process.env.CACHE_LOCAL) {
    return
  }
  event.respondWith(cacheResponse(event.request))
})

async function download (request) {
  try {
    const prefix = requestPrefix(request)

    const meta = await get(stores.meta, prefix.slice(0, -1))

    if (!meta) return new self.Response(null, { status: 404 })
    reportProgress(0)

    const { duration, mimeType, totalSize, title } = meta
    const stream = new self.ReadableStream({
      start (controller) {
        const next = async offset => {
          try {
            const chunk = await get(stores.blob, prefix + offset)
            if (!chunk) {
              reportProgress(100)
              controller.close()
            } else {
              controller.enqueue(new Uint8Array(await chunk.arrayBuffer()))
              next(offset + 1)
            }
          } catch (err) {
            console.error('download failed for %s/%s', prefix, offset)
            reportProgress('failed')
            controller.close()
          }
        }
        next(0)
      }
    })
    const filename = [
      dateKey(prefix.slice(0, -1)),
      duration ? durationToMs(duration) : '',
      title,
      `${mimeType.replace(/\//g, ' ')}.${getFileType(mimeType)}`
    ].join(encodeURIComponent(FILE_DELIMITER))
    return new self.Response(stream, {
      headers: [
        ['Content-Length', totalSize],
        ['Content-Type', mimeType],
        ['Content-Disposition', `attachment; filename=${filename}`]
      ]
    })
  } catch (err) {
    reportProgress('failed')
    return new self.Response(err.toString(), { status: 500 })
  }
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
    const allData = all.data ? new self.Blob(all.data) : all
    return new self.Response(allData, {
      headers: [['Content-Length', allData.size], ['Content-Type', mimeType]]
    })
  }
}

async function cacheResponse (request) {
  const cache = await self.caches.open(CACHE_KEY)
  const res = await cache.match(request.url)
  if (res) return res

  return nohit(cache)

  function nohit (cache) {
    try {
      return cacheAsset(cache)
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
    reportProgress(0)
    const formData = await request.formData()
    const files = [...formData.values()]
    for (const file of files) {
      const { name, size } = file
      if (/\.mwr/i.test(name)) {
        await uploadFromDbFile(file, files.length)
        continue
      }
      const [prefix, ms, title = '', type = ''] = decodeURIComponent(name)
        .replace(/\..*$/, '')
        .split(FILE_DELIMITER)
      const mimeType = type ? type.replace(/ /, '/') : getMimeType(name)
      const duration = ms ? msToTime(ms) : '\xa0'
      const fixedSize = 100000
      const key = name.includes(FILE_DELIMITER)
        ? dateKey(prefix)
        : Date.now().toString(32)
      await set(stores.meta, key, {
        duration,
        fixedSize,
        mimeType,
        totalSize: size,
        title: name.includes(FILE_DELIMITER) ? title : prefix
      })
      let range = 0
      let offset = 0
      while (offset < size) {
        reportProgress(((offset / size) * 100) / files.length)
        await set(
          stores.blob,
          `${key}-${range}`,
          file.slice(offset, offset + fixedSize)
        )
        offset += fixedSize
        range++
      }
    }
    reportProgress(100)
    return new self.Response()
  } catch (err) {
    reportProgress('failed')
    return new self.Response(err.toString(), { status: 500 })
  }
}

async function uploadFromDbFile (file, fileCount) {
  const headerSize = parseInt(await file.slice(0, 2).text(), 32)
  let offset = 2

  let trackCount = 0
  let tracksProcessed = 0
  let lastKey

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
      dateKey(key),
      trackValue
    )
    if (type === 'M') {
      trackCount++
    } else {
      const processKey = dateKey(key)
        .toString()
        .replace(/^0+/, '')
        .split('-')[0]
      if (lastKey !== processKey) {
        tracksProcessed++
        reportProgress(((tracksProcessed / trackCount) * 100) / fileCount)
      }
      lastKey = processKey
    }
  }
}

function getProgress () {
  if (progressController) {
    try {
      progressController.close()
      progressController = null
    } catch {
    }
  }
  const stream = new self.ReadableStream({
    start (controller) {
      progressController = controller
    }
  })
  return new self.Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'Keep-Alive'
    }
  })
}

async function deleteTrack (request) {
  try {
    reportProgress(0)
    const prefix = requestPrefix(request)
    const meta = await get(stores.meta, prefix.slice(0, -1))
    if (!meta) return new self.Response(null, { status: 404 })
    if (meta.totalSize) {
      const chunks = meta.totalSize / meta.fixedSize
      await cursor(stores.blob, {
        query: self.IDBKeyRange.bound(`${prefix}\x00`, `${prefix}\xff`, false, false),
        type: 'readwrite',
        next: ({ target: { result: cursor } }) => {
          if (cursor) {
            const i = Number(cursor.key.split('-').slice(-1)[0])
            if (i === 0) console.log(cursor.key)
            cursor.delete()
            reportProgress((i / chunks) * 100)
            cursor.continue()
          }
        }
      })
    } else {
      await del(stores.blob, prefix.slice(0, -1))
    }
    await del(stores.meta, prefix.slice(0, -1))
    reportProgress(100)
    return new self.Response()
  } catch (error) {
    return new self.Response(error.toString(), { status: 500 })
  }
}

function reportProgress (message) {
  reportProgress.id = reportProgress.id || 0
  if (progressController) {
    progressController.enqueue(
      new self.TextEncoder().encode(
        `id: ${++reportProgress.id}\nretry: 60000\ndata: ${message.toString()}\n\n`
      )
    )
    if (message === 100 || typeof message !== 'number') {
      progressController.close()
      progressController = null
    }
  }
}

function dateKey (key) {
  if (+key === +new Date(+key)) {
    return parseInt(key, 10).toString(32)
  } else if (parseInt(key, 32) === +new Date(parseInt(key, 32))) {
    return key.toString().replace(/^0+/, '')
  } else {
    return key
  }
}

function requestPrefix (request) {
  return decodeURIComponent(request.url.split('/').slice(-1)[0])
}

function getFileType (mimeType) {
  return mimeType.split('/')[1]
}

function getMimeType (filename) {
  if (/.mp4/i.test(filename)) return 'video/mp4'
  if (/.mp3/i.test(filename)) return 'audio/mp3'
  if (/.webm/i.test(filename)) return 'video/webm'
}
