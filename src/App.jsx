import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Games from './components/Games.jsx'
import Models from './components/Models.jsx'
import About from './components/About.jsx'
import Contact from './components/Contact.jsx'
import { profile } from './data.js'

export default function App() {
  return (
    <div className="wrap">
      <Header />
      <main id="top">
        <Hero />
        <Games />
        <Models />
        <About />
        <Contact />
      </main>
      <footer className="footer">
        © {new Date().getFullYear()} {profile.name}
      </footer>
    </div>
  )
}
