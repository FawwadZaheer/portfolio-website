// Contact form (Module 5): validation, spam protection, email building and the HTTP route.
// Run: cd backend && npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { contactSchema, spamReason, buildEmail, contactRouter } from '../src/routes/contact.js'
import { getMailConfig, mailConfigured, sendMail, formatAddress } from '../src/mail.js'

const valid = {
  name: 'Ayesha Khan',
  email: 'ayesha@example.com',
  subject: 'Internship opportunity',
  message: 'Hi Fawwad, we liked Ship Brawl and would like to talk.',
  website: '',
  startedAt: Date.now() - 20_000,
}

test('validation accepts a normal message and rejects bad fields', () => {
  assert.ok(contactSchema.safeParse(valid).success)
  const bad = contactSchema.safeParse({ name: 'A', email: 'nope', subject: 'x', message: 'short' })
  assert.equal(bad.success, false)
  const fields = new Set(bad.error.issues.map((i) => i.path[0]))
  for (const f of ['name', 'email', 'subject', 'message']) assert.ok(fields.has(f), `${f} should be flagged`)
  assert.equal(contactSchema.safeParse({ ...valid, message: 'x'.repeat(5001) }).success, false)
})

test('line breaks are stripped from header fields (no header injection)', () => {
  const r = contactSchema.parse({ ...valid, name: 'Eve\r\nBcc: victim@x.com', subject: 'Hi\nthere' })
  assert.ok(!/[\r\n]/.test(r.name))
  assert.ok(!/[\r\n]/.test(r.subject))
})

test('spam traps: honeypot, too-fast submissions, link floods', () => {
  const now = Date.now()
  assert.equal(spamReason({ ...valid }, now), null)
  assert.equal(spamReason({ ...valid, website: 'http://spam.biz' }, now), 'honeypot')
  assert.equal(spamReason({ ...valid, startedAt: now - 500 }, now), 'too-fast')
  assert.equal(spamReason({ ...valid, message: 'buy http://a http://b http://c http://d now' }, now), 'links')
})

test('email body escapes HTML and sets Reply-To to the visitor', () => {
  const e = buildEmail({ ...valid, message: '<script>alert(1)</script>' })
  assert.ok(!e.html.includes('<script>'))
  assert.ok(e.html.includes('&lt;script&gt;'))
  assert.deepEqual(e.replyTo, { name: 'Ayesha Khan', address: 'ayesha@example.com' })
  assert.equal(e.subject, '[Portfolio] Internship opportunity')
})

test('Reply-To: a crafted name cannot add or change the reply address', () => {
  const r = contactSchema.parse({ ...valid, name: 'x <attacker@evil.com>, "Eve": victim@x.com' })
  const e = buildEmail(r)
  assert.equal(e.replyTo.address, 'ayesha@example.com')
  const formatted = formatAddress(e.replyTo)
  assert.equal((formatted.match(/</g) || []).length, 1, formatted)
  assert.ok(formatted.endsWith('<ayesha@example.com>'), formatted)
  assert.ok(!/attacker@evil\.com>/.test(formatted.replace(/^"[^"]*"/, '')), formatted)
})

test('mail config: provider inferred from env, needs a recipient', () => {
  assert.equal(getMailConfig({ RESEND_API_KEY: 'k' }).provider, 'resend')
  assert.equal(getMailConfig({ SMTP_HOST: 'smtp.gmail.com' }).provider, 'smtp')
  assert.equal(mailConfigured(getMailConfig({ RESEND_API_KEY: 'k' })), false)
  assert.equal(mailConfigured(getMailConfig({ RESEND_API_KEY: 'k', CONTACT_TO_EMAIL: 'me@x.com' })), true)
  assert.equal(mailConfigured(getMailConfig({ EMAIL_PROVIDER: 'smtp', SMTP_HOST: 'h', CONTACT_TO_EMAIL: 'me@x.com' })), false)
})

test('Resend provider posts the right request (mocked HTTP)', async () => {
  let req
  const fetchImpl = async (url, init) => {
    req = { url, init, body: JSON.parse(init.body) }
    return new Response(JSON.stringify({ id: 'abc123' }), { status: 200 })
  }
  const cfg = getMailConfig({ RESEND_API_KEY: 'secret', CONTACT_TO_EMAIL: 'me@x.com' })
  const out = await sendMail(cfg, buildEmail(valid), { fetchImpl })
  assert.equal(out.id, 'abc123')
  assert.equal(req.url, 'https://api.resend.com/emails')
  assert.equal(req.init.headers.Authorization, 'Bearer secret')
  assert.deepEqual(req.body.to, ['me@x.com'])
  assert.equal(req.body.reply_to, '"Ayesha Khan" <ayesha@example.com>')
})

// ---------- the HTTP route ----------
async function withServer(opts, fn) {
  const app = express()
  app.use(express.json({ limit: '32kb' }))
  app.use('/api', contactRouter(opts))
  const server = app.listen(0)
  await new Promise((r) => server.once('listening', r))
  const url = `http://127.0.0.1:${server.address().port}/api/contact`
  const post = (body) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(
      async (r) => ({ status: r.status, body: await r.json() }),
    )
  try {
    await fn(post)
  } finally {
    server.close()
  }
}

const mailOn = getMailConfig({ EMAIL_PROVIDER: 'console', CONTACT_TO_EMAIL: 'me@x.com' })

test('route: valid message is sent once, with success response', async () => {
  const sent = []
  await withServer({ mail: mailOn, send: async (_c, m) => (sent.push(m), { id: 'x' }) }, async (post) => {
    const r = await post(valid)
    assert.equal(r.status, 200)
    assert.deepEqual(r.body, { ok: true })
  })
  assert.equal(sent.length, 1)
  assert.match(sent[0].text, /Ship Brawl/)
})

test('route: invalid input -> 400 with per-field errors, nothing sent', async () => {
  const sent = []
  await withServer({ mail: mailOn, send: async (_c, m) => (sent.push(m), { id: 'x' }) }, async (post) => {
    const r = await post({ ...valid, email: 'not-an-email', message: 'hey' })
    assert.equal(r.status, 400)
    assert.ok(r.body.fields.email)
    assert.ok(r.body.fields.message)
  })
  assert.equal(sent.length, 0)
})

test('route: bots get a fake success and nothing is sent', async () => {
  const sent = []
  await withServer({ mail: mailOn, send: async (_c, m) => (sent.push(m), { id: 'x' }) }, async (post) => {
    assert.equal((await post({ ...valid, website: 'filled-by-bot' })).status, 200)
    assert.equal((await post({ ...valid, startedAt: Date.now() })).status, 200)
  })
  assert.equal(sent.length, 0)
})

test('route: not configured -> 503; provider failure -> 502', async () => {
  await withServer({ mail: getMailConfig({}) }, async (post) => {
    assert.equal((await post(valid)).status, 503)
  })
  await withServer(
    {
      mail: mailOn,
      send: async () => {
        throw new Error('smtp down')
      },
    },
    async (post) => {
      const r = await post(valid)
      assert.equal(r.status, 502)
      assert.ok(!JSON.stringify(r.body).includes('smtp down'), 'internal errors are not leaked')
    },
  )
})

test('route: rate limit kicks in after the allowed number of messages', async () => {
  await withServer({ mail: mailOn, send: async () => ({ id: 'x' }), limit: 2 }, async (post) => {
    assert.equal((await post(valid)).status, 200)
    assert.equal((await post(valid)).status, 200)
    const r = await post(valid)
    assert.equal(r.status, 429)
    assert.match(r.body.error, /Too many/)
  })
})
