import { Component } from 'react'

/**
 * Catches a crash inside one part of the page (a game panel, the menu, the 3D view...) so the
 * rest keeps working, and shows the error message instead of a blank screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(`[${this.props.name || 'ui'}] crashed:`, error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const reset = () => {
      this.setState({ error: null })
      this.props.onReset?.()
    }
    return (
      <div className="game-panel-backdrop error-boundary" role="alert">
        <div className="game-panel">
          <header className="game-panel-head">
            <span>SOMETHING BROKE // {String(this.props.name || 'ui').toUpperCase()}</span>
            <button type="button" className="video-close-btn" onClick={reset}>
              ✕ CLOSE
            </button>
          </header>
          <div className="game-panel-body">
            <p>This part of the page hit an error. Close this box to keep playing.</p>
            <pre className="error-text">{String(error?.stack || error?.message || error).slice(0, 900)}</pre>
            {this.props.fallbackAction}
          </div>
        </div>
      </div>
    )
  }
}
