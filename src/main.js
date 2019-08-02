import app from './components/app.js'
import './register-sw.js'

if (!window.MediaRecorder || !window.navigator.mediaDevices) {
  window.document.body.innerHTML = `<h1>Sorry your browser isn't supported</h1>`
} else {
  window.navigator.mediaDevices
    .getUserMedia({
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
    .then(app)
    .then(el => window.document.body.appendChild(el))
    .catch(console.error)
}
