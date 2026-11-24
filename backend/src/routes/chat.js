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

  router.post('/chat', limiter, async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' })
    }

    const abort = new AbortController()
    // Stop the AI call if the visitor closes the chat mid-answer. Not on Vercel: its runtime
    // can report the connection as closed before the answer is written, which would cancel
    // every reply (the visitor then sees "No answer was received").
    if (!process.env.VERCEL) res.on('close', () => !res.writableEnded && abort.abort())

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)

    try {
      const deps = {
        index,
        config,
        embedQuery: (text) => embedQuery(config, text, abort.signal),
        streamGenerate: (prompt) => streamGenerate(config, prompt, abort.signal),
      }
      for await (const event of chatEvents(parsed.data, deps)) send(event)
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

  return router
}
