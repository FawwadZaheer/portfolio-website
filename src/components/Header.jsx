import { profile } from '../data.js'
import { useScrollSpy } from '../hooks.js'
import ThemeToggle from './ThemeToggle.jsx'

export const NAV = [
  { id: 'avatar', label: 'Avatar' },
  { id: 'games', label: 'Games' },
  { id: 'models', label: '3D models' },
  { id: 'experience', label: 'Education' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]

export default function Header({ onPlay }) {
  const active = useScrollSpy(NAV.map((n) => n.id))

  return (
    <header className="header">
      <div className="header-inner">
        <a className="logo" href="#top" aria-label="FZR, back to top" title={profile.name}>
          FZR
        </a>
        <nav aria-label="Main" className="main-nav">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={active === n.id ? 'active' : undefined}
              aria-current={active === n.id ? 'location' : undefined}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          {onPlay && (
            <button type="button" className="theme-toggle-btn play-mode-btn" onClick={onPlay}>
              ▶ <span className="hide-sm">GAME MODE</span>
              <span className="show-sm">GAME</span>
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
