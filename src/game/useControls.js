import { useEffect } from 'react'
import { game, input, openPanel, closePanel } from './store.js'
import { stationById } from './world.js'

const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight',
])

const isTyping = (el) =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

/** Interact with whatever the player is standing next to. */
export function interact(id = game.get().nearby) {
  if (!id) return
  const st = stationById[id]
  if (!st) return
  if (st.kind === 'robot') {
    game.set((s) => ({ visited: s.visited.includes(id) ? s.visited : [...s.visited, id] }))
    window.dispatchEvent(new Event('open-chatbot'))
    return
  }
  openPanel(id)
}

/** Global keyboard handling while the game is mounted. */
export function useKeyboardControls() {
  useEffect(() => {
    const down = (e) => {
      if (isTyping(e.target)) return
      const s = game.get()
      if (e.code === 'Escape') {
        if (document.querySelector('.lightbox')) return // the lightbox closes itself first
        if (s.panel) closePanel()
        else if (s.phase === 'play' && !document.querySelector('.chat-panel:not([hidden])'))
          game.set({ menuOpen: !s.menuOpen })
        return
      }
      if (s.phase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault()
          game.set({ phase: 'play' })
        }
        return
      }
      if (s.panel || s.menuOpen) return
      if (e.code === 'KeyM' || e.code === 'Tab') {
        e.preventDefault()
        game.set({ menuOpen: true })
        return
      }
      if (MOVE_KEYS.has(e.code)) {
        input.keys.add(e.code)
        if (e.code.startsWith('Arrow')) e.preventDefault()
      }
      if (e.code === 'Space') {
        e.preventDefault()
        input.jumpQueued = true
      }
      if ((e.code === 'KeyE' || e.code === 'Enter') && s.nearby) {
        e.preventDefault()
        interact()
      }
    }
    const up = (e) => input.keys.delete(e.code)
    const blur = () => input.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // Clear held keys whenever a panel/menu opens so the player doesn't keep walking.
  useEffect(
    () =>
      game.subscribe(() => {
        const s = game.get()
        if (s.panel || s.menuOpen) input.keys.clear()
      }),
    [],
  )
}
