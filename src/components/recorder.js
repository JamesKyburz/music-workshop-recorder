import { img, div, a } from '../dom.js'

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
            src: new URL('../img/upload.svg', import.meta.url).href,
            onclick: opt.onUpload()
          }),
          img({
            className: 'audio',
            ...(!opt.canRecord('audio') && { style: 'display: none;' }),
            src: new URL('../img/record-audio.svg', import.meta.url).href,
            onclick: opt.onRecord('audio')
          }),
          img({
            className: 'video',
            ...(!opt.canRecord('video') && { style: 'display: none;' }),
            src: new URL('../img/record-video.svg', import.meta.url).href,
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
                src: new URL('../img/download.svg', import.meta.url).href,
              })
            ]
          ),
          img({ className: 'stop', src: new URL('../img/stop-recording.svg', import.meta.url).href, onclick: opt.onStop })
        ]
      )
    ]
  )
