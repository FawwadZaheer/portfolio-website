// FZR-BOT on Vercel: a standalone serverless function (no Express, no streaming).
//
//   POST /api/chat  { message, history }  ->  { events: [{type:'token'|'sources'|'error'|'done', ...}] }
//   GET  /api/chat                         ->  status (is the key set, is the index loaded, which models)
//   GET  /api/chat?test=1                  ->  runs one fixed question and reports the result or error
//
// It reuses the same RAG pipeline as the local Express server (rag/*.js), but answers in one
// JSON reply, which works reliably on every host. Secrets come from Vercel's environment
// variables and are never included in any response.
import { readFileSync } from 'node:fs'
import path from 'node:path'

let state = null // loaded once per warm instance

async function load() {
  if (state) return state
  try {
    const { getConfig } = await import('../rag/config.js')
    const { chatEvents } = await import('../rag/chat.js')
    const { embedQuery, streamGenerate } = await import('../rag/gemini.js')
    const config = getConfig()
    const index = JSON.parse(readFileSync(path.join(process.cwd(), 'rag', 'index.json'), 'utf8'))
    let problem = null
    if (!config.apiKey) problem = 'GEMINI_API_KEY is not set in Vercel → Settings → Environment Variables'
    else if (index.embedModel !== config.embedModel || index.dims !== config.embedDims)
      problem = `rag/index.json was built with ${index.embedModel}/${index.dims}, but the variables say ${config.embedModel}/${config.embedDims}`
    state = { config, index, chatEvents, embedQuery, streamGenerate, problem }
  } catch (err) {
    // keep it short and secret-free; retried on the next request
    return { problem: `startup failed: ${err.name}: ${String(err.message).slice(0, 200)}` }
  }
  return state
}

// ---- small guards (per instance) ----
const hits = new Map()
function rateLimited(ip, limit = 15, windowMs = 60_000) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs)
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return list.length > limit
}

function sameSiteOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  const host = req.headers['x-forwarded-host'] || req.headers.host
  try {
    const u = new URL(origin)
    return u.host === host || u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return null
}

function validate(body) {
  if (!body || typeof body.message !== 'string') return { error: 'Message is empty' }
  const message = body.message.trim()
  if (!message) return { error: 'Message is empty' }
  if (message.length > 500) return { error: 'Message is too long (500 characters max)' }
  const history = Array.isArray(body.history)
    ? body.history
        .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
        .map((h) => ({ role: h.role, content: h.content.trim().slice(0, 800) }))
        .filter((h) => h.content)
        .slice(-6)
    : []
  return { data: { message, history } }
}

async function answer(s, data) {
  const events = []
  const deps = {
    index: s.index,
    config: s.config,
    embedQuery: (text) => s.embedQuery(s.config, text),
    streamGenerate: (prompt) => s.streamGenerate(s.config, prompt),
  }
  for await (const e of s.chatEvents(data, deps)) events.push(e)
  return events
}

const friendly = (err) =>
  err?.status === 429 || err?.status === 503
    ? 'The AI service is busy right now. Please try again in a moment.'
    : 'Something went wrong while answering. Please try again.'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const s = await load()

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://x')
    const out = {
      ok: !s.problem,
      problem: s.problem || null,
      chunks: s.index?.chunks?.length ?? 0,
      chatModel: s.config?.chatModel ?? null,
      embedModel: s.config?.embedModel ?? null,
      node: process.version,
    }
    if (url.searchParams.get('test') && !s.problem) {
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
      if (rateLimited(`test:${ip}`, 3)) return res.status(429).json({ ...out, test: 'rate limited, wait a minute' })
      const t0 = Date.now()
      try {
        const events = await answer(s, { message: 'What games has Fawwad built?', history: [] })
        out.test = {
          ms: Date.now() - t0,
          answerStart: events.filter((e) => e.type === 'token').map((e) => e.text).join('').slice(0, 160),
          sources: events.find((e) => e.type === 'sources')?.sources?.length ?? 0,
        }
      } catch (err) {
        out.test = { ms: Date.now() - t0, error: `${err.name} ${err.status ?? ''}: ${String(err.message).slice(0, 300)}` }
      }
    }
    return res.status(200).json(out)
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!sameSiteOrigin(req)) return res.status(403).json({ error: 'Origin not allowed' })
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) return res.status(429).json({ error: 'Too many questions. Please wait a minute and try again.' })
  if (s.problem) {
    console.error('[chat] not configured:', s.problem)
    return res.status(503).json({ error: 'The chatbot is not configured on the server yet.' })
  }

  const { data, error } = validate(readBody(req))
  if (error) return res.status(400).json({ error })

  try {
    return res.status(200).json({ events: await answer(s, data) })
  } catch (err) {
    console.error('[chat] failed:', err.name, err.status ?? '', err.message)
    return res.status(200).json({ events: [{ type: 'error', message: friendly(err) }] })
  }
}
