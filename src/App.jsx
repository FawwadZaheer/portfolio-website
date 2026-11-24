import { lazy, Suspense, useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Games from './components/Games.jsx'
import Models from './components/Models.jsx'
import Experience from './components/Experience.jsx'
import About from './components/About.jsx'
import Contact from './components/Contact.jsx'
import Chatbot from './components/Chatbot.jsx'
import { profile, socials } from './data.js'
import { useReveal } from './hooks.js'

// The game is code-split so the classic site stays light.
const PortfolioGame = lazy(() => import('./game/PortfolioGame.jsx'))

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

function initialView() {
  if (!hasWebGL()) return 'classic'
  const q = new URLSearchParams(window.location.search).get('view')
  if (q === 'classic' || q === 'game') return q
  try {
    return localStorage.getItem('portfolio_view') || 'game'
  } catch {
    return 'game'
  }
}

export default function App() {
  const [view, setView] = useState(initialView)

  useEffect(() => {
    try {
      localStorage.setItem('portfolio_view', view)
    } catch {
      /* storage unavailable */
    }
    if (view === 'classic') window.scrollTo(0, 0)
  }, [view])

  if (view === 'game') {
    return (
      <>
        <Suspense
          fallback={
            <div className="game-loader" role="status">
              <div className="retro-spinner" aria-hidden="true" />
              <p>BOOTING…</p>
            </div>
          }
        >
          <PortfolioGame onClassic={() => setView('classic')} />
        </Suspense>
        <Chatbot />
      </>
    )
  }

  return <ClassicSite onPlay={hasWebGL() ? () => setView('game') : undefined} />
}

function ClassicSite({ onPlay }) {
  useReveal()
  return (
    <>
      <a className="skip-link" href="#top">
        Skip to content
      </a>
      <Header onPlay={onPlay} />
      <div className="wrap">
        <main id="top">
          <Hero />
          <div className="reveal">
            <Games />
          </div>
          <div className="reveal">
            <Models />
          </div>
          <div className="reveal">
            <Experience />
          </div>
          <div className="reveal">
            <About />
          </div>
          <div className="reveal">
            <Contact />
          </div>
        </main>
      </div>
      <footer className="footer">
        <div className="wrap footer-inner">
          <div>
            <p className="footer-name">{profile.name}</p>
            <p className="footer-meta">Game developer. Built with React, three.js and Blender.</p>
          </div>
          <ul className="footer-links">
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${profile.email}`}>Email</a>
            </li>
            {onPlay && (
              <li>
                <button type="button" className="linklike" onClick={onPlay}>
                  Game mode
                </button>
              </li>
            )}
          </ul>
          <a className="btn back-top" href="#top">
            ▲ Top
          </a>
        </div>
        <p className="wrap footer-copy">
          © {new Date().getFullYear()} {profile.name}. Fonts: Press Start 2P and IBM Plex Mono (SIL OFL).
        </p>
      </footer>
      <Chatbot />
    </>
  )
}
