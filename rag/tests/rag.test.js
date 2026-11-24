import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { ROOT } from '../env.js'
import { getConfig, FALLBACK_REPLY } from '../config.js'
import { cleanMarkdown, chunkMarkdown, splitWithOverlap } from '../chunker.js'
import { cosine, retrieve, normalize } from '../retrieve.js'
import { chatEvents, buildContents, retrievalQuery } from '../chat.js'
import { embedDocuments, embedQuery, streamGenerate } from '../gemini.js'

// Deterministic fake embedder: hashed bag-of-words, so similar wording => similar vectors.
const DIM = 64
function fakeEmbed(text) {
  const v = new Array(DIM).fill(0)
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (w.length < 3) continue
    let h = 0
    for (const c of w) h = (h * 31 + c.charCodeAt(0)) % DIM
    v[h] += 1
  }
  return normalize(v)
}

const profile = await readFile(path.join(ROOT, 'data', 'profile.md'), 'utf8')
const chunks = chunkMarkdown(profile, { file: 'profile.md' })
const index = { chunks: chunks.map((c) => ({ ...c, embedding: fakeEmbed(c.text) })) }
const config = getConfig({ RAG_MIN_SCORE: '0.3' })

test('cleaning removes TO FILL placeholders and notes but keeps real facts', () => {
  const out = cleanMarkdown('> note\n- Location: [TO FILL: city]\n- Web: React, Vite [TO FILL: more]\n- Name: Fawwad')
  assert.ok(!out.includes('TO FILL'))
  assert.ok(!out.includes('Location'))
  assert.ok(!out.includes('note'))
  assert.ok(out.includes('Web: React, Vite'))
  assert.ok(out.includes('Name: Fawwad'))
})

test('profile.md is chunked per heading with citations', () => {
  assert.ok(chunks.length >= 10)
  assert.ok(chunks.every((c) => c.text.length < 1200 && c.source.anchor.startsWith('#')))
  assert.ok(!chunks.some((c) => c.text.includes('TO FILL')))
  assert.ok(!chunks.some((c) => /phone number|Chatbot notes/i.test(c.text)), 'bot instructions must not be indexed')
  const ship = chunks.find((c) => c.source.section.includes('Ship Brawl'))
  assert.equal(ship.source.anchor, '#games')
  assert.ok(ship.text.includes('Unreal Engine 5'))
})

test('long sections are split with overlap', () => {
  const body = Array.from({ length: 30 }, (_, i) => `line number ${i} with some padding text`).join('\n')
  const parts = splitWithOverlap(body, 300, 100)
  assert.ok(parts.length > 2)
  assert.ok(parts.every((p) => p.length <= 300))
  const lastOfFirst = parts[0].split('\n').at(-1)
  assert.ok(parts[1].includes(lastOfFirst))
})

test('retrieval ranks the relevant chunk first and filters weak matches', () => {
  const hits = retrieve(index, fakeEmbed('Steer your ship across open water and sink enemy vessels with your cannons'), { topK: 3, minScore: 0.1 })
  assert.ok(hits[0].chunk.source.section.includes('Ship Brawl'))
  assert.ok(hits.length <= 3)
  assert.equal(retrieve(index, fakeEmbed('zzz qqq xxx'), { minScore: 0.3 }).length, 0)
  assert.ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9)
})

const makeDeps = (calls) => ({
  index,
  config,
  embedQuery: async (t) => fakeEmbed(t),
  streamGenerate: async function* (prompt) {
    calls.push(prompt)
    yield 'Ship Brawl is a '
    yield 'naval game.'
  },
})
const collect = async (gen) => { const e = []; for await (const x of gen) e.push(x); return e }

test('answerable question: LLM called with context, sources returned', async () => {
  const calls = []
  const events = await collect(chatEvents({ message: 'Steer ship across open water and sink enemy vessels with cannons' }, makeDeps(calls)))
  assert.equal(calls.length, 1)
  assert.ok(calls[0].contents.at(-1).parts[0].text.includes('<context>'))
  assert.ok(calls[0].contents.at(-1).parts[0].text.includes('Ship Brawl'))
  assert.equal(events.filter((e) => e.type === 'token').map((e) => e.text).join(''), 'Ship Brawl is a naval game.')
  const sources = events.find((e) => e.type === 'sources').sources
  assert.ok(sources.some((x) => x.anchor === '#games'))
  assert.equal(events.at(-1).type, 'done')
})

