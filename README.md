# Fawwad Zaheer Rizvi - Portfolio

React + Vite. Retro handheld look, minimal layout.

## Run locally
    npm install
    npm run dev        # opens at http://localhost:5173

## Build for production
    npm run build      # outputs the finished site to /dist
    npm run preview    # test the production build locally

## Edit your content
Everything (name, email, games, models, about, skills, links) is in `src/data.js`.
Colors are the four variables at the top of `src/styles.css`.

## Media
Web-ready videos and images are in `public/media/`:
    games/<game>/video.mp4, video-poster.webp, shot-1.webp, shot-2.webp
    models/<model>/video.mp4, video-poster.webp, render.webp, wire.webp
To add a new game or model, put its files in a new folder here and add an entry to `src/data.js`.
To add links (itch.io, GitHub) to a game, add `links: [{ label: 'Play on itch.io', href: 'https://...' }]`.

## Deploy
Vercel / Netlify: import the repo, framework "Vite", build command `npm run build`, output directory `dist`.
