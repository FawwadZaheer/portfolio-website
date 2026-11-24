// Local / Render entry point: `npm start` (or `npm run dev`) in backend/.
import app, { index, mail } from './app.js'
import { mailConfigured } from './mail.js'

const port = Number(process.env.PORT) || 3001
app.listen(port, () =>
  console.log(
    `API listening on http://localhost:${port} (chat: ${index ? `${index.chunks.length} chunks indexed` : 'off'}, contact: ${mailConfigured(mail) ? mail.provider : 'off'})`,
  ),
)
