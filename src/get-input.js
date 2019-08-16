export default () => window.navigator.mediaDevices.getUserMedia({
  audio: {
    sampleRate: 48000,
    channelCount: 2,
    volume: 1.0,
    echoCancellation: false,
    noiseSuppression: false,
    audioGainControl: false
  },
  video: { facingMode: 'environment' }
})
