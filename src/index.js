import app from './components/app.js'
import './register-sw.js'
import getInputs from './get-inputs.js'

if (
  window.location.hostname !== 'localhost' &&
  window.location.protocol !== 'https:'
) {
  window.location.href = window.location.href.replace(/http:/, 'https:')
}

if (!window.MediaRecorder || !window.navigator.mediaDevices) {
  window.document.body.innerHTML = "<h1>Sorry your browser isn't supported</h1>"
} else {
  createApp()
}

async function createApp () {
  try {
    const el = await app(await getInputs())
    window.document.body.appendChild(el)
  } catch (err) {
    window.document.body.innerHTML = `<h1>Sorry failed to load ${
      err.message
    }</h1>`
  }
}
