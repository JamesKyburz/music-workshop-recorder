const swUrl = '/sw.js'

if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      if (window.navigator.serviceWorker.controller) {
        registration.update()
      }
      window.navigator.serviceWorker.addEventListener('message', ({ data }) => {
        if (data.action === 'refresh') {
          console.log('onmessage refresh')
          window.location.reload()
        }
      })
      registration.onupdatefound = () => {
        const installingWorker = registration.installing
        if (!installingWorker) return
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('controller onstatechange  refresh')
              window.location.reload()
            } else {
              console.log('no controller onstatechange  refresh')
              window.location.reload()
            }
          }
        }
      }
    })
    .catch(error => {
      console.error('Error during service worker registration:', error)
    })
}
