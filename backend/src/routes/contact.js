import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { sendMail, mailConfigured } from '../mail.js'

// ---------- validation (mirrors src/contactRules.js on the frontend) ----------
// Header fields lose any line breaks so nobody can inject extra email headers.
const oneLine = (s) => s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()

export const contactSchema = z.object({
  name: z
    .string({ required_error: 'Please enter your name.' })
    .transform(oneLine)
    .pipe(z.string().min(2, 'Name is too short.').max(80, 'Name is too long (80 characters max).')),
  email: z
    .string({ required_error: 'Please enter your email address.' })
    .trim()
    .max(254, 'Email address is too long.')
    .email('Please enter a valid email address.'),
  subject: z
    .string({ required_error: 'Please enter a subject.' })
    .transform(oneLine)
    .pipe(z.string().min(3, 'Subject is too short.').max(120, 'Subject is too long (120 characters max).')),
  message: z
    .string({ required_error: 'Please enter a message.' })
    .trim()
    .min(10, 'Message is too short (10 characters min).')
    .max(5000, 'Message is too long (5000 characters max).'),
  // spam traps: a hidden field humans never fill, and the time the form was opened
  website: z.string().max(500).optional().default(''),
  startedAt: z.number().int().positive().optional(),
})

const MIN_FILL_MS = 3000 // a human needs more than 3 s to fill the form
const MAX_LINKS = 3

export function spamReason(data, now = Date.now()) {
  if (data.website) return 'honeypot'
  if (data.startedAt && now - data.startedAt < MIN_FILL_MS) return 'too-fast'
  const links = (data.message.match(/https?:\/\/|www\./gi) || []).length
  if (links > MAX_LINKS) return 'links'
  return null
}

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function buildEmail({ name, email, subject, message }, meta = {}) {
  const when = new Date(meta.now || Date.now()).toUTCString()
  const text = [
    `New message from your portfolio contact form`,
    ``,
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Subject: ${subject}`,
    `Sent:    ${when}`,
    ``,
    message,
    ``,
    `(Reply to this email to answer ${name} directly.)`,
  ].join('\n')
  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:620px">
  <h2 style="margin:0 0 12px;color:#081820">New portfolio message</h2>
  <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
    <tr><td style="padding:4px 12px 4px 0;color:#346856"><b>Name</b></td><td>${escapeHtml(name)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#346856"><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#346856"><b>Subject</b></td><td>${escapeHtml(subject)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#346856"><b>Sent</b></td><td>${escapeHtml(when)}</td></tr>
  </table>
  <div style="white-space:pre-wrap;border-left:4px solid #88c070;padding:8px 12px;background:#f3fbee">${escapeHtml(message)}</div>
  <p style="color:#666;font-size:12px">Reply to this email to answer ${escapeHtml(name)} directly.</p>
</div>`
  // Reply-To is kept as { name, address } so a visitor's name (which may contain ":" "," "<" "@")
  // can never change or add the address your reply goes to. mail.js formats it safely.
  return { subject: `[Portfolio] ${subject}`, text, html, replyTo: { name, address: email } }
}

export function contactRouter({ mail, send = sendMail, limit = 5 }) {
  const router = Router()

  const limiter = rateLimit({
    windowMs: 15 * 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many messages from your connection. Please try again in 15 minutes.' },
  })

  router.post('/contact', limiter, async (req, res) => {
    const parsed = contactSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      const fields = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key && !fields[key]) fields[key] = issue.message
      }
      return res.status(400).json({ error: 'Please check the highlighted fields.', fields })
    }
    const data = parsed.data

    // Bots get a normal-looking success so they don't retry; nothing is sent.
    const spam = spamReason(data)
    if (spam === 'links') {
      return res.status(400).json({ error: `Please include at most ${MAX_LINKS} links.`, fields: { message: 'Too many links.' } })
    }
    if (spam) {
      console.warn(`[contact] dropped likely spam (${spam}) from ${req.ip}`)
      return res.json({ ok: true })
    }

    if (!mailConfigured(mail)) {
      console.error('[contact] email is not configured: set CONTACT_TO_EMAIL and a provider in backend/.env')
      return res.status(503).json({ error: 'The contact form is not set up yet. Please email directly instead.' })
    }

    try {
      const { id } = await send(mail, buildEmail(data))
      console.log(`[contact] sent message from ${data.email} (id ${id})`)
      return res.json({ ok: true })
    } catch (err) {
      console.error('[contact] send failed:', err.message)
      return res.status(502).json({ error: 'Your message could not be sent right now. Please try again later or email directly.' })
    }
  })

  return router
}
