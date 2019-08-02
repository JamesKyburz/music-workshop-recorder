import Controls from '../controls.js'
import recorder from './recorder.js'
import header from './header.js'
import tracks from './tracks.js'
import { div } from '../dom.js'

export default async input =>
  div([header(), recorder(Controls(input).record()), ...(await tracks())])
