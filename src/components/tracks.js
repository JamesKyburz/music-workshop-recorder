import { get, keys, Store } from 'idb-keyval'
import Controls from '../controls.js'
import track from './track.js'
import { div, h4 } from '../dom.js'

export default async () => {
  const metaStore = new Store('meta-db')
  const controls = Controls()
  let slider
  let previousDate
  const trackKeys = await keys(metaStore)
  const tracks = div({ className: 'tracks' })
  const keyToDateString = key => {
    let date = new Date(parseInt(key, 32))
    if (!+date) date = new Date(key)
    return date.toDateString()
  }
  for (const key of trackKeys.reverse()) {
    const date = keyToDateString(key)
    if (!slider || previousDate !== date) {
      tracks.push(h4({ className: 'day', textContent: date }))
      slider = div({ className: 'slider' })
      tracks.push(slider)
    }
    const metadata = await get(key, metaStore)
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
  }
  return tracks
}
