// Contact form validation on the frontend. Mirrors backend/src/routes/contact.js
// (the server checks everything again: never trust the browser).

export const LIMITS = {
  name: [2, 80],
  email: [3, 254],
  subject: [3, 120],
  message: [10, 5000],
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Returns { field: 'error message' } for every invalid field (empty object = valid). */
export function validateContact(values) {
  const errors = {}
  const v = (k) => String(values[k] ?? '').trim()

  if (!v('name')) errors.name = 'Please enter your name.'
  else if (v('name').length < LIMITS.name[0]) errors.name = 'Name is too short.'
  else if (v('name').length > LIMITS.name[1]) errors.name = `Name is too long (${LIMITS.name[1]} characters max).`

  if (!v('email')) errors.email = 'Please enter your email address.'
  else if (v('email').length > LIMITS.email[1] || !EMAIL_RE.test(v('email')))
    errors.email = 'Please enter a valid email address.'

  if (!v('subject')) errors.subject = 'Please enter a subject.'
  else if (v('subject').length < LIMITS.subject[0]) errors.subject = 'Subject is too short.'
  else if (v('subject').length > LIMITS.subject[1]) errors.subject = `Subject is too long (${LIMITS.subject[1]} characters max).`

  if (!v('message')) errors.message = 'Please enter a message.'
  else if (v('message').length < LIMITS.message[0]) errors.message = `Message is too short (${LIMITS.message[0]} characters min).`
  else if (v('message').length > LIMITS.message[1]) errors.message = `Message is too long (${LIMITS.message[1]} characters max).`

  return errors
}
