// import { get, keys, Store } from 'https://unpkg.com/idb-keyval@3.2.0?module'
import { get, keys, Store } from '../idb-keyval.mjs'
import Controls from '../controls.js'
import track from './track.js'

export default async () => {
  const metaStore = new Store('meta-db')
  const controls = Controls()
  const tracks = []
  for (const key of await keys(metaStore)) {
    const metadata = await get(key, metaStore)
    const { title, duration } = metadata
    tracks.push(
      track({
        title,
        duration,
        ...controls.track({ key, metadata })
      })
    )
  }
  return tracks
}
