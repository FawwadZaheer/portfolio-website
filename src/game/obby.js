/**
 * The sky obby: a spiral of floating platforms around a pillar, south-west of the plaza.
 * This file holds the course layout and its runtime state. Player.jsx does the physics
 * against it, Obby.jsx draws it, GameUI.jsx shows the timer and the reward.
 *
 * Platform kinds:
 *   start, static, checkpoint, finish  solid, never move
 *   move     slides back and forth (the player rides along)
 *   crumble  shakes once stood on, drops away, comes back a few seconds later
 *   blink    switches on and off on a timer (flashes before it vanishes)
 *   sweeper  solid, with a low bar spinning across it: jump the bar or get knocked off
 */
import { game, toast } from './store.js'

/**
 * The prize picture, tried in this order. Nothing is requested until the course is beaten.
 * Drop your image into public/media/obby/ with one of these names.
 */
export const REWARD_IMAGES = ['gif', 'jpg', 'png', 'webp'].map((ext) => `/media/obby/reward.${ext}`)
/** A prize video (with its own sound) wins over the picture + tune when it exists. */
export const REWARD_VIDEOS = ['mp4', 'webm'].map((ext) => `/media/obby/reward.${ext}`)
/** The prize tune, same idea: public/media/obby/reward.mp3 (or .ogg / .m4a / .wav). */
export const REWARD_SOUNDS = ['mp3', 'ogg', 'm4a', 'wav'].map((ext) => `/media/obby/reward.${ext}`)

export const CENTER = { x: -9, z: 22 }
const RADIUS = 5.5
const BASE_Y = 6
const START_ANGLE = Math.atan2(-CENTER.x, -CENTER.z) // the side facing the plaza

// [angle step from the previous platform (rad), rise (m), kind, size [w, d], extra]
const LAYOUT = [
  [0, 0, 'start', [3.2, 3.2]],
  [0.62, 0.7, 'static', [2.2, 2.2]],
  [0.62, 0.7, 'static', [2, 2]],
  [0.66, 0.6, 'move', [2, 2], { axis: 'radial', amp: 1.3, period: 3.2 }],
  [0.66, 0.7, 'static', [1.8, 1.8]],
  [0.62, 0.5, 'crumble', [2, 2]],
  [0.62, 0.5, 'crumble', [2, 2]],
  [0.62, 0.6, 'checkpoint', [2.8, 2.8]],
  [0.66, 0.6, 'blink', [2.2, 2.2], { phase: 0 }],
  [0.62, 0.6, 'blink', [2.2, 2.2], { phase: 1.6 }],
  [0.68, 0.7, 'move', [1.8, 1.8], { axis: 'tangent', amp: 1.1, period: 2.6 }],
  [0.7, 0.5, 'sweeper', [3.4, 3.4], { speed: 1.9 }],
  [0.66, 0.8, 'static', [1.4, 1.4]],
  [0.62, 0.6, 'checkpoint', [2.8, 2.8]],
  [0.66, 0.4, 'move', [2, 2], { axis: 'up', amp: 1.2, period: 3.6 }],
  [0.66, 0.9, 'crumble', [1.8, 1.8]],
  [0.62, 0.6, 'blink', [1.8, 1.8], { phase: 0.8 }],
  [0.66, 0.7, 'static', [1.4, 1.4]],
  [0.7, 0.8, 'finish', [4.2, 4.2]],
]

const BLINK_ON = 2.2
const BLINK_OFF = 1.3
const THICK = 0.5

export const platforms = []
{
  let a = START_ANGLE
  let y = BASE_Y
  LAYOUT.forEach(([da, rise, kind, [w, d], extra = {}], i) => {
    a += da * 1.12
    y += rise
    const x = CENTER.x + Math.sin(a) * RADIUS
    const z = CENTER.z + Math.cos(a) * RADIUS
    platforms.push({
      i,
      kind,
      w,
      d,
      angle: a,
      rot: a, // local +Z points away from the pillar
      base: { x, y, z },
      ...extra,
      // runtime
      cur: { x, y, z },
      prev: { x, y, z },
      solid: true,
      warn: false,
      drop: 0, // crumble fall offset
      touchedAt: null,
      barAngle: 0,
    })
  })
}

export const startPlatform = platforms[0]
export const finishPlatform = platforms[platforms.length - 1]
export const checkpoints = platforms.filter((p) => p.kind === 'start' || p.kind === 'checkpoint')
export const PILLAR_TOP = finishPlatform.base.y + 3

/** Launch pad on the ground, right below the start platform. */
export const PAD = { x: startPlatform.base.x, z: startPlatform.base.z, r: 1.3 }

/** Walking direction (heading) along the spiral at a platform. */
export const tangentHeading = (pl) => Math.atan2(Math.cos(pl.angle), -Math.sin(pl.angle))

// ------------------------------------------------------------------ run state

const BEST_KEY = 'obby_best_ms'
function readBest() {
  try {
    const v = Number(localStorage.getItem(BEST_KEY))
    return v > 0 ? v : null
  } catch {
    return null
  }
}

/** Mutable per-frame state, read by the physics and the HUD timer. */
export const run = {
  active: false,
  checkpoint: 0, // index into platforms
  startedAt: 0, // performance.now() when launched
  falls: 0,
  respawnQueued: false,
}

