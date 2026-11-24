// Game-mode audio, built only on plain HTML <audio>/<video> elements: the same
// playback path the browser uses when you open a media file directly. No Web Audio API.
//
// Channels
//   music     <audio loop>  /audio/music-island.(ogg|mp3)
//   ambience  <audio loop>  /audio/ambience-island.(ogg|mp3)   (louder near the shore)
//   sfx       short <audio> one-shots from /audio/sfx/*.wav
//   cabinets  each arcade screen's own <video> element, volume by distance
//
// Rule: one thing at a time. While any page video plays (game panels, promo, in-browser
// game), every game channel is paused. It all fades back in afterwards.
//
// Browsers only allow sound after the visitor clicks / presses a key, so nothing plays
// until unlock() runs inside such an event.

import { MEDIA_VERSION } from '../data.js'

const v = (url) => `${url}?v=${MEDIA_VERSION}`
const canOgg = typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="opus"') !== ''
const ext = canOgg ? 'ogg' : 'mp3'

const LEVELS = { music: 0.45, ambience: 0.6, sfx: 0.7 }
const SFX_NAMES = ['blip', 'jump', 'coin', 'open', 'close', 'warp', 'start', 'fanfare']

// ------------------------------------------------------------------ settings
function load(key, def) {
  try {
    const val = localStorage.getItem(key)
    return val === null ? def : val === '1'
  } catch {
    return def
  }
}
function save(key, val) {
  try {
    localStorage.setItem(key, val ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
}

const settings = {
  music: load('game_music', true),
  sound: load('game_sound', !load('game_muted', false)),
}
const listeners = new Set()
const notify = () => listeners.forEach((l) => l())

// ------------------------------------------------------------------ state
let unlocked = false
let music = null
let ambience = null
const sfxPool = {}
const pageMedia = new Set() // page videos currently playing with sound
const cabinets = new Map() // id -> { el, level }
const lastError = { music: null, ambience: null, sfx: null }

// smoothed mix values (0..1), advanced every frame in update()
const mix = { gate: 1, musicDuck: 1, ambDuck: 1 }
let target = { gate: 1, musicDuck: 1, ambDuck: 1 }

function makeLoop(name, key) {
  const el = new Audio()
  el.src = v(`/audio/${name}.${ext}`)
  el.loop = true
  el.preload = 'auto'
  el.volume = 0
  el.addEventListener('error', () => {
    lastError[key] = el.error ? `code ${el.error.code}` : 'unknown error'
    notify()
  })
  el.addEventListener('playing', () => {
    lastError[key] = null
    notify()
  })
  return el
}

/** Is a page video (or the in-browser game player) using the speakers right now? */
function videoActive() {
  for (const el of pageMedia) if (!el.isConnected || el.paused || el.ended || el.muted) pageMedia.delete(el)
  return pageMedia.size > 0 || document.body.classList.contains('game-player-open')
}

function shouldPlay() {
  return unlocked && !document.hidden && !videoActive()
}

function playEl(el, key) {
  if (!el || !el.paused) return
  const p = el.play()
  if (p?.catch)
    p.catch((err) => {
      lastError[key] = err?.name || 'blocked'
      notify()
    })
}

/** Start/stop the loops to follow the rules above. Cheap; called often. */
function sync() {
  if (!unlocked) return
  const on = shouldPlay()
  target.gate = on ? 1 : 0
  if (on) {
    if (settings.music) playEl(music, 'music')
    if (settings.sound) playEl(ambience, 'ambience')
  } else {
    // pause straight away so a video never competes with game audio
    mix.gate = 0
    applyVolumes()
    music?.pause()
    ambience?.pause()
    for (const c of cabinets.values()) c.el.muted = true
  }
  if (!settings.music) music?.pause()
  if (!settings.sound) ambience?.pause()
}

function applyVolumes() {
  if (music) music.volume = clamp01(LEVELS.music * mix.gate * mix.musicDuck * (settings.music ? 1 : 0))
  if (ambience) ambience.volume = clamp01(LEVELS.ambience * mix.gate * mix.ambDuck * (settings.sound ? 1 : 0))
  for (const c of cabinets.values()) {
    const vol = clamp01(c.level * 0.9 * mix.gate * (settings.sound ? 1 : 0))
    c.el.volume = vol
    c.el.muted = vol < 0.01
  }
}

const clamp01 = (x) => Math.max(0, Math.min(1, x))

// page-wide listeners (installed once)
let listening = false
function listen() {
  if (listening) return
  listening = true
  const isPageMedia = (el) => el instanceof HTMLMediaElement && el !== music && el !== ambience && el.isConnected
  const onPlay = (e) => {
    if (isPageMedia(e.target) && !e.target.muted) {
      pageMedia.add(e.target)
      sync()
    }
  }
  const onStop = (e) => {
    pageMedia.delete(e.target)
    sync()
  }
  document.addEventListener('play', onPlay, true)
  document.addEventListener('playing', onPlay, true)
  document.addEventListener('volumechange', (e) => (e.target.muted ? onStop(e) : !e.target.paused && onPlay(e)), true)
  for (const ev of ['pause', 'ended', 'emptied']) document.addEventListener(ev, onStop, true)
  document.addEventListener('visibilitychange', sync)
}

// ------------------------------------------------------------------ public API
export const audio = {
  get settings() {
    return settings
  },
  get unlocked() {
    return unlocked
  },

  /** Must run inside a click / key handler (browser autoplay rules). Safe to call often. */
  unlock() {
    listen()
    if (!music) {
      music = makeLoop('music-island', 'music')
      ambience = makeLoop('ambience-island', 'ambience')
      for (const name of SFX_NAMES) {
        const el = new Audio(v(`/audio/sfx/${name}.wav`))
        el.preload = 'auto'
        sfxPool[name] = [el]
      }
    }
    if (!unlocked) {
      unlocked = true
      mix.gate = 0 // fade in from silence
      notify()
    }
    sync()
  },

  /** Play a short sound effect (silent while a video plays or Sound is off). */
  sfx(name) {
    if (!unlocked || !settings.sound || !shouldPlay()) return
    const pool = sfxPool[name]
    if (!pool) return
    let el = pool.find((a) => a.paused || a.ended)
    if (!el) {
      if (pool.length >= 4) return
      el = pool[0].cloneNode()
      pool.push(el)
    }
    el.volume = LEVELS.sfx
    el.currentTime = 0
    const p = el.play()
    if (p?.catch) p.catch((err) => (lastError.sfx = err?.name || 'blocked'))
  },

  setMusic(on) {
    settings.music = on
    save('game_music', on)
    sync()
    notify()
  },
  setSound(on) {
    settings.sound = on
    save('game_sound', on)
    save('game_muted', !on)
    sync()
    notify()
  },
  subscribe(l) {
    listeners.add(l)
    return () => listeners.delete(l)
  },

  /** Arcade cabinets hand over their <video> and a 0..1 loudness from the player's distance. */
  setCabinet(id, el, level) {
    if (!el) {
      cabinets.delete(id)
      return
    }
    cabinets.set(id, { el, level })
  },

  /**
   * Called every frame by the player.
   * overlay: a panel or the menu is open.  shore: 0 at the island centre .. 1 at the beach.
   */
  update({ overlay, shore }, dt = 1 / 60) {
    if (!unlocked) return
    sync() // also catches videos removed from the page while playing
    let cab = 0
    for (const c of cabinets.values()) cab = Math.max(cab, c.level)
    target.musicDuck = (overlay ? 0.55 : 1) * (1 - 0.65 * cab)
    target.ambDuck = (overlay ? 0.6 : 1) * (0.35 + 0.65 * shore)
    // smooth towards targets (gate fades in over ~1 s)
    const k = (rate) => 1 - Math.exp(-rate * Math.min(dt, 0.1))
    mix.gate += (target.gate - mix.gate) * k(target.gate > mix.gate ? 2.5 : 20)
    mix.musicDuck += (target.musicDuck - mix.musicDuck) * k(3)
    mix.ambDuck += (target.ambDuck - mix.ambDuck) * k(3)
    applyVolumes()
  },

  /** What this browser can decode (for the Sound check panel). */
  codecs() {
    const vid = document.createElement('video')
    const can = (t) => vid.canPlayType(t) !== ''
    const ua = navigator.userAgent
    const browser =
      (navigator.userAgentData?.brands || [])
        .map((b) => b.brand)
        .find((b) => !/not.?a.?brand|chromium/i.test(b)) ||
      (/Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Electron\//.test(ua) ? 'Electron app' : /Chrome\//.test(ua) ? 'Chromium-based' : /Safari\//.test(ua) ? 'Safari' : 'Unknown')
    return {
      browser: /Electron\//.test(ua) ? `${browser} (built-in app browser)` : browser,
      aac: can('video/mp4; codecs="avc1.64001f, mp4a.40.2"'),
      mp3: can('video/mp4; codecs="avc1.64001f, mp4a.6B"') || can('audio/mpeg'),
      h264: can('video/mp4; codecs="avc1.64001f"'),
    }
  },

  /** Snapshot for the Sound check panel. */
  report() {
    const state = (el) => (!el ? 'not loaded' : el.error ? `error (code ${el.error.code})` : el.paused ? 'paused' : 'playing')
    return {
      unlocked,
      format: ext.toUpperCase(),
      music: settings.music ? state(music) : 'off',
      ambience: settings.sound ? state(ambience) : 'off',
      musicVolume: music ? Math.round(music.volume * 100) : 0,
      videosPlaying: pageMedia.size,
      cabinet: Math.round(Math.max(0, ...[...cabinets.values()].map((c) => (c.el.muted || c.el.paused ? 0 : c.el.volume))) * 100),
      errors: Object.entries(lastError)
        .filter(([, e]) => e)
        .map(([k, e]) => `${k}: ${e}`),
    }
  },
}
