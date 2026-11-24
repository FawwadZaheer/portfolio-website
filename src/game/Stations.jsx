import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import { CanvasTexture, SRGBColorSpace, NearestFilter, DoubleSide, VideoTexture, MathUtils } from 'three'
import { stations, collectibles } from './world.js'
import { game, useGame, player } from './store.js'
import { interact } from './useControls.js'
import { audio } from './audio.js'
import { useTextTexture } from './textTexture.js'
import { profile } from '../data.js'

// Shared click behaviour: a short click (not a camera drag) opens the station.
function useClickable(id) {
  const [hover, setHover] = useState(false)
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hover])
  return {
    onClick: (e) => {
      e.stopPropagation()
      if (e.delta < 8) interact(id)
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      setHover(true)
    },
    onPointerOut: () => setHover(false),
  }
}

const Mat = ({ c, ...rest }) => <meshStandardMaterial color={c} roughness={0.85} flatShading {...rest} />

// ---------------------------------------------------------------- stations

function Billboard({ st, p }) {
  const tex = useTextTexture({
    width: 1024,
    height: 480,
    bg: p.darkest,
    fg: p.lightest,
    lines: [
      { text: 'PLAYER 1', size: 34, color: p.light },
      { text: profile.name.toUpperCase(), size: 44 },
      { text: 'GAME DEVELOPER', size: 30, color: p.light },
      { text: 'UNITY · UNREAL · BLENDER', size: 24 },
      { text: 'WASD MOVE · E INTERACT', size: 22, color: p.light },
    ],
  })
  return (
    <group {...useClickable(st.id)}>
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]} castShadow>
          <boxGeometry args={[0.3, 3.2, 0.3]} />
          <Mat c={p.wood} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[5.6, 2.7, 0.2]} />
        <Mat c={p.darkest} />
      </mesh>
      <mesh position={[0, 2.5, 0.11]}>
        <planeGeometry args={[5.4, 2.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.5, -0.11]} rotation-y={Math.PI}>
        <planeGeometry args={[5.4, 2.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Attract mode: the cabinet screen plays a short muted gameplay loop while the player
 * is nearby, and falls back to the poster otherwise (so only nearby videos decode).
 */
function useAttract(url, st, radius = 16) {
  const video = useMemo(() => {
    if (!url) return null
    const v = document.createElement('video')
    v.src = url
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.preload = 'none'
    v.setAttribute('playsinline', '')
    return v
  }, [url])
  const tex = useMemo(() => {
    if (!video) return null
    const t = new VideoTexture(video)
    t.colorSpace = SRGBColorSpace
    return t
  }, [video])
  const [showing, setShowing] = useState(false)
  const near = useRef(false)

  useEffect(() => {
    if (!video) return undefined
    const on = () => setShowing(true)
    const off = () => setShowing(false)
    video.addEventListener('playing', on)
    video.addEventListener('pause', off)
    return () => {
      video.removeEventListener('playing', on)
      video.removeEventListener('pause', off)
      video.pause()
      video.removeAttribute('src')
      video.load()
      tex?.dispose()
      audio.setCabinet(st.id, null)
    }
  }, [video, tex, st.id])

  useFrame(() => {
    if (!video) return
    const s = game.get()
    const want =
      s.phase === 'play' && !s.panel && Math.hypot(player.position.x - st.x, player.position.z - st.z) < radius
    // gameplay sound fades in as you walk up to the cabinet (volume set by the audio manager)
    const d = Math.hypot(player.position.x - st.ix, player.position.z - st.iz)
    const level = want && !s.menuOpen && audio.unlocked ? Math.pow(MathUtils.clamp(1 - d / 5.5, 0, 1), 1.5) : 0
    audio.setCabinet(st.id, video, level)
    if (want === near.current) return
    near.current = want
    if (want) video.play().catch(() => {})
    else video.pause()
  })

  return showing ? tex : null
}

function Arcade({ st, p }) {
  const poster = useTexture(st.data.poster)
  poster.colorSpace = SRGBColorSpace
  const live = useAttract(st.data.attract, st)
  const marquee = useTextTexture({
    width: 512,
    height: 128,
    bg: p.light,
    fg: p.darkest,
    lines: [{ text: st.data.title.toUpperCase(), size: 34 }],
  })
  const screen = useRef()
  useFrame(({ clock }) => {
    // subtle CRT flicker
    screen.current.material.color.setScalar(0.92 + Math.sin(clock.elapsedTime * 30 + st.x) * 0.04)
  })
  return (
    <group {...useClickable(st.id)}>
      {/* cabinet body */}
      <mesh position={[0, 1.25, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 2.5, 1.2]} />
        <Mat c={p.darkest} />
      </mesh>
      {/* side panels */}
      {[-0.78, 0.78].map((x) => (
        <mesh key={x} position={[x, 1.3, 0]} castShadow>
          <boxGeometry args={[0.08, 2.6, 1.45]} />
          <Mat c={p.dark} />
        </mesh>
      ))}
      {/* screen */}
      <mesh position={[0, 1.78, 0.52]} rotation-x={-0.12}>
        <boxGeometry args={[1.32, 0.96, 0.05]} />
        <Mat c={p.darkest} />
      </mesh>
      <mesh ref={screen} position={[0, 1.78, 0.55]} rotation-x={-0.12}>
        <planeGeometry args={[1.2, 0.675]} />
        <meshBasicMaterial map={live || poster} toneMapped={false} />
      </mesh>
      {/* control deck */}
      <mesh position={[0, 1.08, 0.62]} rotation-x={0.35} castShadow>
        <boxGeometry args={[1.45, 0.12, 0.55]} />
        <Mat c={p.dark} />
      </mesh>
      <mesh position={[-0.3, 1.2, 0.66]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
        <Mat c={p.darkest} />
      </mesh>
      <mesh position={[-0.3, 1.31, 0.66]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <Mat c={p.lightest} />
      </mesh>
      {[0.15, 0.38].map((x) => (
        <mesh key={x} position={[x, 1.15, 0.68]} rotation-x={0.35}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 10]} />
          <Mat c={p.lightest} emissive={p.light} emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* marquee */}
      <mesh position={[0, 2.66, 0.25]} castShadow>
        <boxGeometry args={[1.55, 0.42, 0.5]} />
        <Mat c={p.light} />
      </mesh>
      <mesh position={[0, 2.66, 0.51]}>
        <planeGeometry args={[1.5, 0.375]} />
        <meshBasicMaterial map={marquee} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Frame({ st, p }) {
  const tex = useTexture(st.data.render)
  tex.colorSpace = SRGBColorSpace
  const aspect = tex.image ? tex.image.width / tex.image.height : 1.3
  const maxW = 2.2
  const maxH = 1.7
  const w = Math.min(maxW, maxH * aspect)
  const h = w / aspect
  const gem = useRef()
  useFrame(({ clock }) => {
    gem.current.rotation.y = clock.elapsedTime
  })
  return (
    <group {...useClickable(st.id)}>
      {/* plinth */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.7, 0.9]} />
        <Mat c={p.stone} />
      </mesh>
      {/* easel post */}
      <mesh position={[0, 1.3, -0.15]} castShadow>
        <boxGeometry args={[0.16, 1.4, 0.16]} />
        <Mat c={p.wood} />
      </mesh>
      {/* frame */}
      <mesh position={[0, 2.05, 0]} rotation-x={-0.08} castShadow>
        <boxGeometry args={[w + 0.24, h + 0.24, 0.12]} />
        <Mat c={p.darkest} />
      </mesh>
      <mesh position={[0, 2.05, 0.065]} rotation-x={-0.08}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#fff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.05, 0.07]} rotation-x={-0.08}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent />
      </mesh>
      {/* spinning low-poly gem on the plinth */}
      <mesh ref={gem} position={[0.45, 0.9, 0.2]} castShadow>
        <octahedronGeometry args={[0.16, 0]} />
        <Mat c={p.light} emissive={p.light} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

function Academy({ st, p }) {
  const sign = useTextTexture({
    width: 512,
    height: 128,
    bg: p.lightest,
    fg: p.darkest,
    lines: [{ text: 'ACADEMY', size: 44 }],
  })
  const W = 8.2
  const D = 6.2
  return (
    <group {...useClickable(st.id)}>
      {/* base + walls */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[W + 0.8, 0.3, D + 0.8]} />
        <Mat c={p.stone} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, 3.3, D]} />
        <Mat c={p.lightest} />
      </mesh>
      {/* roof */}
      <mesh position={[0, 4.6, 0]} rotation-y={Math.PI / 4} scale={[1, 1, 1]} castShadow>
        <coneGeometry args={[6.4, 2.2, 4]} />
        <Mat c={p.dark} />
      </mesh>
      {/* columns */}
      {[-3, -1.5, 1.5, 3].map((x) => (
        <mesh key={x} position={[x, 1.8, D / 2 + 0.35]} castShadow>
          <cylinderGeometry args={[0.18, 0.2, 3.3, 8]} />
          <Mat c={p.lightest} />
        </mesh>
      ))}
      {/* porch roof */}
      <mesh position={[0, 3.55, D / 2 + 0.3]} castShadow>
        <boxGeometry args={[W, 0.2, 1.1]} />
        <Mat c={p.darkest} />
      </mesh>
      {/* door */}
      <mesh position={[0, 1.3, D / 2 + 0.01]}>
        <planeGeometry args={[1.3, 2.2]} />
        <Mat c={p.wood} />
      </mesh>
      {/* windows */}
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 2.2, D / 2 + 0.01]}>
          <planeGeometry args={[1.1, 1]} />
          <Mat c={p.darkest} emissive={p.light} emissiveIntensity={0.25} />
        </mesh>
      ))}
      {/* sign */}
      <mesh position={[0, 3.05, D / 2 + 0.9]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* steps */}
      <mesh position={[0, 0.1, D / 2 + 1.2]} receiveShadow>
        <boxGeometry args={[2.4, 0.2, 0.8]} />
        <Mat c={p.stone} />
      </mesh>
    </group>
  )
}

