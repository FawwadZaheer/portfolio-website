// Minimal Gemini REST client (no SDK). The API key travels in a header, never in a URL,
// so it cannot leak into logs or error messages.

import { normalize } from './retrieve.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export class GeminiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'GeminiError'
    this.status = status
  }
}

async function call(config, pathAndQuery, body, { signal, retries = 0 } = {}) {
  if (!config.apiKey) throw new GeminiError('GEMINI_API_KEY is not set', 500)
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${config.baseUrl}/v1beta/${pathAndQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify(body),
      signal,
    })
    if (res.ok) return res
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(1000 * 2 ** attempt)
      continue
    }
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    throw new GeminiError(`Gemini API ${res.status}: ${detail}`, res.status)
  }
}

/** EMBED documents (ingest time). Batches of up to 100, normalised to unit length. */
export async function embedDocuments(config, texts) {
  const out = []
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100)
    const res = await call(
      config,
      `models/${config.embedModel}:batchEmbedContents`,
      {
        requests: batch.map((text) => ({
          model: `models/${config.embedModel}`,
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: config.embedDims,
        })),
      },
      { retries: 4 },
    )
    const data = await res.json()
    for (const e of data.embeddings) out.push(normalize(e.values))
  }
  return out
}

/** EMBED a visitor question (query time). */
export async function embedQuery(config, text, signal) {
  const res = await call(
    config,
    `models/${config.embedModel}:embedContent`,
    {
      model: `models/${config.embedModel}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: config.embedDims,
    },
    { signal, retries: 2 },
  )
  const data = await res.json()
  return normalize(data.embedding.values)
}

/** Open a streaming generate call on one model (retries 429/5xx with backoff). */
async function openStream(config, model, { system, contents }, signal) {
  return call(
    config,
    `models/${model}:streamGenerateContent?alt=sse`,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: config.maxOutputTokens },
    },
    { signal, retries: 3 },
  )
}

/**
 * GENERATE: stream answer text chunks from the LLM (server-sent events).
 * If the main model stays overloaded (429/5xx after retries), try GEMINI_FALLBACK_MODEL once.
 */
export async function* streamGenerate(config, prompt, signal) {
  let res
  try {
    res = await openStream(config, config.chatModel, prompt, signal)
  } catch (err) {
    const retryable = err instanceof GeminiError && (err.status === 429 || err.status >= 500)
    if (!retryable || !config.fallbackModel || config.fallbackModel === config.chatModel) throw err
    console.warn(`[chat] ${config.chatModel} unavailable (${err.status}); trying ${config.fallbackModel}`)
    try {
      res = await openStream(config, config.fallbackModel, prompt, signal)
    } catch {
      throw err // report the original problem, not the fallback's
    }
  }
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true })
    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let json
      try { json = JSON.parse(payload) } catch { continue }
      const parts = json.candidates?.[0]?.content?.parts ?? []
      for (const p of parts) if (p.text && !p.thought) yield p.text
    }
  }
}
