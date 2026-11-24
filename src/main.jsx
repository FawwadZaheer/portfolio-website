import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

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
