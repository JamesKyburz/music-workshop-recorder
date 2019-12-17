import { img, div, a } from '../dom.js'
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
          div({ className: 'progress' }, [div({ className: 'timeline' })]),
          img({
            className: 'upload',
            src: upload,
            onclick: opt.onUpload()
          }),
          img({
            className: 'audio',
            ...(!opt.canRecord('audio') && { style: 'display: none;' }),
            src: recordAudio,
            onclick: opt.onRecord('audio')
          }),
          img({
            className: 'video',
            ...(!opt.canRecord('video') && { style: 'display: none;' }),
            src: recordVideo,
            onclick: opt.onRecord('video')
          }),
          a(
            {
              className: 'download',
              href: '/dump'
            },
            [
              img({
                className: 'download',
                src: download
              })
            ]
          ),
          img({ className: 'stop', src: stopRecording, onclick: opt.onStop })
        ]
      )
    ]
  )
