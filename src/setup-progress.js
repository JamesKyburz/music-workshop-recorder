export default function setupProgress () {
  let uploadDownloadProgress
  let uploadDownloadProgressTimeline
  let progress
  setup()
  function setup () {
    if (!uploadDownloadProgress) {
      uploadDownloadProgress = window.document.querySelector(
        '.recorder .progress'
      )
      if (uploadDownloadProgress) {
        uploadDownloadProgressTimeline = uploadDownloadProgress.querySelector(
          '.timeline'
        )
      }
    }

    if (!progress && uploadDownloadProgress && uploadDownloadProgressTimeline) {
      progress = new window.EventSource('/progress')
      progress.onmessage = ({ data }) => {
        const percent = +data
        if (!isNaN(percent) && percent !== 100) {
          uploadDownloadProgressTimeline.style.width = `${percent}%`
          uploadDownloadProgress.style.display = 'block'
        } else {
          progress.close()
          uploadDownloadProgress.style.display = 'none'
          progress = null
          setTimeout(setup, 500)
        }
      }
    } else {
      setTimeout(setup, 500)
    }
  }
}
