# Project Context: Interactive 3D Web Portfolio (Fawwad Zaheer Rizvi)

## 1. Project Overview & Objectives
- **Developer**: Fawwad Zaheer Rizvi
- **Field**: Game Developer (Unity, Unreal Engine 5, C#, Blueprints, Blender)
- **Education**: Bachelor of Science in Computer Science (Gaming & Animation), NED University of Engineering and Technology (2023–2027)
- **Experience**: Undergraduate student; academic and personal projects only (no corporate job history or internships)
- **Core Aesthetic**: Retro handheld gaming console (Game Boy 4-color palette `#e0f8d0`, `#88c070`, `#346856`, `#081820`, CRT scanlines overlay, pixel typography *Press Start 2P* and *IBM Plex Mono*, beveled buttons with solid drop shadows)
- **Academic Objective**: Complete all 6 semester project modules plus Extra Credit while extending the existing codebase.

---

## 2. Technology Stack & Architectural Constraints
- **Architecture**: Root-level frontend (no `frontend/` subfolder). `backend/` and `rag/` added alongside when needed.
- **Language**: Pure JavaScript (JSX, ES modules) — no TypeScript.
- **Styling**: Handcrafted CSS in `src/styles.css` — no Tailwind CSS migration.
- **Frontend Core**: React 18 (`^18.3.1`) + Vite (`^5.4.0`) with `@vitejs/plugin-react` (`^4.3.1`).
- **3D Graphics**: Three.js (`^0.160.1`), `@react-three/fiber` (`^8.18.0`, React 18 compatible), `@react-three/drei` (`^9.122.0`).
- **Media Preservation**: Exact paths in `public/media/games/` and `public/media/models/` preserved without duplication.

---

## 3. Repository Structure (Root-Level Frontend)
```
Web3D_SemProject/
├── .gitignore
├── README.md
├── PROJECT_CONTEXT.md               # Persistent tracking document
├── rules.md                         # Rules (Tailwind/subfolder rules overridden)
├── index.html                       # HTML entry point with fonts & metadata
├── package.json                     # Root frontend dependencies (React 18 + Three.js + R3F)
├── package-lock.json
├── vite.config.js                   # Vite configuration
├── docs/                            # Academic deliverables & specifications
│   ├── requirements.md              # Semester project requirements
│   ├── video-storyboard.md          # Module 3 deliverable (pending)
│   ├── rag-explained.md             # Module 4 deliverable (pending)
│   └── report-outline.md            # Module 6 deliverable (pending)
├── data/                            # Ground truth for RAG
│   └── profile.md                   # Bio, education, skills, projects
├── public/
│   ├── favicon.svg
│   ├── media/
│   │   ├── games/                   # Gameplay MP4s, posters, screenshots
│   │   └── models/                  # Turntable MP4s, renders, wireframes
│   ├── models/
│   │   └── avatar.glb               # Module 2 placeholder/final GLB (pending)
│   └── video/
│       └── promo.mp4                # Module 3 placeholder/final MP4 (pending)
├── src/
│   ├── main.jsx                     # App entry point
│   ├── App.jsx                      # Section composition
│   ├── styles.css                   # Retro styling, scanlines, variables, palettes
│   ├── data.js                      # Content definition (games, models, education, exp)
│   ├── hooks.js                     # useTypewriter, reduced motion
│   └── components/
│       ├── Header.jsx               # Sticky pixel header, nav links & ThemeToggle
│       ├── Hero.jsx                 # Intro banner with typewriter, CTAs & Canvas3D
│       ├── Canvas3D.jsx             # Interactive 3D WebGL element with mouse reaction & 2D fallback
│       ├── ThemeToggle.jsx          # Retro palette switcher (DMG Green, Pocket Mono, CRT Night)
│       ├── Games.jsx                # Level-select menu with video, lightbox, search & engine filters
│       ├── Models.jsx               # 3D model cards (Render/Wire/Video) with search & tag filters
│       ├── Experience.jsx           # Education (NED University) & Academic Experience
│       ├── About.jsx                # Bio & technical skills definition list
│       ├── Lightbox.jsx             # Accessible full-screen screenshot viewer
│       └── Contact.jsx              # Contact section (mailto -> form in Module 5)
├── backend/                         # Express server (Modules 4 & 5)
└── rag/                             # Ingestion scripts (Module 4)
```

---

## 4. Module Status Tracker
- **Phase 0 (Workspace Harmonization)**: ✅ Completed (Root-level frontend aligned with origin git repo, `data/` and `docs/` organized, baseline build tested).
- **Module 1 (Portfolio Website & 3D Elements)**: ✅ Completed & Verified in Browser
  - Responsive retro layout preserved.
  - Interactive 3D WebGL Canvas (`Canvas3D.jsx`) with mouse-reactive tilting crystal/orbiting wireframe rings and 2D WebGL fallback (*Extra Credit #2*).
  - Retro Palette Switcher (`ThemeToggle.jsx`): DMG Green, Pocket Mono, CRT Night (*Extra Credit #1*).
  - Education & Experience section added (`Experience.jsx`) featuring NED University (2023–2027) BS CS Gaming & Animation and academic projects notice.
  - Project Search & Tag Filtering for Games and 3D Models (*Extra Credit #4*).
  - Reduced-motion check & ARIA labels (*Extra Credit #5*).
- **Module 2 (Custom 3D Avatar)**: ⏳ Pending approval & planning.
- **Module 3 (Promotional Video)**: ⏳ Pending.
- **Module 4 (RAG AI Chatbot)**: ⏳ Pending.
- **Module 5 (Contact System)**: ⏳ Pending.
- **Module 6 (Deployment & Docs)**: ⏳ Pending.

---

## 5. Decision Log & Rule Conflict Overrides
- **Decision 1**: Root-level frontend preserved; `rules.md` reference to `frontend/` overridden.
- **Decision 2**: `src/styles.css` preserved; `rules.md` reference to Tailwind overridden.
- **Decision 3**: Plain JavaScript (JSX) preserved; no TypeScript migration.
- **Decision 4**: React 18 dependency compatibility strictly maintained (`three@^0.160.1`, `@react-three/fiber@^8.18.0`, `@react-three/drei@^9.122.0`).
- **Decision 5**: Experience section restricted strictly to academic and personal projects (no hallucinated corporate jobs).

---

## 6. Manual Tasks Checklist for Fawwad
1. Model, rig, and export 3D avatar in Blender as Draco GLB $\rightarrow$ `public/models/avatar.glb` (Module 2).
2. Create 30–60s promotional video in After Effects following `docs/video-storyboard.md` $\rightarrow$ `public/video/promo.mp4` (Module 3).
3. Supply local API keys in `.env` when prompted (LLM API key, email credentials).
4. Connect GitHub repo to Vercel/Netlify and Render/Railway for deployment.

---

## 7. Version Control & Git State
- **Remote Origin**: `https://github.com/FawwadZaheer/portfolio-website`
- **Module 1 Commit**: Staged for commit
