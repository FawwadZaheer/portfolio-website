import { useState } from 'react'
import { models } from '../data.js'

const VIEWS = [
  { id: 'render', label: 'Render' },
  { id: 'wire', label: 'Wireframe' },
  { id: 'video', label: 'Video' },
]

function ModelCard({ model }) {
  const [view, setView] = useState('render')

  return (
    <article className="model">
      <div className="model-stage">
        {view === 'video' ? (
          <video
            src={model.video}
            poster={model.poster}
            controls
            playsInline
            preload="none"
            aria-label={`${model.title} video`}
          />
        ) : (
          <img
            src={view === 'render' ? model.render : model.wire}
            alt={`${model.title}, ${view === 'render' ? 'render' : 'wireframe'}`}
            loading="lazy"
          />
        )}
      </div>

      <div className="tabs" role="group" aria-label={`${model.title} views`}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="model-body">
        <h3>{model.title}</h3>
        <p>{model.summary}</p>
        <ul className="tags">
          {model.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export default function Models() {
  return (
    <section id="models" aria-labelledby="models-title">
      <h2 id="models-title">3D models</h2>
      <p className="hint">All made in Blender. Switch between the render, wireframe, and video.</p>
      <div className="model-grid">
        {models.map((m) => (
          <ModelCard key={m.id} model={m} />
        ))}
      </div>
    </section>
  )
}