function Signboard({ st, p }) {
  const tex = useTextTexture({
    width: 512,
    height: 320,
    bg: p.lightest,
    fg: p.darkest,
    lines: [
      { text: 'ABOUT ME', size: 40 },
      { text: 'SKILLS · TOOLS', size: 24, color: p.dark },
      { text: 'C# · BLUEPRINTS', size: 22, color: p.dark },
    ],
  })
  return (
    <group {...useClickable(st.id)}>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 1, 0]} castShadow>
          <boxGeometry args={[0.18, 2, 0.18]} />
          <Mat c={p.wood} />
        </mesh>
      ))}
      <mesh position={[0, 1.75, 0]} castShadow>
        <boxGeometry args={[2.3, 1.45, 0.12]} />
        <Mat c={p.wood} />
      </mesh>
      <mesh position={[0, 1.75, 0.065]}>
        <planeGeometry args={[2.1, 1.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Mailbox({ st, p }) {
  const nearby = useGame((s) => s.nearby === st.id)
  const flag = useRef()
  useFrame((_, dt) => {
    const target = nearby ? 0 : -Math.PI / 2
    flag.current.rotation.z += (target - flag.current.rotation.z) * Math.min(1, dt * 8)
  })
  return (
    <group {...useClickable(st.id)}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.16, 1.1, 0.16]} />
        <Mat c={p.wood} />
      </mesh>
      <mesh position={[0, 1.3, 0]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.9, 12, 1, false, 0, Math.PI]} />
        <Mat c={p.dark} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.64, 0.3, 0.9]} />
        <Mat c={p.dark} />
      </mesh>
      <mesh position={[0, 1.22, 0.46]}>
        <boxGeometry args={[0.5, 0.36, 0.02]} />
        <Mat c={p.darkest} />
      </mesh>
      {/* envelope slot */}
      <mesh position={[0, 1.28, 0.475]}>
        <planeGeometry args={[0.3, 0.05]} />
        <meshBasicMaterial color={p.lightest} />
      </mesh>
      <group ref={flag} position={[0.34, 1.2, -0.2]} rotation-z={-Math.PI / 2}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <Mat c={p.darkest} />
        </mesh>
        <mesh position={[0, 0.42, 0.1]}>
          <boxGeometry args={[0.03, 0.18, 0.22]} />
          <Mat c={p.lightest} emissive={p.lightest} emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  )
}

