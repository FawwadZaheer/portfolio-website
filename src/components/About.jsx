import { about, skills } from '../data.js'

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title">
      <h2 id="about-title">About</h2>
      <div className="about">
        <div>
          {about.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <dl className="skills">
          {skills.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
