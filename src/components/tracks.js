import { get, keys, Store } from 'https://unpkg.com/idb-keyval@3.2.0?module'
import Controls from '../controls.js'
import track from './track.js'

export default async () => {
  const metaStore = new Store('meta-db')
  const controls = Controls()
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
  return tracks
}
