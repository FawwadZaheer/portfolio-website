import { useRef, useState, useMemo } from 'react'
import { games } from '../data.js'
import Lightbox from './Lightbox.jsx'

const ENGINES = ['All', 'Unity', 'Unreal Engine 5']

export default function Games() {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(null)
  const [engineFilter, setEngineFilter] = useState('All')
  const [search, setSearch] = useState('')
  const buttons = useRef([])

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

          {game && (
            <article className="preview" key={game.id} aria-live="polite">
              <video
                className="video"
                src={game.video}
                poster={game.poster}
                controls
                playsInline
                preload="none"
                aria-label={`${game.title} gameplay video`}
              />

              <div className="shots">
                {game.shots.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className="thumb"
                    onClick={() => setZoom({ src, alt: `${game.title} screenshot ${i + 1}` })}
                    aria-label={`Enlarge ${game.title} screenshot ${i + 1}`}
                  >
                    <img src={src} alt="" loading="lazy" />
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
                <p className="note">
                  <strong>Controls:</strong> {game.controls}
                </p>

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
          )}
        </div>
      )}

      {zoom && <Lightbox src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </section>
  )
}
