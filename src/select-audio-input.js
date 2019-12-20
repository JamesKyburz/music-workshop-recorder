import { input, datalist, option } from './dom.js'

export default async function selectAudio () {
  const devices = await window.navigator.mediaDevices.enumerateDevices()
  const audioInputs = devices.filter(x => x.kind === 'audioinput' && x.label)

  if (!audioInputs.length) return

  const select = window.document.body.appendChild(
    input({
      className: 'select-audio',
      placeholder: 'Select audio device'
    })
  )
  window.document.body.appendChild(
    datalist(
      {
        id: 'devices'
      },
      audioInputs.map(x => option({ value: x.label }))
    )
  )
  select.setAttribute('list', 'devices')

  const label = await new Promise((resolve, reject) => {
    select.onchange = () => resolve(select.value)
  })

  const { deviceId } = audioInputs.find(x => x.label === label) || {}

  if (deviceId) {
    window.sessionStorage.setItem('audio-deviceid', deviceId)
  } else {
    window.sessionStorage.removeItem('audio-deviceid')
  }
  window.location.reload()
}
