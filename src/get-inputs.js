export default () => ({
  getAudio: window.navigator.mediaDevices.getUserMedia({
    audio
  }),
  getVideo: window.navigator.mediaDevices.getUserMedia({
    audio,
    video
  })
})

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
