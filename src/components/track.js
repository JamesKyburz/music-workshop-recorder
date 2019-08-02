import { div, button } from '../dom.js'

export default opt =>
  div(
    {
      className: 'row track'
    },
    [
      div({
        className: 'col title',
        textContent: opt.title
      }),
      div({
        className: 'col duration',
        textContent: opt.duration
      }),
      button({
        className: 'col play',
        textContent: '▶',
        onclick: opt.onPlay
      }),
      button({
        className: 'col delete',
        textContent: '✖',
        onclick: opt.onDelete
      }),
      button({
        className: 'col pause',
        textContent: '॥',
        onclick: opt.onPause
      }),
      button({
        className: 'col stop',
        textContent: '■',
        onclick: opt.onStop
      })
    ]
  )
