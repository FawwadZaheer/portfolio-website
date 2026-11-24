import { useEffect, useRef, useState, useMemo } from 'react'
import { games } from '../data.js'
import Lightbox from './Lightbox.jsx'

const ENGINES = ['All', 'Unity', 'Unreal Engine 5']

/** Small copy of a screenshot for the thumbnail strip; the lightbox still opens the full size. */
const thumbOf = (src) => src.replace(/\.webp(\?|$)/, '-thumb.webp$1')

/** Full-screen player for a WebGL build (Unity WebGL export dropped into public/games/<id>/). */
function GamePlayer({ game, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    document.body.classList.add('game-player-open')
    return () => document.body.classList.remove('game-player-open')
  }, [])
  return (
    <div className="game-player" role="dialog" aria-modal="true" aria-label={`Playing ${game.title}`}>
      <header className="game-panel-head">
        <span>▶ NOW PLAYING // {game.title.toUpperCase()}</span>
        <button ref={closeRef} type="button" className="video-close-btn" onClick={onClose}>
          ✕ EXIT GAME
        </button>
      </header>
      <iframe
        src={game.play}
        title={`${game.title} (playable)`}
        allow="autoplay; fullscreen; gamepad"
        allowFullScreen
      />
      {game.controls && <p className="game-player-controls">Controls: {game.controls}</p>}
    </div>
  )
}

/** One game's video, screenshots and write-up. Also used inside the game-world arcade panels. */
export function GameDetail({ game, onZoom }) {
  const [localZoom, setLocalZoom] = useState(null)
  const [playing, setPlaying] = useState(false)
  const zoomTo = onZoom || setLocalZoom
  return (
    <>
      <article className="preview" key={game.id} aria-live="polite">
        <video
          className="video"
          src={game.video}
          poster={game.poster}
          controls
          playsInline
          preload="metadata"
          aria-label={`${game.title} gameplay video`}
        />

        <div className="shots">
          {game.shots.map((src, i) => (
            <button
              key={src}
              type="button"
              className="thumb"
              onClick={() => zoomTo({ src, alt: `${game.title} screenshot ${i + 1}` })}
              aria-label={`Enlarge ${game.title} screenshot ${i + 1}`}
            >
              <img src={thumbOf(src)} alt="" loading="lazy" width="560" height="315" />
            </button>
          ))}
        </div>

        <div className="preview-body">
          <h3>{game.title}</h3>
          <p>{game.summary}</p>

          <h4>What I did</h4>
          <ul className="bullets">
            {game.role.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {game.team && <p className="note">{game.team}</p>}
          {game.controls && (
            <p className="note">
              <strong>Controls:</strong> {game.controls}
            </p>
          )}

          {(game.play || game.download) && (
            <div className="play-row">
              {game.play && (
                <button type="button" className="btn primary" onClick={() => setPlaying(true)}>
                  ▶ INSERT COIN: PLAY IN BROWSER
                </button>
              )}
              {game.download && (
                <a className="btn" href={game.download.href} download>
                  ▼ {game.download.label}
                </a>
              )}
            </div>
          )}

          <ul className="tags">
            {game.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>

          {game.links && game.links.length > 0 && (
            <div className="links">
              {game.links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </article>
      {localZoom && <Lightbox src={localZoom.src} alt={localZoom.alt} onClose={() => setLocalZoom(null)} />}
      {playing && <GamePlayer game={game} onClose={() => setPlaying(false)} />}
    </>
  )
}

export default function Games() {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(null)
  const [engineFilter, setEngineFilter] = useState('All')
  const [search, setSearch] = useState('')
  const buttons = useRef([])

  // The hero's "latest release" link asks for a particular game.
  useEffect(() => {
    function onSelect(e) {
      const i = games.findIndex((g) => g.id === e.detail)
      if (i < 0) return
      setEngineFilter('All')
      setSearch('')
      setActive(i)
    }
    window.addEventListener('select-game', onSelect)
    return () => window.removeEventListener('select-game', onSelect)
  }, [])

  const filtered = useMemo(() => {
    return games.filter((g) => {
      const matchEngine = engineFilter === 'All' || g.engine.toLowerCase().includes(engineFilter.toLowerCase())
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.kind.toLowerCase().includes(q) ||
        g.stack.some((s) => s.toLowerCase().includes(q))
      return matchEngine && matchSearch
    })
  }, [engineFilter, search])

  // Ensure active stays valid when filter changes
  const safeActive = Math.min(active, Math.max(0, filtered.length - 1))
  const game = filtered[safeActive]

  // Arrow keys move through the list, like a menu in a game.
  function onKeyDown(e) {
    if (filtered.length <= 1) return
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const step = e.key === 'ArrowDown' ? 1 : -1
    const next = (safeActive + step + filtered.length) % filtered.length
    setActive(next)
    buttons.current[next]?.focus()
  }

  return (
    <section id="games" aria-labelledby="games-title">
      <h2 id="games-title">Games</h2>
      <p className="hint">Pick a game. Arrow keys work too.</p>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <input
          type="search"
          className="search-input"
          placeholder="Search games or tech..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setActive(0)
          }}
          aria-label="Search games by title or technology"
        />

        <div className="filter-tags" role="group" aria-label="Filter games by engine">
          {ENGINES.map((eng) => (
            <button
              key={eng}
              type="button"
              className="filter-tag"
              aria-pressed={engineFilter === eng}
              onClick={() => {
                setEngineFilter(eng)
                setActive(0)
              }}
            >
              {eng}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-results">
          <p>No games found matching "{search}".</p>
        </div>
      ) : (
        <div className="levels">
          <ul className="level-list" onKeyDown={onKeyDown}>
            {filtered.map((g, i) => (
              <li key={g.id}>
                <button
                  type="button"
                  ref={(el) => (buttons.current[i] = el)}
                  aria-pressed={i === safeActive}
                  onClick={() => setActive(i)}
                >
                  <span className="pointer" aria-hidden="true">
                    {i === safeActive ? '▶' : ''}
                  </span>
                  <span className="level-text">
                    <span className="level-name">{g.title}</span>
                    <span className="level-meta">
                      {g.engine}, {g.kind}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {game && <GameDetail game={game} onZoom={setZoom} />}
        </div>
      )}

      {zoom && <Lightbox src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </section>
  )
}
