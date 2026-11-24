import { useEffect, useRef } from 'react'
import { MEDIA_VERSION } from '../data.js'

export default function PromoVideo({ onClose }) {
  const closeRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="video-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-video-title"
      onClick={onClose}
    >
      <div
        className="video-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="video-modal-header">
          <span id="promo-video-title" className="video-modal-title">
            ▶ PROMO_TAPE // 44S_REEL
          </span>
          <button
            ref={closeRef}
            type="button"
            className="video-close-btn"
            onClick={onClose}
            aria-label="Close promo video"
          >
            ✕ CLOSE
          </button>
        </div>

        <div className="video-container">
          <video
            ref={videoRef}
            src={`/video/promo.mp4?v=${MEDIA_VERSION}`}
            poster="/media/fawwad-portrait.jpg"
            controls
            autoPlay
            playsInline
            preload="auto"
            className="promo-video-element"
            aria-label="Fawwad Zaheer Rizvi Portfolio Promotional Reel"
          />
        </div>

        <div className="video-modal-footer">
          <span className="video-meta-badge">1080P HD · 30 FPS · H.264 · CHIPTUNE STEREO</span>
          <a
            href={`/video/promo.mp4?v=${MEDIA_VERSION}`}
            download="Fawwad_Zaheer_Promo.mp4"
            className="video-download-link"
          >
            ↓ DOWNLOAD MP4
          </a>
        </div>
      </div>
    </div>
  )
}
