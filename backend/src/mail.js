// Email sending for the contact form. All credentials come from environment variables
// (backend/.env), never from code.
//
// EMAIL_PROVIDER picks how mail is sent:
//   resend   HTTPS API (https://resend.com), needs RESEND_API_KEY. No extra packages.
//   smtp     Any SMTP server, e.g. Gmail with an App Password. Needs SMTP_HOST/PORT/USER/PASS.
//   console  Development only: prints the email in the terminal instead of sending it.
// If EMAIL_PROVIDER is empty it is inferred: RESEND_API_KEY -> resend, SMTP_HOST -> smtp.

export class MailError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'MailError'
    this.status = status
  }
}

export function getMailConfig(env = process.env) {
  const provider =
    (env.EMAIL_PROVIDER || '').trim().toLowerCase() ||
    (env.RESEND_API_KEY ? 'resend' : env.SMTP_HOST ? 'smtp' : 'none')
  return {
    provider,
    to: (env.CONTACT_TO_EMAIL || '').trim(),
    from: (env.CONTACT_FROM_EMAIL || '').trim() || 'Portfolio Contact <onboarding@resend.dev>',
    resendKey: env.RESEND_API_KEY || '',
    smtp: {
      host: env.SMTP_HOST || '',
      port: Number(env.SMTP_PORT) || 465,
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
    },
  }
}

/** Is the contact form able to deliver mail with this config? */
export function mailConfigured(cfg) {
  if (!cfg.to) return false
  if (cfg.provider === 'console') return true
  if (cfg.provider === 'resend') return Boolean(cfg.resendKey)
  if (cfg.provider === 'smtp') return Boolean(cfg.smtp.host && cfg.smtp.user && cfg.smtp.pass)
  return false
}

/** Safe RFC 5322 "Display Name" <address>: the name is quoted and stripped of quotes/backslashes. */
export function formatAddress({ name, address }) {
  const clean = String(name || '').replace(/["\\\r\n<>]/g, '').trim()
  return clean ? `"${clean}" <${address}>` : address
}

let smtpTransport = null

/**
 * Send one email. `msg` = { subject, text, html, replyTo: { name, address } }.
 * Resolves to { id } on success, throws MailError on failure.
 */
export async function sendMail(cfg, msg, { fetchImpl = fetch } = {}) {
  if (!mailConfigured(cfg)) throw new MailError('Email is not configured', 503)

  if (cfg.provider === 'console') {
    console.log(
      `\n[contact:console] (not actually sent)\nTo: ${cfg.to}\nReply-To: ${formatAddress(msg.replyTo)}\nSubject: ${msg.subject}\n\n${msg.text}\n`,
    )
    return { id: 'console' }
  }

  if (cfg.provider === 'resend') {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: cfg.from,
        to: [cfg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        reply_to: formatAddress(msg.replyTo),
      }),
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300)
      throw new MailError(`Resend API ${res.status}: ${detail}`, 502)
    }
    const data = await res.json().catch(() => ({}))
    return { id: data.id || 'resend' }
  }

  if (cfg.provider === 'smtp') {
    if (!smtpTransport) {
      const { default: nodemailer } = await import('nodemailer')
      smtpTransport = nodemailer.createTransport({
        host: cfg.smtp.host,
        port: cfg.smtp.port,
        secure: cfg.smtp.port === 465,
        auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
      })
    }
    try {
      const info = await smtpTransport.sendMail({
        from: cfg.from.includes('resend.dev') ? `Portfolio Contact <${cfg.smtp.user}>` : cfg.from,
        to: cfg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        replyTo: { name: msg.replyTo.name, address: msg.replyTo.address }, // nodemailer encodes it safely
      })
      return { id: info.messageId || 'smtp' }
    } catch (err) {
      throw new MailError(`SMTP: ${err.message}`, 502)
    }
  }

  throw new MailError(`Unknown EMAIL_PROVIDER "${cfg.provider}"`, 503)
}
