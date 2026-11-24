import { useEffect, useRef, useState } from 'react'
import { profile, socials } from '../data.js'
import { LIMITS, validateContact } from '../contactRules.js'

const API_URL = import.meta.env.VITE_API_URL || ''
const EMPTY = { name: '', email: '', subject: '', message: '' }

const FIELDS = [
  { id: 'name', label: 'Name', type: 'text', autoComplete: 'name', placeholder: 'Your name' },
  { id: 'email', label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  { id: 'subject', label: 'Subject', type: 'text', autoComplete: 'off', placeholder: 'What is it about?' },
]

export default function Contact() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [serverError, setServerError] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const startedAt = useRef(Date.now())
  const statusRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    if (status === 'sent' || status === 'error') statusRef.current?.focus()
  }, [status])

  const set = (k) => (e) => {
    const next = { ...values, [k]: e.target.value }
    setValues(next)
    if (touched[k]) setErrors(validateContact(next))
  }
  const blur = (k) => () => {
    setTouched((t) => ({ ...t, [k]: true }))
    setErrors(validateContact(values))
  }

  async function onSubmit(e) {
    e.preventDefault()
    const found = validateContact(values)
    setErrors(found)
    setTouched({ name: true, email: true, subject: true, message: true })
    if (Object.keys(found).length) {
      formRef.current?.querySelector(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }
    setStatus('sending')
    setServerError('')
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website: honeypot, startedAt: startedAt.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setStatus('sent')
        return
      }
      if (data.fields) setErrors(data.fields)
      setServerError(
        data.error ||
          (res.status === 429
            ? 'Too many messages. Please try again later.'
            : `Could not send your message (HTTP ${res.status}). Please try again.`),
      )
      setStatus('error')
    } catch {
      setServerError('Could not reach the server. Check your connection and try again.')
      setStatus('error')
    }
  }

  function reset() {
    setValues(EMPTY)
    setErrors({})
    setTouched({})
    setStatus('idle')
    startedAt.current = Date.now()
  }

  const showErr = (k) => touched[k] && errors[k]

  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <h2 id="contact-title">Contact</h2>
      <p>Have a project, a role or a question? Send me a message and I&apos;ll reply by email.</p>

      <div className="contact-layout">
        {status === 'sent' ? (
          <div className="contact-success" role="status" tabIndex={-1} ref={statusRef}>
            <p className="contact-success-title">✓ MESSAGE SENT</p>
            <p>
              Thanks, {values.name.trim().split(' ')[0]}! Your message is on its way. I&apos;ll get back to you at{' '}
              <strong>{values.email.trim()}</strong>.
            </p>
            <button type="button" className="btn" onClick={reset}>
              Send another message
            </button>
          </div>
        ) : (
          <form ref={formRef} className="contact-form" onSubmit={onSubmit} noValidate>
            {FIELDS.map((f) => (
              <div key={f.id} className={`field${showErr(f.id) ? ' invalid' : ''}`}>
                <label htmlFor={`contact-${f.id}`}>{f.label}</label>
                <input
                  id={`contact-${f.id}`}
                  name={f.id}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  placeholder={f.placeholder}
                  maxLength={LIMITS[f.id][1]}
                  value={values[f.id]}
                  onChange={set(f.id)}
                  onBlur={blur(f.id)}
                  aria-invalid={Boolean(showErr(f.id))}
                  aria-describedby={showErr(f.id) ? `contact-${f.id}-err` : undefined}
                  required
                  disabled={status === 'sending'}
                />
                {showErr(f.id) && (
                  <p className="field-error" id={`contact-${f.id}-err`}>
                    {errors[f.id]}
                  </p>
                )}
              </div>
            ))}

            <div className={`field${showErr('message') ? ' invalid' : ''}`}>
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                name="message"
                rows={6}
                placeholder="Write your message…"
                maxLength={LIMITS.message[1]}
                value={values.message}
                onChange={set('message')}
                onBlur={blur('message')}
                aria-invalid={Boolean(showErr('message'))}
                aria-describedby={`contact-message-count${showErr('message') ? ' contact-message-err' : ''}`}
                required
                disabled={status === 'sending'}
              />
              <div className="field-foot">
                {showErr('message') ? (
                  <p className="field-error" id="contact-message-err">
                    {errors.message}
                  </p>
                ) : (
                  <span />
                )}
                <span className="char-count" id="contact-message-count">
                  {values.message.length}/{LIMITS.message[1]}
                </span>
              </div>
            </div>

            {/* Spam trap: hidden from people and screen readers, bots tend to fill it. */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {status === 'error' && (
              <div className="contact-error" role="alert" tabIndex={-1} ref={statusRef}>
                <p>{serverError}</p>
                <p>
                  You can also email me directly at <a href={`mailto:${profile.email}`}>{profile.email}</a>.
                </p>
              </div>
            )}

            <button type="submit" className="btn primary contact-submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'SENDING…' : '▶ SEND MESSAGE'}
            </button>
          </form>
        )}

        <aside className="contact-side">
          <p className="contact-side-label">Or email me directly</p>
          <a className="mail" href={`mailto:${profile.email}`}>
            {profile.email.split('@')[0]}
            <wbr />@{profile.email.split('@')[1]}
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
        </aside>
      </div>
    </section>
  )
}
