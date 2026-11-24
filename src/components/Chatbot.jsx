import { useEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

const GREETING =
  "Hi! I'm Fawwad's portfolio bot. Ask me about his games, skills, 3D models or education. I only answer from what's written in his portfolio."

const SUGGESTIONS = [
  'What games has Fawwad built?',
  'Which tools and engines does he use?',
  'Where does he study?',
  'Tell me about his Blender models',
]

async function postChat(payload, signal, query = '') {
  const res = await fetch(`${API_URL}/api/chat${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) {
    let msg = `Could not reach the chatbot (HTTP ${res.status}). Please try again.`
    if (res.status === 429) msg = 'Too many questions. Please wait a minute and try again.'
    else {
      const data = await res.json().catch(() => null)
      if (data?.error) msg = data.error
    }
    throw new Error(msg)
  }
  return res
}

/**
 * Read the server-sent-event stream from POST /api/chat and call back per event. If the
 * stream arrives empty (some hosts don't pass streamed replies through), ask once more for
 * the whole answer as JSON. Returns how many events were delivered.
 */
async function streamChat(payload, onEvent, signal) {
  const res = await postChat(payload, signal)
  let count = 0
  const deliver = (event) => {
    count++
    onEvent(event)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop()
    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data:')) continue
      try {
        deliver(JSON.parse(line.slice(5)))
      } catch {
        /* ignore malformed frame */
      }
    }
  }
  // a last frame without the trailing blank line
  const tail = buffer.trim()
  if (tail.startsWith('data:')) {
    try {
      deliver(JSON.parse(tail.slice(5)))
    } catch {
      /* ignore */
    }
  }

  if (count === 0) {
    const data = await (await postChat(payload, signal, '?mode=json')).json()
    for (const event of data.events || []) deliver(event)
  }
  return count
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // {role, content, sources?, error?}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Lets other parts of the app (e.g. the robot NPC in the game world) open the chat.
  useEffect(() => {
    const openChat = () => setOpen(true)
    window.addEventListener('open-chatbot', openChat)
    return () => window.removeEventListener('open-chatbot', openChat)
  }, [])

  async function send(text) {
    const question = text.trim()
    if (!question || busy) return
    const history = messages
      .filter((m) => !m.error && m.content)
      .slice(-6)
      .map(({ role, content }) => ({ role, content }))

    setInput('')
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }])

    const patchLast = (fn) =>
      setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? fn(msg) : msg)))

    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamChat(
        { message: question, history },
        (event) => {
          if (event.type === 'token') patchLast((msg) => ({ ...msg, content: msg.content + event.text }))
          else if (event.type === 'sources') patchLast((msg) => ({ ...msg, sources: event.sources }))
          else if (event.type === 'error') patchLast((msg) => ({ ...msg, content: event.message, error: true }))
        },
        controller.signal,
      )
      patchLast((msg) =>
        msg.content ? msg : { ...msg, content: 'No answer was received. Please try again.', error: true },
      )
    } catch (err) {
      if (err.name !== 'AbortError') {
        patchLast((msg) => ({
          ...msg,
          content: err.message || 'Something went wrong. Please try again.',
          error: true,
        }))
      }
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    send(input)
  }

  const narrow = () => window.matchMedia('(max-width: 640px)').matches

  return (
    <div className="chatbot">
      <button
        type="button"
        className="btn primary chat-toggle"
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          '✕ CLOSE'
        ) : (
          <>
            ▶ <span className="hide-sm">ASK THE </span>BOT
          </>
        )}
      </button>

      <section
        id="chat-panel"
        className="chat-panel"
        role="dialog"
        aria-label="Chat with the portfolio assistant"
        hidden={!open}
      >
        <header className="chat-head">
          <span>FZR-BOT // RAG</span>
        </header>

        <div ref={logRef} className="chat-log" role="log" aria-live="polite" aria-relevant="additions text">
          <p className="chat-msg bot">{GREETING}</p>
          {messages.map((m, i) => {
            const thinking = busy && i === messages.length - 1 && !m.content
            return (
              <div key={i} className={`chat-msg ${m.role === 'user' ? 'user' : 'bot'}${m.error ? ' error' : ''}`}>
                {thinking ? <span className="chat-thinking">THINKING</span> : <p>{m.content}</p>}
                {m.sources?.length > 0 && (
                  <p className="chat-sources">
                    <span>SOURCES:</span>{' '}
                    {m.sources.map((s) => (
                      <a
                        key={s.label}
                        href={s.anchor}
                        onClick={() => narrow() && setOpen(false)}
                        title={`From ${s.file}`}
                      >
                        {s.label}
                      </a>
                    ))}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {messages.length === 0 && (
          <ul className="chat-suggestions" aria-label="Suggested questions">
            {SUGGESTIONS.map((q) => (
              <li key={q}>
                <button type="button" onClick={() => send(q)} disabled={busy}>
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="chat-form" onSubmit={onSubmit}>
          <label htmlFor="chat-input" className="sr-only">
            Your question
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Ask about Fawwad..."
            autoComplete="off"
            disabled={busy}
          />
          <button type="submit" className="btn primary" disabled={busy || !input.trim()}>
            SEND
          </button>
        </form>
      </section>
    </div>
  )
}
