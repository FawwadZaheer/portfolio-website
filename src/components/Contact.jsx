import { profile, socials } from '../data.js'

export default function Contact() {
  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <h2 id="contact-title">Contact</h2>
      <p>Have a project or a role in mind? Send me an email.</p>
      <a className="mail" href={`mailto:${profile.email}`}>
        {profile.email}
      </a>
      <ul className="socials">
        {socials.map((s) => (
          <li key={s.label}>
            <a href={s.href} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
