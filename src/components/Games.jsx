import { useRef, useState } from 'react'
import { games } from '../data.js'
import Lightbox from './Lightbox.jsx'

export default function Games() {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(null) // { src, alt } or null
  const buttons = useRef([])
  const game = games[active]

  // Arrow keys move through the list, like a menu in a game.
  function onKeyDown(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const step = e.key === 'ArrowDown' ? 1 : -1
    const next = (active + step + games.length) % games.length
    setActive(next)
    buttons.current[next]?.focus()
  }

  return (
    <section id="games" aria-labelledby="games-title">
      <h2 id="games-title">Games</h2>
      <p className="hint">Pick a game. Arrow keys work too.</p>

      <div className="levels">
        <ul className="level-list" onKeyDown={onKeyDown}>
          {games.map((g, i) => (
            <li key={g.id}>
              <button
                type="button"
                ref={(el) => (buttons.current[i] = el)}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
              >
                <span className="pointer" aria-hidden="true">
                  {i === active ? '▶' : ''}
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

            {game.links.length > 0 && (
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
      </div>

      {zoom && <Lightbox src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </section>
  )
}
