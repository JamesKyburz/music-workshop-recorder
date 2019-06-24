import { button, div } from '../dom.js'

export default opt => {
  return div({
    className: 'row recorder',
    children: [
      button({
        className: 'col record',
        textContent: '●',
        onclick: opt.onRecord
      }),
      button({
        className: 'col stop',
        textContent: '■',
        onclick: opt.onStop
      })
    ]
  })
}
