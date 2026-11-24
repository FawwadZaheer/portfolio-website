import { useEffect, useRef, useState } from 'react'
import { game, useGame, input, player, closePanel, openPanel } from './store.js'
import { stations, stationById, collectibles, ISLAND_RADIUS } from './world.js'
import { interact } from './useControls.js'
import { sfx } from './sfx.js'
import { audio } from './audio.js'
import { GameDetail } from '../components/Games.jsx'
import { ModelCard } from '../components/Models.jsx'
import Experience from '../components/Experience.jsx'
import About from '../components/About.jsx'
import Contact from '../components/Contact.jsx'
import PromoVideo from '../components/PromoVideo.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { profile, about } from '../data.js'
import { useTypewriter } from '../hooks.js'
import ErrorBoundary from '../components/ErrorBoundary.jsx'
import { ObbyHud, ObbyFinish, useObbyKeys } from './ObbyUI.jsx'
import { PAD } from './obby.js'

const QUEST_TOTAL = stations.length
const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

function verb(st) {
  return { arcade: 'Play', frame: 'Inspect', academy: 'Enter', signboard: 'Read', mailbox: 'Open', tv: 'Watch', robot: 'Talk to', billboard: 'Read' }[st.kind]
}

// ------------------------------------------------------------------ title

function TitleScreen({ onClassic }) {
  const typed = useTypewriter(profile.tagline)
  const start = () => {
    audio.unlock()
    sfx.start()
    input.camYawTarget = 0
    game.set({ phase: 'play' })
  }
  return (
    <div className="title-screen">
      <div className="title-card">
        <p className="title-kicker">A PORTFOLIO ADVENTURE</p>
        <h1 aria-label={profile.name}>
          {profile.nameLines.map((l) => (
            <span key={l} aria-hidden="true">
              {l}
            </span>
          ))}
        </h1>
        <p className="tagline">
          {typed}
          <span className="cursor" />
        </p>
        <button type="button" className="btn primary press-start" onClick={start} autoFocus>
          ▶ PRESS START
        </button>
        <p className="title-help">
          {isTouch() ? 'Joystick to move · A to interact · B to jump' : 'WASD / arrows to move · Space jump · E interact · Shift run · M menu'}
        </p>
        <button type="button" className="linklike" onClick={onClassic}>
          Skip the game → classic portfolio
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ panels

function Welcome() {
  return (
    <div className="welcome-panel">
      <img src="/media/fawwad-portrait.jpg" alt={profile.name} className="welcome-portrait" />
      <div>
        <h3>Hi, I&apos;m {profile.name.split(' ')[0]}.</h3>
        <p>{profile.tagline}</p>
        {about.slice(0, 2).map((t) => (
          <p key={t}>{t}</p>
        ))}
        <h4>How to explore</h4>
        <ul className="bullets">
          <li>North: the <strong>Games Arcade</strong>, one cabinet per game.</li>
          <li>East: the <strong>3D Model Gallery</strong> of my Blender work.</li>
          <li>West: the <strong>Academy</strong> for education and certifications.</li>
          <li>Find the <strong>Promo TV</strong>, the <strong>About</strong> sign, the <strong>Mailbox</strong> and <strong>FZR-BOT</strong>.</li>
          <li>Bonus: collect all {collectibles.length} floating cartridges.</li>
        </ul>
        <p className="note">Press M (or the Menu button) at any time to warp straight to a station.</p>
      </div>
    </div>
  )
}

function PanelBody({ st }) {
  if (st.kind === 'arcade') return <GameDetail game={st.data} />
  if (st.kind === 'frame') return <ModelCard model={st.data} />
  if (st.id === 'education') return <Experience />
  if (st.id === 'about') return <About />
  if (st.id === 'contact') return <Contact />
  return <Welcome />
}

function Panel({ id }) {
  const st = stationById[id]
  const closeRef = useRef(null)
  const siblings = stations.filter((s) => s.kind === st.kind)
  const idx = siblings.indexOf(st)

  useEffect(() => {
    sfx.open()
    closeRef.current?.focus()
    return () => sfx.close()
  }, [])

  if (st.kind === 'tv') return <PromoVideo onClose={closePanel} />

  const go = (d) => openPanel(siblings[(idx + d + siblings.length) % siblings.length].id)

  return (
    <div className="game-panel-backdrop" onClick={closePanel}>
      <div
        className="game-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-panel-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (siblings.length > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.tagName !== 'INPUT') {
            go(e.key === 'ArrowRight' ? 1 : -1)
          }
        }}
      >
        <header className="game-panel-head">
          <span id="game-panel-title">
            {st.zone ? `${st.zone.toUpperCase()} // ` : ''}
            {st.title.toUpperCase()}
          </span>
          <button ref={closeRef} type="button" className="video-close-btn" onClick={closePanel}>
            ✕ CLOSE
          </button>
        </header>
        <div className="game-panel-body">
          <PanelBody st={st} />
        </div>
        {siblings.length > 1 && (
          <footer className="game-panel-foot">
            <button type="button" className="btn" onClick={() => go(-1)}>
              ◀ PREV
            </button>
            <span>
              {idx + 1} / {siblings.length}
            </span>
            <button type="button" className="btn" onClick={() => go(1)}>
              NEXT ▶
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ menu

function warp(st) {
  // stand on the interaction spot, facing the station
  player.warpTo = { x: st.ix, z: st.iz, heading: st.facing + Math.PI }
  game.set({ menuOpen: false })
}

function Menu({ onClassic }) {
  const visited = useGame((s) => s.visited)
  const snd = useAudioSettings()
  const groups = [
    ['Start', stations.filter((s) => s.kind === 'billboard')],
    ['Games Arcade', stations.filter((s) => s.kind === 'arcade')],
    ['3D Model Gallery', stations.filter((s) => s.kind === 'frame')],
    ['Around the island', stations.filter((s) => !['billboard', 'arcade', 'frame'].includes(s.kind))],
  ]
  const firstRef = useRef(null)
  useEffect(() => firstRef.current?.focus(), [])
  return (
    <div className="game-panel-backdrop" onClick={() => game.set({ menuOpen: false })}>
      <div className="game-panel menu" role="dialog" aria-modal="true" aria-label="Pause menu" onClick={(e) => e.stopPropagation()}>
        <header className="game-panel-head">
          <span>PAUSED // WORLD MAP</span>
          <button ref={firstRef} type="button" className="video-close-btn" onClick={() => game.set({ menuOpen: false })}>
            ▶ RESUME
          </button>
        </header>
        <div className="game-panel-body">
          <p className="hint">Warp to a station, or open it straight from here.</p>
          {groups.map(([name, list]) => (
            <div key={name} className="menu-group">
              <h4>{name}</h4>
              <ul>
                {list.map((st) => (
                  <li key={st.id}>
                    <span className="menu-check" aria-label={visited.includes(st.id) ? 'visited' : 'not visited'}>
                      {visited.includes(st.id) ? '✓' : '·'}
                    </span>
                    <span className="menu-name">{st.label}</span>
                    <button type="button" className="mini-btn" onClick={() => warp(st)}>
                      WARP
                    </button>
                    <button type="button" className="mini-btn dark" onClick={() => interact(st.id)}>
                      OPEN
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="menu-group">
            <h4>Controls</h4>
            <p className="note">
              WASD / arrow keys move · Shift run · Space jump · E or Enter interact · drag to turn the camera · scroll to zoom ·
              M menu · Esc close.
            </p>
          </div>
          <SoundCheck />
          <div className="menu-actions">
            <button type="button" className="btn" aria-pressed={snd.music} onClick={() => audio.setMusic(!snd.music)}>
              {snd.music ? '♪ MUSIC ON' : '♪ MUSIC OFF'}
            </button>
            <button type="button" className="btn" aria-pressed={snd.sound} onClick={() => audio.setSound(!snd.sound)}>
              {snd.sound ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
            </button>
            <button type="button" className="btn" onClick={onClassic}>
              CLASSIC SITE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ HUD pieces

function useAudioSettings() {
  const [, force] = useState(0)
  useEffect(() => audio.subscribe(() => force((n) => n + 1)), [])
  return { ...audio.settings }
}

/** Live view of what the browser reports about game audio, plus a test sound. */
function SoundCheck() {
  // Defensive: a missing helper (e.g. an older audio.js) must never take the whole menu down.
  const report = () => (typeof audio.report === 'function' ? audio.report() : { errors: [] })
  const [r, setR] = useState(report)
  const [codecs] = useState(() => (typeof audio.codecs === 'function' ? audio.codecs() : {}))
  useEffect(() => {
    const id = setInterval(() => setR(report()), 500)
    return () => clearInterval(id)
  }, [])
  const sw = window.__removedServiceWorkers
  return (
    <div className="menu-group sound-check">
      <h4>Sound check</h4>
      <ul>
        <li>
          <span className="menu-name">Music</span>
          <span>
            {r.music}
            {r.music === 'playing' ? ` · ${r.musicVolume}%` : ''}
          </span>
        </li>
        <li>
          <span className="menu-name">Ambience</span>
          <span>{r.ambience}</span>
        </li>
        <li>
          <span className="menu-name">Audio format</span>
          <span>{r.format}</span>
        </li>
        <li>
          <span className="menu-name">Browser</span>
          <span>{codecs.browser}</span>
        </li>
        <li>
          <span className="menu-name">Video sound (MP3 track, used here)</span>
          <span>{codecs.mp3 ? 'supported' : 'NOT supported'}</span>
        </li>
        <li>
          <span className="menu-name">Video sound (AAC track)</span>
          <span>{codecs.aac ? 'supported' : 'not supported'}</span>
        </li>
        {sw ? (
          <li>
            <span className="menu-name">Old service workers removed</span>
            <span>{sw} (reload once)</span>
          </li>
        ) : null}
        {(r.errors || []).map((e) => (
          <li key={e}>
            <span className="menu-name">Error</span>
            <span>{e}</span>
          </li>
        ))}
      </ul>
      <p className="note">
        Game music and ambience pause automatically while any video is playing.
      </p>
      <button
        type="button"
        className="mini-btn dark"
        onClick={() => {
          audio.unlock()
          audio.sfx('coin')
        }}
      >
        ▶ PLAY TEST SOUND
      </button>
    </div>
  )
}

function MusicButton() {
  const snd = useAudioSettings()
  const on = snd.music || snd.sound
  return (
    <button
      type="button"
      className="theme-toggle-btn"
      aria-label={on ? 'Mute music and sound' : 'Unmute music and sound'}
      title="Music & sound"
      onClick={() => {
        audio.unlock()
        audio.setMusic(!on)
        audio.setSound(!on)
      }}
    >
      {on ? '♪ ON' : '♪ OFF'}
    </button>
  )
}

function Minimap() {
  const ref = useRef(null)
  useEffect(() => {
    let raf
    const c = ref.current.getContext('2d')
    const S = ref.current.width
    const scale = (S / 2 - 6) / ISLAND_RADIUS
    const css = getComputedStyle(document.documentElement)
    const draw = () => {
      const col = (n) => css.getPropertyValue(n).trim()
      const st = game.get()
      c.clearRect(0, 0, S, S)
      c.fillStyle = col('--light')
      c.beginPath()
      c.arc(S / 2, S / 2, ISLAND_RADIUS * scale, 0, Math.PI * 2)
      c.fill()
      for (const s of stations) {
        c.fillStyle = st.visited.includes(s.id) ? col('--dark') : col('--darkest')
        const x = S / 2 + s.x * scale
        const y = S / 2 + s.z * scale
        c.fillRect(x - 3, y - 3, 6, 6)
      }
      // obby launch pad
      c.strokeStyle = col('--darkest')
      c.lineWidth = 2
      c.beginPath()
      c.arc(S / 2 + PAD.x * scale, S / 2 + PAD.z * scale, 4.5, 0, Math.PI * 2)
      c.stroke()
      c.fillStyle = col('--lightest')
      for (const k of collectibles) {
        if (st.collected.includes(k.id)) continue
        c.fillRect(S / 2 + k.x * scale - 1.5, S / 2 + k.z * scale - 1.5, 3, 3)
      }
      // player arrow
      const px = S / 2 + player.position.x * scale
      const py = S / 2 + player.position.z * scale
      c.save()
      c.translate(px, py)
      c.rotate(-player.heading + Math.PI)
      c.fillStyle = col('--lightest')
      c.strokeStyle = col('--darkest')
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(0, -7)
      c.lineTo(5, 5)
      c.lineTo(-5, 5)
      c.closePath()
      c.fill()
      c.stroke()
      c.restore()
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} width={132} height={132} className="minimap" aria-hidden="true" />
}

function Joystick() {
  const base = useRef(null)
  const knob = useRef(null)
  const active = useRef(null)
  const R = 46
  const move = (e) => {
    if (active.current !== e.pointerId) return
    const r = base.current.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(dx, dy)
    if (d > R) {
      dx *= R / d
      dy *= R / d
    }
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    input.joy.x = dx / R
    input.joy.y = dy / R
  }
  const end = (e) => {
    if (active.current !== e.pointerId) return
    active.current = null
    knob.current.style.transform = ''
    input.joy.x = 0
    input.joy.y = 0
  }
  return (
    <div
      ref={base}
      className="joystick"
      onPointerDown={(e) => {
        active.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      aria-hidden="true"
    >
      <div ref={knob} className="joystick-knob" />
    </div>
  )
}

function Prompt() {
  const nearby = useGame((s) => s.nearby)
  const blocked = useGame((s) => !!s.panel || s.menuOpen)
  if (!nearby || blocked) return null
  const st = stationById[nearby]
  return (
    <button type="button" className="interact-prompt" onClick={() => interact()}>
      <kbd>{isTouch() ? 'A' : 'E'}</kbd> {verb(st)} <strong>{st.label}</strong>
    </button>
  )
}

function Toast() {
  const t = useGame((s) => s.toast)
  if (!t) return null
  return (
    <div key={t.id} className="game-toast" role="status">
      {t.text}
    </div>
  )
}

// ------------------------------------------------------------------ root

export default function GameUI({ onClassic, loaded }) {
  const phase = useGame((s) => s.phase)
  const panel = useGame((s) => s.panel)
  const menuOpen = useGame((s) => s.menuOpen)
  const visited = useGame((s) => s.visited.length)
  const carts = useGame((s) => s.collected.length)
  const nearby = useGame((s) => s.nearby)
  const [touch] = useState(isTouch)
  const [showHelp, setShowHelp] = useState(true)
  useObbyKeys()

  useEffect(() => {
    if (phase !== 'play') return undefined
    const id = setTimeout(() => setShowHelp(false), 14000)
    return () => clearTimeout(id)
  }, [phase])

  useEffect(() => {
    document.body.classList.toggle('game-title', phase === 'title')
    return () => document.body.classList.remove('game-title')
  }, [phase])

  useEffect(() => {
    document.body.classList.toggle('game-panel-open', !!panel || menuOpen)
    return () => document.body.classList.remove('game-panel-open')
  }, [panel, menuOpen])

  // Celebrate full exploration once
  const celebrated = useRef(false)
  useEffect(() => {
    if (visited === QUEST_TOTAL && !celebrated.current) {
      celebrated.current = true
      sfx.fanfare()
      game.set({ toast: { id: Date.now(), text: '★ EVERY STATION DISCOVERED! THANKS FOR PLAYING ★' } })
      setTimeout(() => game.set({ toast: null }), 4500)
    }
  }, [visited])

  return (
    <>
      {phase === 'title' && loaded && <TitleScreen onClassic={onClassic} />}

      {phase === 'play' && (
        <div className="hud">
          <div className="hud-top">
            <div className="hud-stats">
              <span className="hud-logo">FZR</span>
              <span title="Stations discovered">
                ◆ {visited}/{QUEST_TOTAL}
              </span>
              <span title="Cartridges collected">
                ▣ {carts}/{collectibles.length}
              </span>
            </div>
            <div className="hud-buttons">
              <MusicButton />
              <ThemeToggle />
              <button type="button" className="theme-toggle-btn" onClick={() => game.set({ menuOpen: true })}>
                ☰ MENU
              </button>
              <button type="button" className="theme-toggle-btn hide-sm" onClick={onClassic}>
                CLASSIC SITE
              </button>
            </div>
          </div>

          {!touch && <Minimap />}
          {!touch && showHelp && (
            <p className="hud-help">WASD move · Shift run · Space jump · E interact · drag to look · M menu</p>
          )}

          <Prompt />
          <ObbyHud touch={touch} />

          {touch && (
            <>
              <Joystick />
              <div className="touch-buttons">
                <button
                  type="button"
                  className="touch-btn"
                  aria-label="Interact"
                  disabled={!nearby}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    interact()
                  }}
                >
                  A
                </button>
                <button
                  type="button"
                  className="touch-btn"
                  aria-label="Jump"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    input.jumpQueued = true
                  }}
                >
                  B
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <Toast />
      {panel && (
        <ErrorBoundary key={panel} name="panel" onReset={closePanel}>
          {panel === 'obby-finish' ? <ObbyFinish /> : <Panel id={panel} />}
        </ErrorBoundary>
      )}
      {menuOpen && (
        <ErrorBoundary name="menu" onReset={() => game.set({ menuOpen: false })}>
          <Menu onClassic={onClassic} />
        </ErrorBoundary>
      )}
    </>
  )
}