function Tv({ st, p }) {
  // animated static + "PLAY" text drawn into a small canvas
  const { tex, canvas } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 120
    const tex = new CanvasTexture(canvas)
    tex.magFilter = NearestFilter
    tex.colorSpace = SRGBColorSpace
    return { tex, canvas }
  }, [])
  const acc = useRef(0)
  useFrame(({ clock }, dt) => {
    acc.current += dt
    if (acc.current < 0.08) return
    acc.current = 0
    const c = canvas.getContext('2d')
    const img = c.createImageData(160, 120)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 90 + 20
      img.data[i] = v * 0.7
      img.data[i + 1] = v
      img.data[i + 2] = v * 0.8
      img.data[i + 3] = 255
    }
    c.putImageData(img, 0, 0)
    c.fillStyle = 'rgba(0,0,0,.55)'
    c.fillRect(20, 40, 120, 40)
    c.fillStyle = '#e0f8d0'
    c.font = '16px "Press Start 2P", monospace'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    if (Math.floor(clock.elapsedTime * 2) % 2 === 0) c.fillText('▶ PLAY', 80, 60)
    else c.fillText('PROMO', 80, 60)
    tex.needsUpdate = true
  })
  return (
    <group {...useClickable(st.id)}>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]} castShadow>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <Mat c={p.darkest} />
        </mesh>
      ))}
      <mesh position={[0, 1.9, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[2.9, 2.1, 1.6]} />
        <Mat c={p.wood} />
      </mesh>
      <mesh position={[0, 1.9, 0.66]}>
        <boxGeometry args={[2.4, 1.7, 0.05]} />
        <Mat c={p.darkest} />
      </mesh>
      <mesh position={[-0.15, 1.9, 0.695]}>
        <planeGeometry args={[1.9, 1.42]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[0.25, -0.25].map((y) => (
        <mesh key={y} position={[1.05, 1.9 + y, 0.7]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.08, 0.08, 0.06, 10]} />
          <Mat c={p.light} />
        </mesh>
      ))}
      {/* antenna */}
      {[-0.4, 0.4].map((r) => (
        <mesh key={r} position={[r * 0.6, 3.3, -0.15]} rotation-z={r}>
          <cylinderGeometry args={[0.02, 0.02, 1, 4]} />
          <Mat c={p.darkest} />
        </mesh>
      ))}
    </group>
  )
}

