import { img, div, input } from '../dom.js'

export default opt => {
  opt.onShow()
  return div(
    {
      className: 'player stopped'
    },
    [
      div({ className: 'info' }, [
        input({
          className: 'title',
          placeholder: 'Name of the song?',
          oninput: e => {
            opt.onInput(e)
            opt.title = e.target.value
          },
          value: opt.title || ''
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
      ]),
      div(
        {
          className: 'controls'
        },
        [
          img({
            className: 'back',
            src: new URL('../img/back.svg', import.meta.url).href,
            onclick: opt.onBack
          }),
          img({
            className: 'play',
            src: new URL('../img/play.svg', import.meta.url).href,
            onclick: opt.onPlay
          }),
          img({
            className: 'decrease',
            src: new URL('../img/decrease.svg', import.meta.url).href,
            onclick: opt.onDecrease
          }),
          img({
            className: 'pause',
            src: new URL('../img/pause-playing.svg', import.meta.url).href,
            onclick: opt.onPause
          }),
          img({
            className: 'stop',
            src: new URL('../img/stop-playing.svg', import.meta.url).href,
            onclick: opt.onStop
          }),
          img({
            className: 'increase',
            src: new URL('../img/increase.svg', import.meta.url).href,
            onclick: opt.onIncrease
          }),
          img({
            className: 'delete',
            src: new URL('../img/delete.svg', import.meta.url).href,
            onclick: opt.onDelete
          }),
          div({ className: 'progress' }, [
            div({ className: 'current-time', textContent: opt.duration }),
            div({ className: 'timeline' })
          ])
        ]
      )
    ]
  )
}
