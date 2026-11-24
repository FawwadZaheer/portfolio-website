import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { platforms, CENTER, PAD, PILLAR_TOP, THICK, updateCourse, run } from './obby.js'
import { useGame } from './store.js'
import { useTextTexture } from './textTexture.js'

const Mat = ({ c, ...rest }) => <meshStandardMaterial color={c} roughness={0.85} flatShading {...rest} />

function colorFor(kind, p) {
  switch (kind) {
    case 'start':
    case 'checkpoint':
      return p.path
    case 'finish':
      return p.lightest
    case 'move':
      return p.waterLight
    case 'crumble':
      return p.sand
    case 'blink':
      return p.light
    case 'sweeper':
      return p.stone
    default:
      return p.grassDark
  }
}

function Flag({ p, active }) {
  return (
    <group position={[0.9, 0, -0.9]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.2, 6]} />
        <Mat c={p.darkest} />
      </mesh>
      <mesh position={[0.35, active ? 1.95 : 0.55, 0]}>
        <boxGeometry args={[0.7, 0.42, 0.04]} />
        <Mat c={active ? p.lightest : p.dark} />
      </mesh>
    </group>
  )
}

function Trophy({ p }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.elapsedTime * 1.2
    ref.current.position.y = 1.2 + Math.sin(clock.elapsedTime * 2) * 0.12
  })
  return (
    <group ref={ref}>
      <mesh castShadow>
        <cylinderGeometry args={[0.45, 0.2, 0.7, 10]} />
        <Mat c={p.light} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.35, 8]} />
        <Mat c={p.light} />
      </mesh>
      <mesh position={[0, -0.72, 0]}>
        <boxGeometry args={[0.6, 0.14, 0.6]} />
        <Mat c={p.darkest} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[0.5 * sx, 0.1, 0]} rotation-z={sx * 0.4}>
          <torusGeometry args={[0.18, 0.05, 6, 12]} />
          <Mat c={p.light} />
        </mesh>
      ))}
    </group>
  )
}

function Platform({ pl, p, cpIndex }) {
  const group = useRef()
  const top = useRef()
  const bar = useRef()
  const base = colorFor(pl.kind, p)

  useFrame(({ clock }) => {
    updateCourse(clock.elapsedTime)
    const g = group.current
    g.position.set(pl.cur.x, pl.cur.y, pl.cur.z)
    if (pl.kind === 'blink') {
      // visible while solid; flashes during the warning before it vanishes
      const on = pl.solid && !(pl.warn && Math.floor(clock.elapsedTime * 10) % 2)
      g.visible = pl.solid
      top.current.material.opacity = on ? 1 : 0.35
    }
    if (pl.kind === 'crumble') g.visible = pl.drop < 14
    if (bar.current) bar.current.rotation.y = -pl.barAngle
  })

  return (
    <group ref={group} rotation-y={pl.rot}>
      <mesh ref={top} position-y={-THICK / 2} castShadow receiveShadow>
        <boxGeometry args={[pl.w, THICK, pl.d]} />
        <Mat c={base} transparent={pl.kind === 'blink'} />
      </mesh>
      {/* dark rim so the edge reads clearly from above */}
      <mesh position-y={-THICK - 0.06}>
        <boxGeometry args={[pl.w + 0.08, 0.12, pl.d + 0.08]} />
        <Mat c={p.darkest} />
      </mesh>
      {pl.kind === 'crumble' && (
        <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[pl.w * 0.7, 0.08]} />
          <meshBasicMaterial color={p.dark} />
        </mesh>
      )}
      {pl.kind === 'sweeper' && (
        <>
          <mesh position-y={0.45}>
            <cylinderGeometry args={[0.22, 0.28, 0.9, 10]} />
            <Mat c={p.darkest} />
          </mesh>
          <group ref={bar}>
            <mesh position-y={0.32} castShadow>
              <boxGeometry args={[pl.w * 1.24, 0.24, 0.24]} />
              <Mat c={p.darkest} emissive={p.dark} emissiveIntensity={0.4} />
            </mesh>
          </group>
        </>
      )}
      {(pl.kind === 'checkpoint' || pl.kind === 'start') && <Flag p={p} active={cpIndex >= pl.i} />}
      {pl.kind === 'finish' && <Trophy p={p} />}
    </group>
  )
}

function LaunchPad({ p }) {
  const ring = useRef()
  const beam = useRef()
  const running = useGame((s) => s.obby.running)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ring.current.scale.setScalar(1 + (t % 1) * 0.5)
    ring.current.material.opacity = 0.8 * (1 - (t % 1))
    beam.current.material.opacity = running ? 0.05 : 0.18 + Math.sin(t * 3) * 0.06
  })
  const sign = useTextTexture({
    width: 512,
    height: 256,
    bg: p.darkest,
    fg: p.lightest,
    lines: [
      { text: 'SKY OBBY', size: 46 },
      { text: 'STEP ON THE PAD', size: 22, color: p.light },
      { text: 'BEAT IT FOR A PRIZE', size: 22, color: p.light },
    ],
  })
  // sign stands beside the pad, facing the plaza
  const face = Math.atan2(-PAD.x, -PAD.z)
  return (
    <group position={[PAD.x, 0, PAD.z]}>
      <mesh position-y={0.08} receiveShadow>
        <cylinderGeometry args={[PAD.r, PAD.r + 0.15, 0.16, 20]} />
        <Mat c={p.darkest} />
      </mesh>
      <mesh position-y={0.17} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[PAD.r - 0.25, 20]} />
        <meshBasicMaterial color={p.light} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position-y={0.2} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[PAD.r - 0.2, PAD.r, 24]} />
        <meshBasicMaterial color={p.lightest} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={beam} position-y={3}>
        <cylinderGeometry args={[PAD.r - 0.3, PAD.r - 0.3, 6, 16, 1, true]} />
        <meshBasicMaterial color={p.lightest} transparent depthWrite={false} side={2} toneMapped={false} />
      </mesh>
      <group rotation-y={face} position={[Math.sin(face + 1.2) * 2.4, 0, Math.cos(face + 1.2) * 2.4]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[0.2, 2.2, 0.2]} />
          <Mat c={p.wood} />
        </mesh>
        <mesh position={[0, 2.4, 0.12]}>
          <planeGeometry args={[2.2, 1.1]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
        <mesh position={[0, 2.4, 0.05]}>
          <boxGeometry args={[2.3, 1.2, 0.1]} />
          <Mat c={p.darkest} />
        </mesh>
      </group>
    </group>
  )
}

export default function Obby({ p }) {
  const cpPlatformIndex = useGame((s) => (s.obby.running ? run.checkpoint : -1))
  return (
    <group>
      {/* central pillar */}
      <mesh position={[CENTER.x, PILLAR_TOP / 2, CENTER.z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.9, PILLAR_TOP, 8]} />
        <Mat c={p.stone} />
      </mesh>
      {platforms.map((pl) => (
        <Platform key={pl.i} pl={pl} p={p} cpIndex={cpPlatformIndex} />
      ))}
      <LaunchPad p={p} />
    </group>
  )
}
