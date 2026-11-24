import { useEffect, useState } from 'react'

const THEMES = [
  { id: 'classic', label: 'DMG Green', icon: '🟢' },
  { id: 'pocket', label: 'Pocket Mono', icon: '⚪' },
  { id: 'night', label: 'CRT Night', icon: '🌙' },
]

export default function ThemeToggle() {
  const [themeIndex, setThemeIndex] = useState(0)

  useEffect(() => {
    let saved = null
    try {
      saved = localStorage.getItem('retro_theme')
    } catch {
      /* storage unavailable */
    }
    if (saved) {
      const idx = THEMES.findIndex((t) => t.id === saved)
      if (idx !== -1) {
        setThemeIndex(idx)
        document.documentElement.setAttribute('data-theme', saved)
      }
    }
  }, [])

  function cycleTheme() {
    const next = (themeIndex + 1) % THEMES.length
    const theme = THEMES[next]
    setThemeIndex(next)
    document.documentElement.setAttribute('data-theme', theme.id)
    try {
      localStorage.setItem('retro_theme', theme.id)
    } catch {
      /* storage unavailable */
    }
  }

  const current = THEMES[themeIndex]

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={cycleTheme}
      aria-label={`${current.label} palette: switch`}
      title="Switch palette (Game Boy DMG / Pocket / Night)"
    >
      <span className="theme-icon" aria-hidden="true">{current.icon}</span>
      <span className="theme-text hide-sm">{current.label}</span>
    </button>
  )
}
