import { education, experience } from '../data.js'

export default function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-title">
      <h2 id="experience-title">Education & Experience</h2>
      <p className="hint">Academic foundation and project-driven development.</p>

      <div className="experience-grid">
        <div className="exp-card">
          <span className="badge">Education</span>
          {education.map((edu) => (
            <div key={edu.degree} className="exp-item">
              <div className="exp-header">
                <h3>{edu.degree}</h3>
                <span className="period">{edu.period}</span>
              </div>
              <p className="institution"><strong>{edu.institution}</strong></p>
              <p className="summary">{edu.summary}</p>
            </div>
          ))}
        </div>

        <div className="exp-card">
          <span className="badge">Experience</span>
          {experience.map((exp) => (
            <div key={exp.title} className="exp-item">
              <div className="exp-header">
                <h3>{exp.title}</h3>
                <span className="period">{exp.period}</span>
              </div>
              <p className="summary">{exp.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
