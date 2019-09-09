import app from './components/app.js'
import './register-sw.js'
import getInput from './get-input.js'

if (
  window.location.hostname !== 'localhost' &&
  window.location.protocol !== 'https:'
) {
  window.location.href = window.location.href.replace(/http:/, 'https:')
}

if (!window.MediaRecorder || !window.navigator.mediaDevices) {
  window.document.body.innerHTML = `<h1>Sorry your browser isn't supported</h1>`
} else {
  getInput()
    .then(app)
    .then(el => el && window.document.body.appendChild(el))
    .catch(err => console.error(err))
}
