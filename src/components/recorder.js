import { img, div } from '../dom.js'
import recordAudio from '../img/record-audio.svg'
import recordVideo from '../img/record-video.svg'
import stopRecording from '../img/stop-recording.svg'

export default opt =>
  div(
    {
      className: 'recorder'
    },
    [
      div(
        {
          className: 'controls'
        },
        [
          img({
            className: 'audio',
            src: recordAudio,
            onclick: opt.onRecord('audio')
          }),
          img({
            className: 'video',
            src: recordVideo,
            onclick: opt.onRecord('video')
          }),
          img({ className: 'stop', src: stopRecording, onclick: opt.onStop })
        ]
      )
    ]
  )
