import { div, img, span } from '../dom.js'
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
        ...(opt.type !== 'audio' && { style: 'display: none;' }),
        className: 'type',
        src: new URL('../img/audio.svg', import.meta.url).href,
      }),
      img({
        ...(opt.type !== 'video' && { style: 'display: none;' }),
        className: 'type',
        src: new URL('../img/video.svg', import.meta.url).href,
      }),
      span({
        className: 'duration',
        textContent: opt.duration
      })
    ]
  )
