import { useEffect, useRef, useState } from 'react'
import { game, useGame, player, closePanel } from './store.js'
import { run, checkpoints, formatTime, leaveRun, leavePoint, REWARD_IMAGES, REWARD_SOUNDS, REWARD_VIDEOS } from './obby.js'
import { sfx } from './sfx.js'

/** Timer, checkpoint count and the respawn / leave buttons while a run is on. */
export function ObbyHud({ touch }) {
  const running = useGame((s) => s.obby.running)
  const cp = useGame((s) => s.obby.cp)
  const best = useGame((s) => s.obby.best)
  const timeRef = useRef(null)

  useEffect(() => {
    if (!running) return undefined
    let raf
    const tick = () => {
      if (timeRef.current) timeRef.current.textContent = formatTime(performance.now() - run.startedAt)
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [running])

  if (!running) return null
  return (
    <div className="obby-hud" role="status" aria-label="Obby run">
      <span className="obby-label">SKY OBBY</span>
      <span className="obby-time" ref={timeRef} aria-live="off">
        0:00.0
      </span>
      <span className="obby-meta">
        ⚑ {cp}/{checkpoints.length - 1}
        {best != null && <> · BEST {formatTime(best)}</>}
      </span>
      <div className="obby-actions">
        <button type="button" className="theme-toggle-btn" onClick={() => (run.respawnQueued = true)}>
          ↺ {touch ? 'RESPAWN' : 'RESPAWN (R)'}
        </button>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={() => {
            leaveRun()
            player.warpTo = leavePoint()
          }}
        >
          ✕ LEAVE
        </button>
      </div>
    </div>
  )
}

/** Shown when the finish platform is reached. The prize image is only requested now. */
export function ObbyFinish() {
  const { time, best, newBest, falls } = useGame((s) => s.obby)
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    return () => sfx.close()
  }, [])

  const leave = () => {
    closePanel()
    player.warpTo = leavePoint()
  }

  return (
    <div className="game-panel-backdrop" onClick={closePanel}>
      <div
        className="game-panel obby-finish"
        role="dialog"
        aria-modal="true"
        aria-labelledby="obby-finish-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="game-panel-head">
          <span id="obby-finish-title">SKY OBBY // COURSE CLEAR!</span>
          <button ref={closeRef} type="button" className="video-close-btn" onClick={closePanel}>
            ✕ CLOSE
          </button>
        </header>
        <div className="game-panel-body">
          <p className="obby-finish-kicker">★ YOU BEAT THE OBBY ★</p>
          <dl className="obby-finish-stats">
            <div>
              <dt>TIME</dt>
              <dd>{formatTime(time)}</dd>
            </div>
            <div>
              <dt>BEST</dt>
              <dd>
                {formatTime(best)}
                {newBest && <span className="obby-new"> NEW!</span>}
              </dd>
            </div>
            <div>
              <dt>FALLS</dt>
              <dd>{falls ?? 0}</dd>
            </div>
          </dl>

          <p className="obby-finish-prize">Your prize:</p>
          <Prize />

          <div className="play-row">
            <button type="button" className="btn primary" onClick={leave}>
              ▼ BACK TO THE ISLAND
            </button>
            <button type="button" className="btn" onClick={closePanel}>
              STAY UP HERE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The prize. A video (public/media/obby/reward.mp4) plays with sound if there is one;
 * otherwise a picture plus a tune. Nothing here is downloaded before the course is beaten.
 */
function Prize() {
  const [vidIndex, setVidIndex] = useState(0)
  const [vidState, setVidState] = useState('loading') // loading | ok | missing
  const [imgIndex, setImgIndex] = useState(0)
  const [imgState, setImgState] = useState('loading')
  const [sndIndex, setSndIndex] = useState(0)
  const [sndState, setSndState] = useState('loading')

  if (vidState !== 'missing') {
    return (
      <div className="obby-reward">
        <video
          key={vidIndex}
          src={REWARD_VIDEOS[vidIndex]}
          autoPlay
          controls
          playsInline
          onLoadedData={() => setVidState('ok')}
          onError={() =>
            vidIndex + 1 < REWARD_VIDEOS.length ? setVidIndex(vidIndex + 1) : setVidState('missing')
          }
        />
        {vidState === 'loading' && <span className="obby-reward-loading">LOADING PRIZE…</span>}
      </div>
    )
  }

  return (
    <>
      <div className="obby-reward">
        {imgState !== 'missing' ? (
          <img
            key={imgIndex}
            src={REWARD_IMAGES[imgIndex]}
            alt="Obby prize"
            onLoad={() => setImgState('ok')}
            onError={() =>
              imgIndex + 1 < REWARD_IMAGES.length ? setImgIndex(imgIndex + 1) : setImgState('missing')
            }
          />
        ) : (
          <p className="obby-reward-missing">
            Prize not found. Put <code>reward.mp4</code> (or a picture such as <code>reward.gif</code>) in{' '}
            <code>public/media/obby/</code>.
          </p>
        )}
        {imgState === 'loading' && <span className="obby-reward-loading">LOADING PRIZE…</span>}
      </div>
      {/* The prize tune starts by itself (the game's music pauses while it plays). */}
      {imgState !== 'missing' && sndState !== 'missing' && (
        <audio
          key={sndIndex}
          className="obby-reward-audio"
          src={REWARD_SOUNDS[sndIndex]}
          autoPlay
          controls
          onCanPlay={() => setSndState('ok')}
          onError={() =>
            sndIndex + 1 < REWARD_SOUNDS.length ? setSndIndex(sndIndex + 1) : setSndState('missing')
          }
        />
      )}
    </>
  )
}

/** R respawns at the last checkpoint during a run. */
export function useObbyKeys() {
  useEffect(() => {
    const down = (e) => {
      const s = game.get()
      if (e.code !== 'KeyR' || !run.active || s.panel || s.menuOpen) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      run.respawnQueued = true
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])
}
