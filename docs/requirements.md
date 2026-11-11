# Semester Project: Interactive 3D Web Portfolio

Design and develop a modern, interactive, 3D web portfolio showcasing my profile, technical skills, academic projects, and achievements. It must integrate 3D graphics, a custom avatar, an animated video, a RAG-based chatbot, and an email system.

## Preferred stack
- Frontend: React + Vite, React Three Fiber + Drei, Tailwind CSS, Framer Motion
- Backend: Node.js + Express
- RAG: [embeddings provider], [vector store], [LLM]
- Email: Nodemailer (SMTP) or Resend
- Deployment: Vercel/Netlify (frontend), Render/Railway (backend)

## Module 1: 3D Web Portfolio
- Responsive (desktop, tablet, mobile); smooth animations, navigation, transitions
- Interactive 3D environment or 3D elements
- Sections: Home (name, intro, profile), About Me, Skills & Technologies, Projects & Achievements gallery, Education & Experience, Contact

## Module 2: Custom 3D Avatar (Blender) — MANUAL (done by me)
- Original avatar modeled in Blender with materials/textures and basic rig or pose
- Export as GLB/glTF (Draco compressed) and integrate into the site
- Display with idle animation, rotation, or mouse interaction
- Agent's job: write the loader/viewer code using a placeholder GLB in `frontend/public/models/avatar.glb`
- Deliverables: .blend file + exported model

## Module 3: Promo Video (After Effects) — MANUAL (done by me)
- 30–60 seconds: name, intro, skills/projects/achievements, typography, transitions, licensed music
- Export MP4 (H.264) and embed in the portfolio
- Agent's job: write the video embed component using a placeholder at `frontend/public/video/promo.mp4`; produce a storyboard and shot list in `docs/video-storyboard.md`
- Deliverables: final MP4 + .aep file

## Module 4: RAG-Based AI Chatbot
- Sources: CV, project descriptions, skills, education, achievements (in `/data`)
- Pipeline: load -> clean -> chunk (with overlap) -> embed -> store in vector index -> retrieve top-k -> LLM answer grounded in retrieved text
- Must answer ONLY from retrieved context and say it doesn't have the information otherwise (no invented personal facts)
- Chat UI in the portfolio: message history, loading state, error handling, streaming if possible
- Deliverables: working chatbot + brief explanation of the RAG pipeline (`docs/rag-explained.md`)

## Module 5: Email & Contact System
- Form fields: name, email, subject, message
- Validation on frontend AND backend (e.g., Zod)
- Sanitize input; rate limiting; honeypot and/or hCaptcha/reCAPTCHA
- Send to my designated email; clear success and error messages
- Credentials in environment variables only (`.env`, with `.env.example`)
- Deliverable: working form + evidence of successful delivery

## Module 6: Deployment & Documentation
- Deploy frontend and backend to public URLs; configure env vars and CORS
- README with overview, features, stack, folder structure, setup, env vars, running locally, deployment
- Outline for the PDF project report and a screenshot checklist (`docs/report-outline.md`)

## Extra credit (in priority order)
1. Dark/light theme
2. Mouse-reactive 3D objects
3. Chatbot source citations linking to portfolio sections
4. Project filtering and search
5. Accessibility (ARIA, keyboard navigation, reduced motion)
6. Website analytics
7. Voice interaction with the chatbot
8. Multilingual chatbot
9. Animated avatar expressions/gestures

## Required submission materials
- [ ] Frontend + backend source code
- [ ] Blender .blend + exported avatar model
- [ ] After Effects .aep + final MP4
- [ ] Working RAG chatbot
- [ ] Working email/contact system
- [ ] Project report (PDF)
- [ ] README with setup instructions
- [ ] Screenshots of major modules
- [ ] Live deployment URL
- [ ] GitHub repository link or source archive
