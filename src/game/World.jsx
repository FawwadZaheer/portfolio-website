import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import { stations, trees, rocks, ISLAND_RADIUS, ZONES } from './world.js'
import { games } from '../data.js'
import { player } from './store.js'
import { useTextTexture } from './textTexture.js'

const Mat = ({ c, ...rest }) => <meshStandardMaterial color={c} roughness={0.9} flatShading {...rest} />
// Ground layers: matte (no specular sheen at grazing angles)
const Ground = ({ c, ...rest }) => <meshLambertMaterial color={c} {...rest} />

function Water({ p }) {
  const ref = useRef()
  const ring = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ref.current.position.y = -0.55 + Math.sin(t * 0.8) * 0.05
    ring.current.scale.setScalar(1 + ((t * 0.08) % 0.12))
    ring.current.material.opacity = 0.5 - ((t * 0.08) % 0.12) * 4
  })
  return (
    <>
      <mesh ref={ref} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[220, 48]} />
        <Mat c={p.water} roughness={0.4} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={-0.45}>
        <ringGeometry args={[ISLAND_RADIUS + 1.2, ISLAND_RADIUS + 1.8, 40]} />
        <meshBasicMaterial color={p.waterLight} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </>
  )
}

function Island({ p }) {
  return (
    <>
      {/* sand rim */}
      {/* top sits 8 cm below the grass so the two never overlap (was coplanar -> flicker) */}
      <mesh position-y={-0.68} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS + 1.2, ISLAND_RADIUS + 3, 1.2, 40]} />
        <Ground c={p.sand} />
      </mesh>
      {/* grass top */}
      <mesh position-y={-0.25} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS + 0.6, 0.5, 40]} />
        <Ground c={p.grass} />
      </mesh>
      {/* plaza */}
      <mesh position-y={0.03} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[7.5, 8]} />
        <Ground c={p.path} />
      </mesh>
      <mesh position-y={0.035} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[7.5, 7.9, 8]} />
        <meshBasicMaterial color={p.dark} />
      </mesh>
    </>
  )
}

/** Stone paths from the plaza to each station. */
function Paths({ p }) {
  const segs = useMemo(() => {
    const out = []
    const targets = [
      { x: 0, z: -16.5 }, // arcade
      { x: 16.5, z: 0 }, // gallery
      ...stations.filter((s) => !['arcade', 'frame', 'billboard'].includes(s.kind)).map((s) => ({ x: s.ix, z: s.iz })),
    ]
    for (const t of targets) {
      const len = Math.hypot(t.x, t.z)
      const dirx = t.x / len
      const dirz = t.z / len
      for (let d = 8.6; d < len - 0.6; d += 1.25) {
        out.push({ x: dirx * d, z: dirz * d, r: Math.atan2(dirx, dirz) + ((d * 7) % 0.3) - 0.15 })
      }
    }
    return out
  }, [])
  return (
    <Instances limit={segs.length} receiveShadow>
      <boxGeometry args={[1.5, 0.08, 0.95]} />
      <Ground c={p.path} />
      {segs.map((s, i) => (
        <Instance key={i} position={[s.x, 0.05, s.z]} rotation-y={s.r} />
      ))}
    </Instances>
  )
}

/** Wide stone floors under the arcade and the gallery. */
function ZoneFloors({ p }) {
  return (
    <>
      <mesh position={[0, 0.03, -19]} receiveShadow>
        <boxGeometry args={[Math.max(16, games.length * 4.6 + 4), 0.06, 6]} />
        <Ground c={p.path} />
      </mesh>
      <mesh position={[19, 0.03, 0]} receiveShadow>
        <boxGeometry args={[6, 0.06, 21]} />
        <Ground c={p.path} />
      </mesh>
    </>
  )
}

