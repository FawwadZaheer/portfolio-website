import { education, experience, achievements } from '../data.js'

export default function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-title">
      <h2 id="experience-title">Education, Experience & Certifications</h2>
      <p className="hint">Academic foundation, project experience, and technical achievements.</p>

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

        {achievements && achievements.length > 0 && (
          <div className="exp-card">
            <span className="badge">Certifications</span>
            {achievements.map((ach) => (
              <div key={ach.title} className="exp-item">
                <div className="exp-header">
                  <h3>{ach.title}</h3>
                </div>
                <p className="institution"><strong>{ach.issuer}</strong></p>
                <p className="summary">{ach.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
