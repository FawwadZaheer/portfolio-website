import { profile } from '../data.js'
import { useTypewriter } from '../hooks.js'

export default function Hero() {
  const typed = useTypewriter(profile.tagline)

  return (
    <section className="hero">
      <h1 aria-label={profile.name}>
        {profile.nameLines.map((line) => (
          <span key={line} aria-hidden="true">
            {line}
          </span>
        ))}
      </h1>

      <p className="tagline" aria-label={profile.tagline}>
        <span aria-hidden="true">
          {typed}
          <span className="cursor" />
        </span>
      </p>

      <div className="actions">
        <a className="btn primary" href="#games">
          Press start
        </a>
        <a className="btn" href="#contact">
          Email me
        </a>
      </div>
    </section>
  )
}
