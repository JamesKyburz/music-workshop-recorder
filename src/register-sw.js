if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(registration => {
      if (window.navigator.serviceWorker.controller) {
        if (registration.update) registration.update()
      }
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
