// Vercel serverless function: runs the same Express app as backend/ for every /api/* request
// (vercel.json rewrites /api/... here). Locally you still use `npm run dev` in backend/.
import app from '../backend/src/app.js'

export default app