export function startRun() {
  run.active = true
  run.checkpoint = 0
  run.startedAt = performance.now()
  run.falls = 0
  resetCourse()
  game.set({ obby: { ...game.get().obby, running: true, finished: false, cp: 0, time: null } })
  toast('OBBY STARTED! FALL = BACK TO LAST CHECKPOINT · R TO RESPAWN', 3600)
}

export function leaveRun() {
  run.active = false
  game.set({ obby: { ...game.get().obby, running: false } })
}

export function reachCheckpoint(i) {
  if (!run.active || i <= run.checkpoint) return false
  run.checkpoint = i
  const n = checkpoints.findIndex((c) => c.i === i)
  game.set({ obby: { ...game.get().obby, cp: n } })
  toast(`CHECKPOINT ${n}/${checkpoints.length - 1}`)
  return true
}

export function finishRun() {
  if (!run.active) return
  run.active = false
  const ms = Math.round(performance.now() - run.startedAt)
  const prevBest = readBest()
  const best = prevBest == null ? ms : Math.min(prevBest, ms)
  try {
    localStorage.setItem(BEST_KEY, String(best))
  } catch {
    /* storage unavailable */
  }
  game.set({
    obby: { running: false, finished: true, cp: 0, time: ms, best, newBest: prevBest == null || ms < prevBest, falls: run.falls },
    panel: 'obby-finish',
    menuOpen: false,
  })
}

game.set({ obby: { running: false, finished: false, cp: 0, time: null, best: readBest() } })

/** Where "Leave course" puts you: on the grass next to the pad, on the plaza side. */
export function leavePoint() {
  const dx = -PAD.x
  const dz = -PAD.z
  const d = Math.hypot(dx, dz) || 1
  const x = PAD.x + (dx / d) * 2.8
  const z = PAD.z + (dz / d) * 2.8
  return { x, z, heading: Math.atan2(dx, dz) }
}

export function formatTime(ms) {
  if (ms == null) return '--:--.-'
  const s = ms / 1000
  const m = Math.floor(s / 60)
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`
}

// ------------------------------------------------------------------ course motion

let lastT = -1

function resetCourse() {
  for (const p of platforms) {
    p.touchedAt = null
    p.drop = 0
  }
}

/** Advance moving parts to time t (seconds). Safe to call more than once per frame. */
export function updateCourse(t) {
  if (t === lastT) return
  lastT = t
  for (const p of platforms) {
    p.prev.x = p.cur.x
    p.prev.y = p.cur.y
    p.prev.z = p.cur.z
    let { x, y, z } = p.base
    if (p.kind === 'move') {
      const s = Math.sin((t / p.period) * Math.PI * 2) * p.amp
      if (p.axis === 'radial') {
        x += Math.sin(p.angle) * s
        z += Math.cos(p.angle) * s
      } else if (p.axis === 'tangent') {
        x += Math.cos(p.angle) * s
        z -= Math.sin(p.angle) * s
      } else y += s
    } else if (p.kind === 'blink') {
      const c = (t + p.phase) % (BLINK_ON + BLINK_OFF)
      p.solid = c < BLINK_ON
      p.warn = c > BLINK_ON - 0.7 && c < BLINK_ON
    } else if (p.kind === 'crumble') {
      if (p.touchedAt != null) {
        const age = t - p.touchedAt
        if (age < 0.7) {
          p.solid = true
          x += Math.sin(t * 60) * 0.05
          z += Math.cos(t * 53) * 0.05
        } else if (age < 3.2) {
          p.solid = false
          p.drop = (age - 0.7) ** 2 * 6
        } else {
          p.touchedAt = null
          p.drop = 0
          p.solid = true
        }
      } else p.solid = true
      y -= p.drop
    } else if (p.kind === 'sweeper') {
      p.barAngle = t * p.speed
    }
    p.cur.x = x
    p.cur.y = y
    p.cur.z = z
  }
}

/** Point (x, z) in a platform's local frame (rotated with the spiral). */
export function toLocal(p, x, z) {
  const dx = x - p.cur.x
  const dz = z - p.cur.z
  const c = Math.cos(-p.rot)
  const s = Math.sin(-p.rot)
  return { lx: dx * c + dz * s, lz: -dx * s + dz * c }
}

export function isOver(p, x, z, margin = 0.12) {
  const { lx, lz } = toLocal(p, x, z)
  return Math.abs(lx) <= p.w / 2 + margin && Math.abs(lz) <= p.d / 2 + margin
}

/** Is the player (feet at y) hit by this sweeper's spinning bar? */
export function barHits(p, x, y, z) {
  if (p.kind !== 'sweeper' || y - p.cur.y > 0.55 || y < p.cur.y - 0.2) return false
  const dx = x - p.cur.x
  const dz = z - p.cur.z
  const len = p.w * 0.62
  // distance from the bar's line segment through the centre
  const ux = Math.cos(p.barAngle)
  const uz = Math.sin(p.barAngle)
  const along = dx * ux + dz * uz
  if (Math.abs(along) > len || Math.abs(along) < 0.45) return false // the pivot post itself is safe
  const perp = Math.abs(-dx * uz + dz * ux)
  return perp < 0.42
}

export { THICK }