function Robot({ st, p }) {
  const root = useRef()
  const head = useRef()
  const eyes = useRef()
  const nearby = useGame((s) => s.nearby === st.id)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    root.current.position.y = 0.15 + Math.sin(t * 2) * 0.12
    // turn to look at the player when they come close
    const dx = player.position.x - st.x
    const dz = player.position.z - st.z
    let want = Math.hypot(dx, dz) < 7 ? Math.atan2(dx, dz) - st.facing : Math.sin(t * 0.6) * 0.5
    want = Math.atan2(Math.sin(want), Math.cos(want))
    head.current.rotation.y += (want - head.current.rotation.y) * 0.08
    // blink
    eyes.current.scale.y = Math.sin(t * 1.3) > 0.97 ? 0.15 : 1
  })
  return (
    <group {...useClickable(st.id)}>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.5, 0.7, 24]} />
        <meshBasicMaterial color={p.dark} />
      </mesh>
      <group ref={root}>
        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 0.7]} />
          <Mat c={p.light} />
        </mesh>
        <mesh position={[0, 0.9, 0.36]}>
          <boxGeometry args={[0.5, 0.3, 0.02]} />
          <Mat c={p.darkest} emissive={p.lightest} emissiveIntensity={0.15} />
        </mesh>
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.85, 0]} rotation-z={x > 0 ? -0.3 : 0.3} castShadow>
            <boxGeometry args={[0.15, 0.6, 0.15]} />
            <Mat c={p.dark} />
          </mesh>
        ))}
        <group ref={head} position={[0, 1.55, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.55, 0.6]} />
            <Mat c={p.dark} />
          </mesh>
          <mesh position={[0, 0, 0.305]}>
            <planeGeometry args={[0.65, 0.4]} />
            <meshBasicMaterial color={p.darkest} />
          </mesh>
          <group ref={eyes} position={[0, 0.02, 0.31]}>
            {[-0.15, 0.15].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <planeGeometry args={[0.1, 0.14]} />
                <meshBasicMaterial color={p.isNight ? p.darkest : p.lightest} toneMapped={false} />
              </mesh>
            ))}
          </group>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 4]} />
            <Mat c={p.darkest} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshBasicMaterial color={p.light} toneMapped={false} />
          </mesh>
        </group>
      </group>
      {nearby && (
        <Html position={[1.6, 2.1, 0]} center zIndexRange={[20, 0]}>
          <div className="speech">Ask me anything about Fawwad!</div>
        </Html>
      )}
    </group>
  )
}

