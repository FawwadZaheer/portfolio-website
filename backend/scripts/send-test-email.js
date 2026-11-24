// Sends one test message through the configured provider, as evidence that
// email delivery works (Module 5).  Usage:  cd backend && npm run test:email
import { loadEnv } from '../../rag/env.js'
import { getMailConfig, mailConfigured, sendMail } from '../src/mail.js'
import { buildEmail } from '../src/routes/contact.js'

loadEnv()
const mail = getMailConfig()

if (!mailConfigured(mail)) {
  console.error(
    'Email is not configured. In backend/.env set CONTACT_TO_EMAIL and EMAIL_PROVIDER (resend or smtp) with its credentials.',
  )
  process.exit(1)
}

const msg = buildEmail({
  name: 'Portfolio test',
  email: mail.to,
  subject: 'Test message from the contact system',
  message: `If you can read this, the portfolio contact form can deliver email.\nProvider: ${mail.provider}\nTime: ${new Date().toISOString()}`,
})

try {
  const { id } = await sendMail(mail, msg)
  console.log(`Sent via ${mail.provider} to ${mail.to} (id: ${id}). Check your inbox (and the spam folder).`)
} catch (err) {
  console.error('Sending failed:', err.message)
  process.exit(1)
}
