import { del, set, get, Store } from 'https://unpkg.com/idb-keyval@3.2.0?module'
export default input => {
  let mic
  let allChunks = []
  let started
  const blobStore = new Store('blob-db')
  const metaStore = new Store('meta-db')
  return {
    record: () => ({
      async onRecord (e) {
        const playing = e.target.parentNode.parentNode.querySelector('.playing')
        if (playing) {
          playing.classList.remove('playing')
        }
        e.target.parentNode.classList.add('recording')
        started = Date.now()
        mic = new window.MediaRecorder(input, {
          audioBitsPerSecond: 128000
        })
        mic.ondataavailable = ({ data }) => allChunks.push(data)
        mic.start(200)
      },
      async onStop (e) {
        e.target.parentNode.classList.remove('recording')
        mic.stop()
        if (allChunks.length) {
          const key = Date.now()
          await set(
            key,
            {
              data: allChunks
            },
            blobStore
          )
          await set(
            key,
            {
              duration: msToTime(Date.now() - started),
              title: displayDate(Date.now())
            },
            metaStore
          )
          allChunks.splice(0, allChunks.length)
          mic = null
        } else {
          console.log('there is no audio data to save')
        }
        window.location.reload()
      }
    }),
    track ({ key, metadata }) {
      let audio
      const onStop = e => {
        if (audio) {
          e.target.parentNode.classList.remove('playing')
          window.URL.revokeObjectURL(audio.src)
          audio.pause()
          audio.src = ''
          audio = null
        }
      }
      return {
        async onPlay (e) {
          e.target.parentNode.classList.add('playing')
          const { data } = await get(key, blobStore)
          audio = new window.Audio()
          audio.src = window.URL.createObjectURL(new window.Blob(data))
          audio.onended = () => onStop(e)
          audio.play()
        },
        onStop,
        async onPause (e) {
          if (audio.paused) {
            audio.play()
          } else {
            audio.pause()
          }
        },
        async onDelete (e) {
          if (
            window.confirm(`Delete ${metadata.title} ${metadata.duration}?`)
          ) {
            await del(key, blobStore)
            await del(key, metaStore)
            window.location.reload()
          }
        }
      }
    }
  }
}

function twoDigits (s) {
  return Math.floor(s)
    .toString()
    .padStart(2, '0')
}

function displayDate (n) {
  const d = new Date(n)
  return `${d.getFullYear()}-${twoDigits(d.getMonth() + 1)}-${twoDigits(
    d.getDate()
  )} ${twoDigits(d.getHours())}:${twoDigits(d.getMinutes())}`
}

function msToTime (ms) {
  const seconds = twoDigits((ms / 1000) % 60)
  const minutes = twoDigits((ms / 60000) % 60)
  const hours = twoDigits((ms / 3600000) % 24)
  return `${hours}:${minutes}:${seconds}`.replace(/^00:/, '')
}
