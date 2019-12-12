import { img, div } from '../dom.js'
import recordAudio from '../img/record-audio.svg'
import recordVideo from '../img/record-video.svg'
import stopRecording from '../img/stop-recording.svg'
import upload from '../img/upload.svg'
import download from '../img/download.svg'

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
            className: 'upload',
            src: upload,
            onclick: opt.onUpload()
          }),
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
          img({
            className: 'download',
            src: download,
            onclick: opt.onDownload()
          }),
          img({ className: 'stop', src: stopRecording, onclick: opt.onStop })
        ]
      )
    ]
  )
