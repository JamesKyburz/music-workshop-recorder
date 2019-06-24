import { get, keys, Store } from 'https://unpkg.com/idb-keyval@3.2.0?module'
import Controls from '../controls.js'
import recorder from './recorder.js'
import header from './header.js'
import track from './track.js'
import { div } from '../dom.js'

export default async input => {
  const metaStore = new Store('meta-db')
  const controls = Controls(input)
  const tracks = []
  for (const key of await keys(metaStore)) {
    const metadata = await get(key, metaStore)
    tracks.push(
      track({
        title: metadata.title,
        duration: metadata.duration,
        ...controls.track({ key, metadata })
      })
    )
  }
  return div({
    children: [header(), recorder(controls.record()), ...tracks]
  })
}