function ZoneSign({ zone, p }) {
  const tex = useTextTexture({
    width: 768,
    height: 128,
    bg: p.darkest,
    fg: p.lightest,
    lines: [{ text: zone.name.toUpperCase(), size: 40 }],
  })
  const facing = Math.atan2(-zone.x, -zone.z)
  return (
    <group position={[zone.x, 0, zone.z]} rotation-y={facing}>
      {[-3.2, 3.2].map((x) => (
        <mesh key={x} position={[x, 2, 0]} castShadow>
          <boxGeometry args={[0.3, 4, 0.3]} />
          <Mat c={p.wood} />
        </mesh>
      ))}
      <mesh position={[0, 3.7, 0]} castShadow>
        <boxGeometry args={[7, 1.05, 0.2]} />
        <Mat c={p.darkest} />
      </mesh>
      <mesh position={[0, 3.7, 0.11]}>
        <planeGeometry args={[6.8, 1.13]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Trees({ p }) {
  return (
    <>
      <Instances limit={trees.length} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 1.4, 6]} />
        <Mat c={p.wood} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 0.7 * t.s, t.z]} scale={t.s} />
        ))}
      </Instances>
      <Instances limit={trees.length} castShadow receiveShadow>
        <coneGeometry args={[1.25, 2.4, 6]} />
        <Mat c={p.grassDark} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 2.2 * t.s, t.z]} rotation-y={t.r} scale={t.s} />
        ))}
      </Instances>
      <Instances limit={trees.length} castShadow>
        <coneGeometry args={[0.9, 1.7, 6]} />
        <Mat c={p.dark} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 3.25 * t.s, t.z]} rotation-y={t.r + 0.5} scale={t.s} />
        ))}
      </Instances>
    </>
  )
}

function Rocks({ p }) {
  return (
    <Instances limit={rocks.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <Mat c={p.stone} />
      {rocks.map((r, i) => (
        <Instance key={i} position={[r.x, 0.25 * r.s, r.z]} rotation={[r.r, r.r * 2, 0]} scale={[r.s, r.s * 0.7, r.s]} />
      ))}
    </Instances>
  )
}

function Clouds({ p }) {
  const group = useRef()
  const clouds = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        a: (i / 9) * Math.PI * 2,
        d: 30 + (i % 3) * 14,
        y: 14 + (i % 4) * 2.5,
        s: 1 + (i % 3) * 0.5,
      })),
    [],
  )
  useFrame((_, dt) => {
    group.current.rotation.y += dt * 0.01
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={[Math.cos(c.a) * c.d, c.y, Math.sin(c.a) * c.d]} scale={c.s}>
          <mesh>
            <boxGeometry args={[4, 1, 2]} />
            <meshBasicMaterial color={p.isNight ? p.light : '#ffffff'} transparent opacity={p.isNight ? 0.35 : 0.85} />
          </mesh>
          <mesh position={[0.8, 0.6, 0]}>
            <boxGeometry args={[2, 1, 1.6]} />
            <meshBasicMaterial color={p.isNight ? p.light : '#ffffff'} transparent opacity={p.isNight ? 0.35 : 0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Sun that follows the player so the shadow map stays sharp around them. */
function Sun({ p }) {
  const light = useRef()
  useFrame(() => {
    const { x, y, z } = player.position
    // follow the player's height too, so shadows stay right up on the sky obby
    light.current.position.set(x + 10, y + 18, z + 8)
    light.current.target.position.set(x, y, z)
    light.current.target.updateMatrixWorld()
  })
  return (
    <directionalLight
      ref={light}
      intensity={p.isNight ? 0.9 : 2.2}
      color={p.isNight ? p.darkest : '#fffbe8'}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-22}
      shadow-camera-right={22}
      shadow-camera-top={22}
      shadow-camera-bottom={-22}
      shadow-camera-near={1}
      shadow-camera-far={60}
      shadow-bias={-0.0002}
      shadow-normalBias={0.06}
    />
  )
}

export default function World({ p }) {
  return (
    <>
      <color attach="background" args={[p.sky]} />
      <fog attach="fog" args={[p.sky, 45, 120]} />
      <hemisphereLight args={[p.isNight ? p.dark : '#ffffff', p.dark, p.isNight ? 1.1 : 1.1]} />
      <ambientLight intensity={p.isNight ? 0.6 : 0.4} />
      <Sun p={p} />
      <Water p={p} />
      <Island p={p} />
      <Paths p={p} />
      <ZoneFloors p={p} />
      {ZONES.map((z) => (
        <ZoneSign key={z.name} zone={z} p={p} />
      ))}
      <Trees p={p} />
      <Rocks p={p} />
      <Clouds p={p} />
    </>
  )
}
