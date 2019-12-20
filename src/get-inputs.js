import selectAudioInput from './select-audio-input.js'

export default async () => {
  const audioDeviceId = window.sessionStorage.getItem('audio-deviceid')

  const audioSettings = {
    sampleRate: 48000,
    channelCount: 2,
    volume: 1.0,
    echoCancellation: false,
    noiseSuppression: false,
    audioGainControl: false,
    ...(audioDeviceId && { deviceId: { exact: audioDeviceId } })
  }

  const mediaSettings = {
    audio: {
      audio: audioSettings
    },
    video: {
      video: {
        facingMode: 'environment'
      },
      audio: audioSettings
    }
  }

  const getInput = type =>
    window.navigator.mediaDevices
      .getUserMedia(mediaSettings[type])
      .catch(_ => null)

  const audio = await getInput('audio')
  const video = await getInput('video')

  if (!audio || !audioDeviceId) await selectAudioInput()

  return { audio, video }
}
