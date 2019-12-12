import { img, div, input } from '../dom.js'
import back from '../img/back.svg'
import play from '../img/play.svg'
import pause from '../img/pause-playing.svg'
import stop from '../img/stop-playing.svg'
import audio from '../img/audio.svg'
import video from '../img/video.svg'
import deleteTrack from '../img/delete.svg'
import increase from '../img/increase.svg'
import decrease from '../img/decrease.svg'

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
        img({ className: 'type', src: opt.type === 'audio' ? audio : video })
      ]),
      div(
        {
          className: 'controls'
        },
        [
          img({
            className: 'back',
            src: back,
            onclick: opt.onBack
          }),
          img({
            className: 'play',
            src: play,
            onclick: opt.onPlay
          }),
          img({
            className: 'decrease',
            src: decrease,
            onclick: opt.onDecrease
          }),
          img({
            className: 'pause',
            src: pause,
            onclick: opt.onPause
          }),
          img({
            className: 'stop',
            src: stop,
            onclick: opt.onStop
          }),
          img({
            className: 'increase',
            src: increase,
            onclick: opt.onIncrease
          }),
          img({
            className: 'delete',
            src: deleteTrack,
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
