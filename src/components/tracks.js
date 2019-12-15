import { cursor, store } from '../db.js'
import Controls from '../controls.js'
import track from './track.js'
import { div, h4 } from '../dom.js'

export default async () => {
  const metaStore = store('meta-db')
  const controls = Controls()
  let slider
  let previousDate
  const tracks = div({ className: 'tracks' })
  const keyToDateString = key => {
    let date = new Date(parseInt(key, 32))
    if (!+date) date = new Date(key)
    return date.toDateString()
  }
  await cursor(metaStore, 'prev', ({ target: { result: cursor } }) => {
    if (cursor) {
      const key = cursor.key
      const date = keyToDateString(key)
      if (!slider || previousDate !== date) {
        tracks.push(h4({ className: 'day', textContent: date }))
        slider = div({ className: 'slider' })
        tracks.push(slider)
      }
      const metadata = cursor.value
      const { title, duration, mimeType } = metadata
      slider.push(
        track({
          title,
          duration,
          key,
          type: (mimeType || '').split('/')[0],
          ...controls.track({ key, metadata })
        })
      )
      previousDate = date
      cursor.continue()
    }
  })
  return tracks
}
