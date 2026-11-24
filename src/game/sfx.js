// Chiptune sound effects: small pre-rendered WAV files (public/audio/sfx/),
// played as plain <audio> elements through the game audio manager.
import { audio } from './audio.js'

const play = (name) => () => audio.sfx(name)

export const sfx = {
  blip: play('blip'),
  jump: play('jump'),
  coin: play('coin'),
  open: play('open'),
  close: play('close'),
  warp: play('warp'),
  start: play('start'),
  fanfare: play('fanfare'),
}
