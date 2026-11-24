import { useSyncExternalStore } from 'react'

/**
 * Tiny global store for the game. React UI subscribes with useGame(selector);
 * the 3D loop reads/writes `player` and `input` directly (no re-renders per frame).
 */
const listeners = new Set()

let state = {
  phase: 'title', // 'title' | 'play'
  nearby: null, // station id the player is standing next to
  panel: null, // station id whose panel is open
  menuOpen: false,
  visited: [], // station ids opened at least once
  collected: [], // collectible ids picked up
  toast: null, // { id, text }
  obby: { running: false, finished: false, cp: 0, time: null, best: null }, // see obby.js
}

export const game = {
  get: () => state,
  set(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  },
  subscribe(l) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useGame(selector) {
  return useSyncExternalStore(game.subscribe, () => selector(state))
}

/** Mutable per-frame data shared between the player, camera, minimap and stations. */
export const player = {
  position: { x: 0, y: 0, z: 8 },
  heading: Math.PI, // facing -Z (north)
  warpTo: null, // {x, z, heading} set by fast travel, consumed by the Player
}

/** Combined keyboard + touch input. */
export const input = {
  keys: new Set(),
  joy: { x: 0, y: 0 }, // touch joystick, -1..1
  jumpQueued: false,
  camYaw: Math.PI, // camera orbit (radians), changed by drag
  camYawTarget: null, // smooth camera swing (set on start / warp)
  camPitch: 0.42,
  camDist: 7.5,
}

let toastTimer
export function toast(text, ms = 2600) {
  clearTimeout(toastTimer)
  game.set({ toast: { id: Date.now(), text } })
  toastTimer = setTimeout(() => game.set({ toast: null }), ms)
}

export function openPanel(id) {
  game.set((s) => ({
    panel: id,
    menuOpen: false,
    visited: s.visited.includes(id) ? s.visited : [...s.visited, id],
  }))
}

export function closePanel() {
  game.set({ panel: null })
}