const KINDS = {
  billboard: Billboard,
  arcade: Arcade,
  frame: Frame,
  academy: Academy,
  signboard: Signboard,
  mailbox: Mailbox,
  tv: Tv,
  robot: Robot,
}

// ---------------------------------------------------------------- markers & labels

/** Ring on the ground where you stand to interact + a "!" over stations you haven't opened yet. */
function Marker({ st, p }) {
  const nearby = useGame((s) => s.nearby === st.id)
  const visited = useGame((s) => s.visited.includes(st.id))
  const ring = useRef()
  const bang = useRef()
  const topY = { academy: 6.4, billboard: 4.4, arcade: 3.5, frame: 3.4, tv: 3.9, robot: 3.1, signboard: 3.1, mailbox: 2.2 }[st.kind]
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const s = nearby ? 1.15 + Math.sin(t * 6) * 0.08 : 1
    ring.current.scale.setScalar(s)
    ring.current.material.opacity = nearby ? 0.9 : 0.35
    if (bang.current) {
      bang.current.position.y = topY + Math.sin(t * 3 + st.x) * 0.15
      bang.current.rotation.y = t * 1.5
    }
  })
  return (
    <>
      <mesh ref={ring} position={[st.ix, 0.04, st.iz]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.55, 0.75, 4, 1]} />
        <meshBasicMaterial color={nearby ? p.lightest : p.darkest} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {!visited && st.kind !== 'billboard' && (
        <group ref={bang} position={[st.x, topY, st.z]}>
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.16, 0.42, 0.16]} />
            <meshBasicMaterial color={p.darkest} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.16, 0.16, 0.16]} />
            <meshBasicMaterial color={p.darkest} />
          </mesh>
        </group>
      )}
    </>
  )
}

/** Floating name tags; only shown when the player is close enough to read them. */
function Labels() {
  const refs = useRef([])
  useFrame(() => {
    stations.forEach((st, i) => {
      const el = refs.current[i]
      if (!el) return
      const d = Math.hypot(player.position.x - st.x, player.position.z - st.z)
      const show = d < 13 && st.kind !== 'billboard' && st.kind !== 'arcade' // arcades show their name on the marquee
      const v = show ? '1' : '0'
      if (el.style.opacity !== v) el.style.opacity = v
    })
  })
  const y = { academy: 7.3, arcade: 4.2, frame: 4, tv: 4.6, robot: 3.8, signboard: 3.7, mailbox: 2.9 }
  return stations.map((st, i) => (
    <Html key={st.id} position={[st.x, y[st.kind] ?? 3, st.z]} center zIndexRange={[15, 0]} pointerEvents="none">
      <div ref={(el) => (refs.current[i] = el)} className="world-label" style={{ opacity: 0 }}>
        {st.label}
      </div>
    </Html>
  ))
}

// ---------------------------------------------------------------- collectibles

function Cartridge({ c, p }) {
  const taken = useGame((s) => s.collected.includes(c.id))
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.y = t * 2 + c.x
    ref.current.position.y = c.y + Math.sin(t * 2.5 + c.z) * 0.15
  })
  if (taken) return null
  return (
    <group ref={ref} position={[c.x, c.y, c.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.46, 0.56, 0.1]} />
        <Mat c={p.dark} emissive={p.dark} emissiveIntensity={0.3} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0.05, 0.051 * s]} rotation-y={s < 0 ? Math.PI : 0}>
          <planeGeometry args={[0.34, 0.3]} />
          <meshBasicMaterial color={p.isNight ? p.darkest : p.lightest} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, -0.24, 0]}>
        <boxGeometry args={[0.36, 0.06, 0.06]} />
        <Mat c={p.darkest} />
      </mesh>
      {/* pole of light so they're easy to spot */}
      <mesh position={[0, -c.y / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, c.y, 4]} />
        <meshBasicMaterial color={p.lightest} transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

export default function Stations({ p }) {
  return (
    <>
      {stations.map((st) => {
        const C = KINDS[st.kind]
        return (
          <group key={st.id}>
            <group position={[st.x, 0, st.z]} rotation-y={st.facing}>
              <C st={st} p={p} />
            </group>
            <Marker st={st} p={p} />
          </group>
        )
      })}
      <Labels />
      {collectibles.map((c) => (
        <Cartridge key={c.id} c={c} p={p} />
      ))}
    </>
  )
}
