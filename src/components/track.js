import { div, img, span } from '../dom.js'
import audio from '../img/audio.svg'
import video from '../img/video.svg'
import player from './player'

export default opt =>
  div(
    {
      className: `track key-${opt.key}`,
      onclick: e => window.document.body.appendChild(player(opt))
    },
    [
      span({
        className: 'title',
        textContent: opt.title || 'untitled'
      }),
      img({
        className: 'type',
        src: opt.type === 'audio' ? audio : video
      }),
      span({
        className: 'duration',
        textContent: opt.duration
      })
    ]
  )
