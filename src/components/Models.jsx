import { useState, useMemo } from 'react'
import { models } from '../data.js'

const VIEWS = [
  { id: 'render', label: 'Render' },
  { id: 'wire', label: 'Wireframe' },
  { id: 'video', label: 'Video' },
]

const TAGS = ['All', 'Game-ready', 'Hard-surface', 'Rigging']

export function ModelCard({ model }) {
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
  const [selectedTag, setSelectedTag] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return models.filter((m) => {
      const matchTag = selectedTag === 'All' || m.stack.includes(selectedTag)
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.stack.some((s) => s.toLowerCase().includes(q))
      return matchTag && matchSearch
    })
  }, [selectedTag, search])

  return (
    <section id="models" aria-labelledby="models-title">
      <h2 id="models-title">3D models</h2>
      <p className="hint">All made in Blender. Switch between the render, wireframe, and video.</p>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <input
          type="search"
          className="search-input"
          placeholder="Search 3D models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search 3D models by name or tag"
        />

        <div className="filter-tags" role="group" aria-label="Filter 3D models by category">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="filter-tag"
              aria-pressed={selectedTag === tag}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-results">
          <p>No models found matching "{search}".</p>
        </div>
      ) : (
        <div className="model-grid">
          {filtered.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      )}
    </section>
  )
}
