import { del, set, get, Store } from 'idb-keyval'

export default input => {
  let capture
  let totalSize = 0
  let started
  let recording
  let part
  const key = Date.now().toString(32)
  const blobStore = new Store('blob-db')
  const metaStore = new Store('meta-db')
  const fixedSize = 100000
  let recordingVideo
  const onStop = async e => {
    if (e) e.target.parentNode.parentNode.classList.remove('recording')
    recording = false
    if (capture) capture.stop()
    if (recordingVideo) {
      recordingVideo.parentNode.removeChild(recordingVideo)
      recordingVideo = null
    }
    if (!totalSize && capture) {
      console.log('there is no audio data to save')
    }
    setTimeout(() => window.location.reload(), 1000)
    capture = null
  }
  return {
    record: () => ({
      onStop,
      onRecord (type) {
        return async e => {
          if (!input) {
            window.alert(
              'sorry camera or microphone are not ready, please try again'
            )
            return
          }
          recording = true
          part = 0
          e.target.parentNode.querySelector('.stop').textContent = `■ (${type})`
          const playing = e.target.parentNode.parentNode.querySelector(
            '.playing'
          )
          if (playing) {
            playing.classList.remove('playing')
          }
          e.target.parentNode.parentNode.classList.add('recording')
          started = Date.now()
          capture = new window.MediaRecorder(input, {
            mimeType: `${type}/webm`
          })
          if (type === 'video') {
            recordingVideo = window.document.createElement('video')
            recordingVideo.className = 'recording'
            recordingVideo.width = window.document.body.clientWidth
            recordingVideo.style = 'position: fixed; top: 0; left: 0'
            recordingVideo.muted = true
            recordingVideo.srcObject = input
            recordingVideo.play().catch(f => f)
            window.document.body.appendChild(recordingVideo)
          }
          let recordTimer = setTimeout(
            () =>
              window.alert(
                "not recording, check your microphone/camera isn't in use by another page"
              ),
            1500
          )
          let previousCapture
          totalSize = 0
          const prefix = key + '-'
          const save = ({ data }) => {
            if (recordTimer) {
              clearTimeout(recordTimer)
              recordTimer = null
            }
            const { type } = data
            const capture = new window.Blob(
              [previousCapture, data].filter(Boolean),
              {
                type
              }
            )
            if (capture.size < fixedSize && recording) {
              previousCapture = capture
            } else {
              let start = 0
              while (start < capture.size) {
                const frame = capture.slice(start, start + fixedSize, type)
                if (frame.size) {
                  if (frame.size === fixedSize || !recording) {
                    const key = prefix + part
                    part++
                    set(key, frame, blobStore).catch(f => f)
                    totalSize += frame.size
                  } else {
                    previousCapture = frame
                  }
                }
                start += fixedSize
              }
            }
            if (totalSize) {
              set(
                key,
                {
                  duration: msToTime(Date.now() - started),
                  title: '',
                  mimeType: type,
                  totalSize,
                  fixedSize
                },
                metaStore
              ).catch(f => f)
            }
          }
          capture.ondataavailable = save
          capture.start(200)
        }
      }
    }),
    track ({ key, metadata }) {
      let media
      const onStop = e => {
        if (media) {
          const player = e.target.closest('.player')
          player.classList.remove('playing')
          player.classList.add('stopped')
          media.pause()
          media.currentTime = 0
          const timeline = player.querySelector('.timeline')
          timeline.style.width = 0
          const currentTime = player.querySelector('.current-time')
          currentTime.textContent = metadata.duration
          if (media.parentNode) {
            media.parentNode.removeChild(media)
            media = null
          }
        }
      }
      const onPlay = async (e, opt = {}) => {
        const player = e.target.closest('.player')
        player.classList.add('playing')
        player.classList.remove('stopped')
        const currentTime = player.querySelector('.current-time')
        const timeline = player.querySelector('.timeline')
        const progress = player.querySelector('.progress')
        const duration = durationToMs(metadata.duration)
        progress.onclick = e => {
          const update = () => {
            if (media) {
              media.currentTime =
                ((duration / 1000) * e.pageX) / window.document.body.clientWidth
            }
          }
          if (!media) {
            onPlay(e, { pause: true }).then(update)
          } else {
            update()
          }
        }
        timeline.style.width = 0
        const isVideo = metadata.mimeType === 'video/webm'
        media = window.document.createElement(isVideo ? 'video' : 'audio')
        media.ontimeupdate = () => {
          if (media) {
            currentTime.textContent = msToTime(
              Math.max(0, duration - media.currentTime * 1000)
            )
            timeline.style.width = `${Math.ceil(
              ((media.currentTime * 1000) / duration) * 100
            )}%`
          }
        }
        if (metadata.totalSize) {
          media.src = `/stream/${encodeURIComponent(
            metadata.title || 'name'
          )}.webm?totalSize=${metadata.totalSize}&fixedSize=${
            metadata.fixedSize
          }&prefix=${key + '-'}`
        } else {
          const singleBlob = await get(key, blobStore)
          const blob = new window.Blob(singleBlob.data)
          media.src = window.URL.createObjectURL(blob)
        }
        media.style.maxWidth = '100vw'
        media.onended = () => onStop(e)
        if (!opt.pause) {
          media.play().catch(err => window.alert(err.message))
        }
        if (isVideo) {
          media.className = 'playing'
          window.document.body.appendChild(media)
          media.scrollIntoView()
        }
      }
      let inputTimer
      return {
        onInput (e) {
          const inputValue = e.target.value
          if (inputTimer) {
            clearTimeout(inputTimer)
            inputTimer = null
          }
          inputTimer = setTimeout(() => {
            get(key, metaStore).then(value => {
              value.title = inputValue
              window.document.body.querySelector(
                `.track.key-${key} .title`
              ).textContent = inputValue
              set(key, value, metaStore).catch(f => f)
            })
          }, 250)
        },
        onBack (e) {
          if (media) {
            media.pause()
            window.URL.revokeObjectURL(media.src)
            if (media.parentNode) media.parentNode.removeChild(media)
            media = null
          }
          const player = e.target.closest('.player')
          player.parentNode.removeChild(player)
        },
        onPlay,
        onStop,
        async onPause (e) {
          if (media) {
            if (media.paused) {
              media.play().catch(err => window.alert(err.message))
            } else {
              media.pause()
            }
          }
        },
        async onDelete (e) {
          if (window.confirm(`Delete ${metadata.title || 'untitiled'}?`)) {
            await del(key, metaStore)
            if (metadata.totalSize) {
              const to = Math.floor(metadata.totalSize / metadata.fixedSize)
              let i = 0
              while (i <= to) await del(`${key}-${i++}`, blobStore)
            } else {
              await del(key, blobStore)
            }
            window.location.reload()
          }
        }
      }
    }
  }
}

function durationToMs (duration) {
  const parts = duration.split(':')
  return (
    (parts.slice(-3)[0] || 0) * 3600000 +
    (parts.slice(-2)[0] || 0) * 60000 +
    parts.slice(-1)[0] * 1000
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
