import { del, set, get, Store } from 'https://unpkg.com/idb-keyval@3.2.0?module'
export default input => {
  let capture
  let allChunks = []
  let started
  const blobStore = new Store('blob-db')
  const metaStore = new Store('meta-db')
  let recordingVideo
  return {
    record: () => ({
      async onRecord (type, e) {
        e.target.parentNode.querySelector('.stop').textContent = `■ (${type})`
        const playing = e.target.parentNode.parentNode.querySelector('.playing')
        if (playing) {
          playing.classList.remove('playing')
        }
        e.target.parentNode.classList.add('recording')
        started = Date.now()
        capture = new window.MediaRecorder(input, {
          mimeType: `${type}/webm`
        })
        if (type === 'video') {
          recordingVideo = window.document.createElement('video')
          recordingVideo.width = window.document.body.clientWidth
          recordingVideo.style = 'position: fixed; top: 0; left: 0'
          recordingVideo.muted = true
          recordingVideo.srcObject = input
          recordingVideo.play().catch(f => f)
          e.target.parentNode.appendChild(recordingVideo)
        }
        let recordTimer = setTimeout(
          () =>
            window.alert(
              `not recording, check your microphone/camera isn't in use by another page`
            ),
          1500
        )
        capture.ondataavailable = ({ data }) => {
          allChunks.push(data)
          if (recordTimer) {
            clearTimeout(recordTimer)
            recordTimer = null
          }
        }
        capture.start(200)
      },
      async onStop (e) {
        e.target.parentNode.classList.remove('recording')
        capture.stop()
        if (recordingVideo) {
          recordingVideo.parentNode.removeChild(recordingVideo)
          recordingVideo = null
        }
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
              title: displayDate(Date.now()),
              mimeType: allChunks[0].type
            },
            metaStore
          )
          allChunks.splice(0, allChunks.length)
          capture = null
        } else {
          console.log('there is no audio data to save')
        }
        window.location.reload()
      }
    }),
    track ({ key, metadata }) {
      let media
      const onStop = e => {
        if (media) {
          e.target.parentNode.classList.remove('playing')
          window.URL.revokeObjectURL(media.src)
          media.pause()
          if (media.parentNode) media.parentNode.removeChild(media)
          media.src = ''
          media = null
        }
      }
      return {
        async onPlay (e) {
          const { data } = await get(key, blobStore)
          e.target.parentNode.classList.add('playing')
          const blob = new window.Blob(data)
          const isVideo = metadata.mimeType === 'video/webm'
          media = window.document.createElement(isVideo ? 'video' : 'audio')
          media.src = window.URL.createObjectURL(blob)
          media.style.maxWidth = '100vw'
          media.onended = () => onStop(e)
          media.play().catch(err => window.alert(err.message))
          if (isVideo) {
            media.controls = true
            window.document.body.appendChild(media)
            media.scrollIntoView()
          }
        },
        onStop,
        async onPause (e) {
          if (media.paused) {
            media.play().catch(err => window.alert(err.message))
          } else {
            media.pause()
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
