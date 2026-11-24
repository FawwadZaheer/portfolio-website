import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import Player from './Player.jsx'
import World from './World.jsx'
import Stations from './Stations.jsx'
import Obby from './Obby.jsx'
import GameUI from './GameUI.jsx'
import { usePalette } from './useTheme.js'
import { useKeyboardControls } from './useControls.js'
import { game, input, openPanel, player } from './store.js'
import { games, models } from '../data.js'
import { audio } from './audio.js'
import { run as obbyRun, platforms as obbyPlatforms } from './obby.js'

// Chatbot source links point at classic-site anchors; open the matching station instead.
const ANCHOR_TO_STATION = {
  '#top': 'welcome',
  '#about': 'about',
  '#games': `game:${games[0].id}`,
  '#models': `model:${models[0].id}`,
  '#experience': 'education',
  '#contact': 'contact',
}

function Loader({ onDone }) {
  const { progress, active } = useProgress()
  useEffect(() => {
    if (!active && progress >= 100) onDone()
  }, [active, progress, onDone])
  if (!active && progress >= 100) return null
  return (
    <div className="game-loader" role="status" aria-live="polite">
      <div className="retro-spinner" aria-hidden="true" />
      <p>LOADING WORLD… {Math.round(progress)}%</p>
      <div className="loader-bar">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

/** Drag anywhere on the 3D view to orbit the camera, scroll / pinch to zoom. */
function useCameraDrag(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const pointers = new Map()
    let pinch = 0
    const down = (e) => {
      if (e.target.tagName !== 'CANVAS') return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const move = (e) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch) input.camDist = Math.min(13, Math.max(3.5, input.camDist - (d - pinch) * 0.03))
        pinch = d
      } else if (game.get().phase === 'play') {
        input.camYawTarget = null
        input.camYaw -= (e.clientX - prev.x) * 0.006
        input.camPitch = Math.min(1.1, Math.max(0.08, input.camPitch + (e.clientY - prev.y) * 0.004))
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const up = (e) => {
      pointers.delete(e.pointerId)
      pinch = 0
    }
    const wheel = (e) => {
      if (game.get().phase !== 'play') return
      e.preventDefault()
      input.camDist = Math.min(13, Math.max(3.5, input.camDist + e.deltaY * 0.01))
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [ref])
}

export default function PortfolioGame({ onClassic }) {
  const palette = usePalette()
  const wrap = useRef(null)
  const [loaded, setLoaded] = useState(false)
  useKeyboardControls()
  useCameraDrag(wrap)

  useEffect(() => {
    const onHash = () => {
      const id = ANCHOR_TO_STATION[window.location.hash]
      if (!id) return
      if (game.get().phase === 'title') game.set({ phase: 'play' })
      openPanel(id)
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV) window.__game = { game, player, audio, obby: { run: obbyRun, platforms: obbyPlatforms } }
  }, [])

  // Browsers block sound until the visitor interacts: start music on the first click / key.
  useEffect(() => {
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    document.body.classList.add('game-mode')
    return () => document.body.classList.remove('game-mode')
  }, [])

  return (
    <div className="game-root" ref={wrap}>
      <h1 className="sr-only">Fawwad Zaheer Rizvi, game developer: interactive 3D portfolio</h1>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 50, near: 0.3, far: 260, position: [0, 2.1, 3.9] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <World p={palette} />
          <Stations p={palette} />
          <Obby p={palette} />
          <Player />
        </Suspense>
      </Canvas>
      <Loader onDone={() => setLoaded(true)} />
      <GameUI onClassic={onClassic} loaded={loaded} />
    </div>
  )
}
