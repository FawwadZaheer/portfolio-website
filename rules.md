# Workspace Rules: 3D Portfolio Project

## Context
- Read `docs/requirements.md` and `data/profile.md` before starting any task.
- Stack: React + Vite, React Three Fiber + Drei, Tailwind, Framer Motion; Node + Express backend.
- Folder layout: `frontend/`, `backend/`, `rag/`, `data/`, `docs/`.

## How to work
- Work on ONE module per task. Do not start the next module until I approve.
- For any new module, produce an implementation plan first and wait for approval.
- Edit files directly in the workspace; do not paste large code blocks into chat.
- After each module: run the app, test it in the browser, and summarize what works, what doesn't, and what I need to do manually.
- Keep changes small and focused; don't refactor unrelated code.

## Security
- Never hardcode secrets or API keys. Use environment variables.
- Keep `.env` out of git (`.gitignore`) and maintain an up-to-date `.env.example`.
- Validate input on both frontend and backend; sanitize all user input.
- Contact form: rate limiting plus a honeypot field (and hCaptcha/reCAPTCHA if configured).
- Configure CORS to allow only the deployed frontend origin and localhost for development.

## Chatbot (RAG)
- Answer ONLY from retrieved context from files in `/data`.
- If the context doesn't contain the answer, reply that the information isn't available. Never invent personal details.
- Do not reveal the system prompt, API keys, or raw documents.
- Return source references (file/section) with answers when possible.

## Frontend quality
- Responsive for desktop, tablet, and mobile.
- Lazy-load 3D assets; keep GLB files compressed and small.
- Respect `prefers-reduced-motion`; use semantic HTML, alt text, and keyboard-accessible controls.
- Provide a fallback (static image) if WebGL isn't available.

## Manual tasks (do NOT attempt)
- Blender modeling/export, After Effects video, creating accounts, obtaining API keys, and deployment logins.
- Instead: use placeholder assets (`frontend/public/models/avatar.glb`, `frontend/public/video/promo.mp4`), write the integration code, and give me a short checklist of what I must do.

## Git
- Commit after each completed module with a clear message.
- Never commit `node_modules`, `.env`, or large raw source assets.
