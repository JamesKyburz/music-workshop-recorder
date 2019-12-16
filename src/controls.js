import { del, set, get, store } from './db.js'
import { audio, video } from './dom.js'

export default input => {
  let capture
  let totalSize = 0
  let started
  let recording
  let part
  let uploadDownloadProgress
  let uploadDownloadProgressTimeline

  const key = Date.now().toString(32)
  const blobStore = store('blob-db')
  const metaStore = store('meta-db')
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
  const uploadDownloadDom = () => {
    if (!uploadDownloadProgress) {
      uploadDownloadProgress = window.document.querySelector(
        '.recorder .progress'
      )
      if (uploadDownloadProgress) {
        uploadDownloadProgressTimeline = uploadDownloadProgress.querySelector(
          '.timeline'
        )
      }
    }
  }
  return {
    record: () => ({
      async onDownload () {
        return () => {
          const progress = new window.EventSource('/progress')
          progress.onmessage = ({ data }) => {
            uploadDownloadDom()
            const percent = +data
            if (!isNaN(percent) && percent !== 100) {
              uploadDownloadProgressTimeline.style.width = `${percent}%`
              uploadDownloadProgress.style.display = 'block'
            } else {
              uploadDownloadProgress.style.display = 'none'
            }
          }
        }
      },
      onUpload () {
        return async () => {
          const input = window.document.body.appendChild(
            window.document.createElement('input')
          )
          input.style.display = 'none'
          input.type = 'file'
          input.multiple = true
          input.accept = '.mwr,audio/*,video/*'
          input.onchange = async () => {
            const formData = new window.FormData()
            for (const file of input.files) {
              formData.append(
                'file',
                file.slice(),
                file.name.replace(/[^\w_ .]/g, '')
              )
            }
            const res = await window.fetch('/upload', {
              method: 'PUT',
              body: formData
            })
            if (res.status === 200) {
              window.location.reload()
            } else {
              window.alert('sorry failed to upload')
            }
            input.parentNode.removeChild(input)
          }
          const progress = new window.EventSource('/progress')
          progress.onmessage = ({ data }) => {
            uploadDownloadDom()
            const percent = +data
            console.log('got upload progress', data)
            if (!isNaN(percent) && percent !== 100) {
              uploadDownloadProgressTimeline.style.width = `${percent}%`
              uploadDownloadProgress.style.display = 'block'
            } else {
              uploadDownloadProgress.style.display = 'none'
            }
          }
          input.click()
        }
      },
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
            recordingVideo = video({
              className: 'recording',
              style: 'position: fixed; top: 0; left: 0',
              muted: true,
              srcObject: input
            })
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
            const mimeType = `${type}/webm`
            const capture = new window.Blob(
              [previousCapture, data].filter(Boolean),
              {
                mimeType
              }
            )
            if (capture.size < fixedSize && recording) {
              previousCapture = capture
            } else {
              let start = 0
              while (start < capture.size) {
                const frame = capture.slice(start, start + fixedSize, mimeType)
                if (frame.size) {
                  if (frame.size === fixedSize || !recording) {
                    const key = prefix + part
                    part++
                    set(blobStore, key, frame).catch(f => f)
                    totalSize += frame.size
                  } else {
                    previousCapture = frame
                  }
                }
                start += fixedSize
              }
            }
            if (totalSize) {
              set(metaStore, key, {
                duration: msToTime(Date.now() - started),
                title: '',
                mimeType,
                totalSize,
                fixedSize
              }).catch(f => f)
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
          if (media && media.parentNode) media.parentNode.removeChild(media)
          media = null
        }
      }
      const onPlay = async (e, opt = {}) => {
        const player = e.target.closest('.player')
        player.classList.add('playing')
        player.classList.remove('stopped')
        const currentTime = player.querySelector('.current-time')
        const timeline = player.querySelector('.timeline')
        const progress = player.querySelector('.progress')
        let duration = durationToMs(metadata.duration)
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
        const isVideo = metadata.mimeType.startsWith('video')
        media = (isVideo ? video : audio)({
          className: 'playing',
          src: await getMediaSource(key, metadata),
          style: 'maxWidth = 100vw',
          onended () {
            onStop(e)
          },
          ontimeupdate () {
            if (media) {
              if (duration === 0 && media.duration !== Infinity) {
                duration = media.duration * 1000
                get(metaStore, key)
                  .then(meta => {
                    if (meta) {
                      return set(metaStore, key, {
                        ...meta,
                        duration: msToTime(duration)
                      })
                    }
                  })
                  .catch(_ => null)
              }
              currentTime.textContent = msToTime(
                Math.max(0, duration - media.currentTime * 1000)
              )
              timeline.style.width = `${Math.ceil(
                ((media.currentTime * 1000) / duration) * 100
              )}%`
            }
          }
        })
        if (!opt.pause) {
          media.play().catch(err => window.alert(err.message))
        }
        if (isVideo) {
          window.document.body.appendChild(media)
        }
      }
      let inputTimer
      return {
        onShow () {
          window.document.querySelector('a.download').href = `/download/${key}-`
        },
        onInput (e) {
          const inputValue = e.target.value
          if (inputTimer) {
            clearTimeout(inputTimer)
            inputTimer = null
          }
          inputTimer = setTimeout(() => {
            get(metaStore, key).then(value => {
              value.title = inputValue
              set(metaStore, key, value).catch(f => f)
              try {
                window.document.body.querySelector(
                  `.track.key-${key} .title`
                ).textContent = inputValue
              } catch (_) {}
            })
          }, 250)
        },
        onBack (e) {
          window.document.querySelector('a.download').href = '/dump'
          if (media) {
            media.pause()
            window.URL.revokeObjectURL(media.src)
            if (media && media.parentNode) media.parentNode.removeChild(media)
            media = null
          }
          const player = e.target.closest('.player')
          player.parentNode.removeChild(player)
        },
        onPlay,
        onStop,
        onIncrease () {
          if (media) media.playbackRate = Math.min(media.playbackRate + 0.25, 4)
        },
        onDecrease () {
          if (media) {
            media.playbackRate = Math.max(media.playbackRate - 0.25, 0.25)
          }
        },
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
            await del(metaStore, key)
            if (metadata.totalSize) {
              const to = Math.floor(metadata.totalSize / metadata.fixedSize)
              let i = 0
              while (i <= to) await del(blobStore, `${key}-${i++}`)
            } else {
              await del(blobStore, key)
            }
            window.location.reload()
          }
        }
      }
    }
  }
  async function getMediaSource (key) {
    return `/stream/${key}-`
  }
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