test('unanswerable question: fallback, no LLM call, no sources', async () => {
  const calls = []
  const events = await collect(chatEvents({ message: 'zzz qqq xxx' }, makeDeps(calls)))
  assert.equal(calls.length, 0)
  assert.equal(events[0].text, FALLBACK_REPLY)
  assert.deepEqual(events.find((e) => e.type === 'sources').sources, [])
})

test('if the LLM itself refuses, sources are suppressed', async () => {
  const deps = { ...makeDeps([]), streamGenerate: async function* () { yield FALLBACK_REPLY } }
  const events = await collect(chatEvents({ message: 'Steer ship across open water and sink enemy vessels with cannons' }, deps))
  assert.deepEqual(events.find((e) => e.type === 'sources').sources, [])
})

test('history is mapped to roles and follow-ups borrow the previous question', () => {
  const history = [{ role: 'user', content: 'Tell me about Ship Brawl' }, { role: 'assistant', content: 'It is a game.' }]
  const contents = buildContents('which engine?', history, [])
  assert.deepEqual(contents.map((c) => c.role), ['user', 'model', 'user'])
  assert.ok(retrievalQuery('which engine?', history).includes('Ship Brawl'))
  assert.equal(retrievalQuery('x'.repeat(80), history), 'x'.repeat(80))
})

test('Gemini client: embeds in batches and parses streamed SSE (mock server)', async () => {
  const seen = []
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (d) => (body += d))
    req.on('end', () => {
      seen.push({ url: req.url, key: req.headers['x-goog-api-key'], body: JSON.parse(body) })
      if (req.url.includes('batchEmbedContents')) {
        const n = JSON.parse(body).requests.length
        res.end(JSON.stringify({ embeddings: Array.from({ length: n }, () => ({ values: [3, 4] })) }))
      } else if (req.url.includes(':embedContent')) {
        res.end(JSON.stringify({ embedding: { values: [0, 2] } }))
      } else {
        res.write('data: {"candidates":[{"content":{"parts":[{"text":"Hel"}]}}]}\n\n')
        res.write('data: {"candidates":[{"content":{"parts":[{"text":"lo","thought":false}]}}]}\n\n')
        res.end('data: {"candidates":[{"content":{"parts":[{"text":"hidden","thought":true}]}}]}\n\n')
      }
    })
  })
  await new Promise((r) => server.listen(0, r))
  const cfg = getConfig({ GEMINI_API_KEY: 'test-key', GEMINI_BASE_URL: `http://127.0.0.1:${server.address().port}` })
  try {
    const docs = await embedDocuments(cfg, Array.from({ length: 150 }, (_, i) => `doc ${i}`))
    assert.equal(docs.length, 150)
    assert.deepEqual(docs[0], [0.6, 0.8])
    assert.equal(seen.filter((s) => s.url.includes('batch')).length, 2)
    assert.equal(seen[0].key, 'test-key')
    assert.ok(!seen[0].url.includes('test-key'))
    assert.equal(seen[0].body.requests[0].taskType, 'RETRIEVAL_DOCUMENT')
    assert.deepEqual(await embedQuery(cfg, 'q'), [0, 1])
    let text = ''
    for await (const t of streamGenerate(cfg, { system: 's', contents: [] })) text += t
    assert.equal(text, 'Hello')
  } finally {
    server.close()
  }
})

