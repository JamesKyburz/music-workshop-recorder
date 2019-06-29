import app from './components/app.js'
import './register-sw.js'

if (!window.MediaRecorder || !window.navigator.mediaDevices) {
  window.document.body.innerHTML = `<h1>Sorry your browser isn't supported</h1>`
} else {
  window.navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { facingMode: 'environment' }
    })
    .then(app)
    .then(el => window.document.body.appendChild(el))
    .catch(console.error)
}
