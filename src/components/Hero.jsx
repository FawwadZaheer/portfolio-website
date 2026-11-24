import { lazy, Suspense, useState } from 'react'
import { profile, games, models, achievements } from '../data.js'
import { useTypewriter } from '../hooks.js'
import PromoVideo from './PromoVideo.jsx'

// three.js and the avatar viewer load in their own chunk, so the text above paints first.
const Canvas3D = lazy(() => import('./Canvas3D.jsx'))

const engines = [...new Set(games.map((g) => g.engine))]
const latest = games[games.length - 1]

const STATS = [
  { value: games.length, label: games.length === 1 ? 'Game' : 'Games', href: '#games' },
  { value: models.length, label: '3D models', href: '#models' },
  { value: engines.length, label: engines.length === 1 ? 'Engine' : 'Engines', href: '#about' },
  { value: achievements.length, label: achievements.length === 1 ? 'Cert' : 'Certs', href: '#experience' },
]

function ViewportPlaceholder() {
  return (
    <div className="hero-canvas-wrap" id="avatar">
      <div className="canvas-header">
        <span>● 3D AVATAR</span>
      </div>
      <div className="canvas-body">
        <div className="canvas-fallback" role="status">
          <div className="retro-spinner" aria-hidden="true" />
          <p className="fallback-text">LOADING 3D VIEWPORT…</p>
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  const [showVideo, setShowVideo] = useState(false)
  const typed = useTypewriter(profile.tagline)

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-layout">
        <div className="hero-content">
          <p className="hero-kicker">
            <span className="blink-dot" aria-hidden="true" /> PLAYER 1 // GAME DEVELOPER
          </p>
          <h1 id="hero-title" aria-label={profile.name}>
            {profile.nameLines.map((line) => (
              <span key={line} aria-hidden="true">
                {line}
              </span>
            ))}
          </h1>

          <p className="tagline">
            <span className="sr-only">{profile.tagline}</span>
            <span aria-hidden="true">
              {typed}
              <span className="cursor" />
            </span>
          </p>

          <div className="actions">
            <a className="btn primary" href="#games">
              ▶ Press start
            </a>
            <button type="button" className="btn promo-btn" onClick={() => setShowVideo(true)}>
              ▶ Watch tape (44s)
            </button>
          </div>
          <p className="hero-links">
            <a href="#experience">Education</a>
            <span aria-hidden="true">·</span>
            <a href="#contact">Email me</a>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className="linklike"
              onClick={() => window.dispatchEvent(new Event('open-chatbot'))}
            >
              Ask the bot
            </button>
          </p>

          <ul className="hud-row" aria-label="At a glance">
            {STATS.map((s) => (
              <li key={s.label}>
                <a href={s.href}>
                  <strong>{String(s.value).padStart(2, '0')}</strong>
                  <span>{s.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {latest && (
            <a
              className="latest-chip"
              href="#games"
              onClick={() => window.dispatchEvent(new CustomEvent('select-game', { detail: latest.id }))}
            >
              <span className="latest-tag">NEW</span>
              <span>
                Latest: <strong>{latest.title}</strong>, {latest.kind}
              </span>
              <span aria-hidden="true">→</span>
            </a>
          )}
        </div>

        <div className="hero-3d">
          <Suspense fallback={<ViewportPlaceholder />}>
            <Canvas3D />
          </Suspense>
        </div>
      </div>

      {showVideo && <PromoVideo onClose={() => setShowVideo(false)} />}
    </section>
  )
}
