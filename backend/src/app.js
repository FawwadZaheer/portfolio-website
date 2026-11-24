import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, loadEnv } from '../../rag/env.js'
import { getConfig } from '../../rag/config.js'
import { chatRouter } from './routes/chat.js'
import { contactRouter } from './routes/contact.js'
import { getMailConfig, mailConfigured } from './mail.js'

// The Express app, shared by the local server (server.js) and the Vercel function (api/index.js).
loadEnv()
const config = getConfig()
const mail = getMailConfig()

// The chatbot and the contact form are independent: a problem with one must not stop the other.
let index = null
let chatProblem = null
if (!config.apiKey) {
  chatProblem = 'Missing GEMINI_API_KEY. Copy backend/.env.example to backend/.env and fill it in.'
} else {
  try {
    index = JSON.parse(await readFile(path.join(ROOT, 'rag', 'index.json'), 'utf8'))
    if (index.embedModel !== config.embedModel || index.dims !== config.embedDims) {
      chatProblem = `Index was built with ${index.embedModel}/${index.dims} but .env says ${config.embedModel}/${config.embedDims}. Re-run: npm run ingest`
      index = null
    }
  } catch {
    chatProblem = 'rag/index.json not found. Build it first with: npm run ingest'
  }
}
if (chatProblem) console.error(`[chat] disabled: ${chatProblem}`)
if (!mailConfigured(mail)) {
  console.warn('[contact] email not configured: set CONTACT_TO_EMAIL and EMAIL_PROVIDER in backend/.env (see .env.example)')
}

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Vercel sets these automatically for each deployment
  ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`),
])

/** Allowed: no Origin (curl, same-origin GET), a listed origin, or the site's own address. */
function originAllowed(origin, host) {
  if (!origin || allowedOrigins.has(origin)) return true
  try {
    return !!host && new URL(origin).host === host
  } catch {
    return false
  }
}

const app = express()
app.disable('x-powered-by')
// Behind Vercel's (or Render's) proxy, trust one hop so rate limits see the visitor's real IP.
const trustProxy = Number(process.env.TRUST_PROXY) || (process.env.VERCEL ? 1 : 0)
if (trustProxy) app.set('trust proxy', trustProxy)
app.use(helmet())
app.use(
  cors((req, cb) =>
    cb(null, {
      origin: originAllowed(req.headers.origin, req.headers['x-forwarded-host'] || req.headers.host),
      methods: ['GET', 'POST'],
    }),
  ),
)
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, chat: !chatProblem, chunks: index?.chunks.length ?? 0, contact: mailConfigured(mail), emailProvider: mail.provider }),
)
if (index) app.use('/api', chatRouter({ index, config }))
else app.post('/api/chat', (_req, res) => res.status(503).json({ error: 'The chatbot is not configured on the server yet.' }))
app.use('/api', contactRouter({ mail }))

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, _req, res, _next) => {
  // e.g. malformed JSON or oversized body
  res.status(err.status && err.status < 500 ? err.status : 500).json({ error: 'Invalid request' })
})

export default app
export { index, mail }
