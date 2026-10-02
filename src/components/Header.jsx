import { profile } from '../data.js'

export default function Header() {
  return (
    <header className="header">
      <a className="logo" href="#top" aria-label={`${profile.name}, back to top`}>
        FZR
      </a>
      <nav aria-label="Main">
        <a href="#games">Games</a>
        <a href="#models">3D models</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  )
}
