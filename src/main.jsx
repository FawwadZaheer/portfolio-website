import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// This site doesn't use a service worker. Remove any left behind by another project that
// ran on the same address (e.g. localhost:5173): they can serve stale media files.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      if (!regs.length) return
      regs.forEach((r) => r.unregister())
      window.__removedServiceWorkers = regs.length
      if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
    })
    .catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
