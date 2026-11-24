import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { chatEvents } from '../../../rag/chat.js'
import { embedQuery, streamGenerate } from '../../../rag/gemini.js'

const bodySchema = z.object({
  message: z.string().trim().min(1, 'Message is empty').max(500, 'Message is too long (500 characters max)'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(800),
      }),
    )
    .max(6)
    .default([]),
})

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many questions. Please wait a minute and try again.' },
})

export function chatRouter({ index, config }) {
  const router = Router()

  const runEvents = (data, signal) =>
    chatEvents(data, {
      index,
      config,
      embedQuery: (text) => embedQuery(config, text, signal),
      streamGenerate: (prompt) => streamGenerate(config, prompt, signal),
    })

  /** Whole answer as one JSON reply: { events: [...] }. Used when streaming isn't delivered. */
  async function answerAsJson(data, res) {
    const events = []
    try {
      for await (const event of runEvents(data, undefined)) events.push(event)
    } catch (err) {
      console.error('[chat] failed (json):', err.name, err.status ?? '', err.message)
      const busy = err.status === 429 || err.status === 503
      events.push({
        type: 'error',
        message: busy
          ? 'The AI service is busy right now. Please try again in a moment.'
          : 'Something went wrong while answering. Please try again.',
      })
    }
    res.json({ events })
  }

  router.post('/chat', limiter, async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' })
    }
    if (req.query.mode === 'json') return answerAsJson(parsed.data, res)

    const abort = new AbortController()
<<<<<<< HEAD
    // Stop the AI call if the visitor closes the chat mid-answer. Not on Vercel: its runtime
    // can report the connection as closed before the answer is written.
=======
	
>>>>>>> 9642f15578b7e228d10a90d82df565ddf04517e0
    if (!process.env.VERCEL) res.on('close', () => !res.writableEnded && abort.abort())

    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()
    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)

    try {
      for await (const event of runEvents(parsed.data, abort.signal)) send(event)
    } catch (err) {
      console.error('[chat] failed:', err.name, err.status ?? '', err.message)
      if (!abort.signal.aborted) {
        const busy = err.status === 429 || err.status === 503
        send({
          type: 'error',
          message: busy
            ? 'The AI service is busy right now. Please try again in a moment.'
            : 'Something went wrong while answering. Please try again.',
        })
      }
    } finally {
      res.end()
    }
  })

  // Self-test you can open in a browser: runs one fixed question on the server and reports
  // what happened (answer text, timing, error). No secrets are included.
  const diagLimiter = rateLimit({ windowMs: 60_000, limit: 4, standardHeaders: true, legacyHeaders: false })
  router.get('/chat/diag', diagLimiter, async (_req, res) => {
    const started = Date.now()
    const out = { runtime: process.env.VERCEL ? 'vercel' : 'node', node: process.version, chunks: index.chunks.length }
    try {
      const events = []
      for await (const e of runEvents({ message: 'What games has Fawwad built?', history: [] }, undefined)) events.push(e)
      out.events = events.map((e) => (e.type === 'token' ? { type: 'token', chars: e.text.length } : e))
      out.answerStart = events.filter((e) => e.type === 'token').map((e) => e.text).join('').slice(0, 160)
    } catch (err) {
      out.error = { name: err.name, status: err.status ?? null, message: String(err.message).slice(0, 300) }
    }
    out.ms = Date.now() - started
    res.json(out)
  })

  return router
}