test('overloaded main model: retries, then falls back to the fallback model', async () => {
  const models = []
  const server = http.createServer((req, res) => {
    req.resume()
    req.on('end', () => {
      models.push(req.url.match(/models\/([^:]+):/)[1])
      if (req.url.includes('main-model')) {
        res.statusCode = 503
        return res.end('{"error":{"status":"UNAVAILABLE"}}')
      }
      res.end('data: {"candidates":[{"content":{"parts":[{"text":"from fallback"}]}}]}\n\n')
    })
  })
  await new Promise((r) => server.listen(0, r))
  const cfg = getConfig({
    GEMINI_API_KEY: 'k',
    GEMINI_BASE_URL: `http://127.0.0.1:${server.address().port}`,
    GEMINI_CHAT_MODEL: 'main-model',
    GEMINI_FALLBACK_MODEL: 'backup-model',
  })
  try {
    let text = ''
    for await (const t of streamGenerate(cfg, { system: 's', contents: [] })) text += t
    assert.equal(text, 'from fallback')
    assert.equal(models.filter((m) => m === 'main-model').length, 4) // 1 try + 3 retries
    assert.equal(models.at(-1), 'backup-model')
  } finally {
    server.close()
  }
})

// ---------------------------------------------------------------- small talk
import { smallTalk, stripSmallTalk } from '../smalltalk.js'

test('small talk: common phrases are recognised (English + Roman Urdu)', () => {
  const cases = {
    greeting: ['hi', 'Hi!', 'hello', 'Hey there', 'heyyy', 'good morning', "what's up", 'yo', 'hello bot'],
    salam: ['salam', 'Assalam o Alaikum', 'assalamu alaikum', 'AoA'],
    'how-are-you': ['how are you?', 'How are you doing today', 'hi how are you', 'kya haal hai', 'kaise ho'],
    thanks: ['thanks', 'Thank you so much!', 'thx', 'ok thanks', 'shukriya', 'appreciate it'],
    bye: ['bye', 'Goodbye!', 'see you later', 'take care', 'allah hafiz', 'ok bye'],
    identity: ['who are you?', 'what is your name', 'are you a bot?', 'Are you human'],
    capabilities: ['help', 'what can you do?', 'what can I ask?', 'how does this work'],
    creator: ['who made you?', 'who built this website'],
    compliment: ['good bot', 'you are awesome', 'I love this site'],
    ack: ['ok', 'cool', 'lol', 'got it', 'hmm'],
  }
  for (const [intent, phrases] of Object.entries(cases)) {
    for (const p of phrases) {
      const r = smallTalk(p)
      assert.ok(r, `"${p}" should be small talk`)
      assert.equal(r.intent, intent, `"${p}" -> ${r.intent}, expected ${intent}`)
      assert.ok(r.reply.length > 10)
    }
  }
})

test('small talk: real questions are NOT swallowed', () => {
  for (const q of [
    'What games has Fawwad built?',
    'hi, what games has he made?',
    'hello can you tell me about his education',
    'thanks, and which engines does he use?',
    'who is Fawwad?',
    'what can he do in Unreal?',
    'how does he rig characters?',
    'tell me about Ship Brawl',
  ]) {
    assert.equal(smallTalk(q), null, `"${q}" should go to RAG`)
  }
})

test('small talk: greeting is stripped before retrieval', () => {
  assert.equal(stripSmallTalk('Hi! What games has he made?'), 'What games has he made?')
  assert.equal(stripSmallTalk('hello there, where does he study'), 'where does he study')
  assert.equal(stripSmallTalk('Where does he study?'), 'Where does he study?')
  assert.equal(retrievalQuery('hey, his games?', [{ role: 'user', content: 'hi' }]), 'his games?')
})

test('small talk: answered instantly without embedding or LLM calls', async () => {
  let calls = 0
  const deps = {
    index,
    config,
    embedQuery: async () => {
      calls++
      return fakeEmbed('x')
    },
    streamGenerate: async function* () {
      calls++
      yield 'nope'
    },
  }
  const events = []
  for await (const e of chatEvents({ message: 'Hello!' }, deps)) events.push(e)
  assert.equal(calls, 0)
  assert.equal(events[0].type, 'token')
  assert.match(events[0].text, /FZR-BOT|Ask me|Hey/)
  assert.deepEqual(events[1], { type: 'sources', sources: [] })
  assert.equal(events.at(-1).type, 'done')
})
