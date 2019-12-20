import { input, datalist, option } from './dom.js'

export default async () => {
  const audioDeviceId = window.sessionStorage.getItem('audio-deviceid')
  if (audioDeviceId) audio.deviceId = { exact: audioDeviceId }
  const getAudio = await window.navigator.mediaDevices
    .getUserMedia({ audio })
    .catch(_ => null)
  const getVideo = await window.navigator.mediaDevices
    .getUserMedia({ video, audio })
    .catch(_ => null)

  if (!audioDeviceId) {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter(x => x.kind === 'audioinput')

    if (!audioDeviceId) {
      const select = window.document.body.appendChild(
        input({
          className: 'select-audio',
          placeholder: 'Select audio device'
        })
      )
      window.document.body.appendChild(
        datalist(
          {
            id: 'devices'
          },
          audioInputs.map(x => option({ value: x.label }))
        )
      )
      select.setAttribute('list', 'devices')
      const label = await new Promise((resolve, reject) => {
        select.onchange = () => resolve(select.value)
      })
      window.sessionStorage.setItem(
        'audio-deviceid',
        audioInputs.find(x => x.label === label).deviceId
      )
      window.location.reload()
    }
  }

  if (!getAudio) window.sessionStorage.removeItem('audio-deviceid')

  return {
    audio: getAudio,
    video: getVideo
  }
}

const audio = {
  sampleRate: 48000,
  channelCount: 2,
  volume: 1.0,
  echoCancellation: false,
  noiseSuppression: false,
  audioGainControl: false
}

const video = {
  facingMode: 'environment'
}
