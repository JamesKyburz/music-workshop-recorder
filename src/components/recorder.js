import { button, div } from '../dom.js'

export default opt =>
  div({
    className: 'row recorder',
    children: [
      button({
        className: 'col record',
        textContent: '● (audio)',
        onclick: e => opt.onRecord('audio', e)
      }),
      button({
        className: 'col record',
        textContent: '● (video)',
        onclick: e => opt.onRecord('video', e)
      }),
      button({
        className: 'col stop',
        textContent: '■',
        onclick: opt.onStop
      })
    ]
  })
