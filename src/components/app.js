import Controls from '../controls.js'
import recorder from './recorder.js'
import tracks from './tracks.js'
import { div } from '../dom.js'

export default async input =>
  div([await tracks(), recorder(Controls(input).record())])
