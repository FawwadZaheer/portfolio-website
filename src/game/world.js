import { games, models } from '../data.js'
import { CENTER as OBBY_CENTER, PAD as OBBY_PAD } from './obby.js'

// World layout. North is -Z. Every station "faces" along its local +Z axis,
// rotated by `facing` (radians around Y).

export const ISLAND_RADIUS = 34
export const WALK_RADIUS = 31
export const SPAWN = { x: 0, z: 9, heading: Math.PI }

const faceCenter = (x, z) => Math.atan2(-x, -z)

const fwd = (facing, d) => [Math.sin(facing) * d, Math.cos(facing) * d]

function station(def) {
  const [fx, fz] = fwd(def.facing, def.reach ?? 2)
  return { ...def, ix: def.x + fx, iz: def.z + fz }
}

export const stations = [
  station({
    id: 'welcome',
    kind: 'billboard',
    label: 'START HERE',
    title: 'Player 1: Fawwad',
    x: 0,
    z: 1,
    facing: 0,
    reach: 2.4,
  }),
  ...games.map((g, i) =>
    station({
      id: `game:${g.id}`,
      kind: 'arcade',
      label: g.title,
      title: g.title,
      zone: 'Games Arcade',
      data: g,
      x: (i - (games.length - 1) / 2) * 4.6,
      z: -19,
      facing: 0,
      reach: 2,
    }),
  ),
  ...models.map((m, i) =>
    station({
      id: `model:${m.id}`,
      kind: 'frame',
      label: m.title,
      title: m.title,
      zone: '3D Model Gallery',
      data: m,
      x: 19,
      z: (i - (models.length - 1) / 2) * 5,
      facing: -Math.PI / 2,
      reach: 2,
    }),
  ),
  station({
    id: 'education',
    kind: 'academy',
    label: 'Academy',
    title: 'Education & Experience',
    x: -20,
    z: 0,
    facing: Math.PI / 2,
    reach: 5.2,
  }),
  station({ id: 'about', kind: 'signboard', label: 'About & Skills', title: 'About me', x: -12, z: 15, facing: faceCenter(-12, 15) }),
  station({ id: 'contact', kind: 'mailbox', label: 'Contact', title: 'Contact', x: 12, z: 15, facing: faceCenter(12, 15), reach: 1.6 }),
  station({ id: 'promo', kind: 'tv', label: 'Promo Tape', title: 'Promo video', x: 13, z: -15, facing: faceCenter(13, -15), reach: 2.6 }),
  station({ id: 'bot', kind: 'robot', label: 'FZR-BOT', title: 'Ask the bot', x: -13, z: -15, facing: faceCenter(-13, -15), reach: 1.8 }),
]

export const stationById = Object.fromEntries(stations.map((s) => [s.id, s]))

export const ZONES = [
  { name: 'Games Arcade', x: 0, z: -25.5 },
  { name: '3D Model Gallery', x: 25.5, z: 0 },
]

// ---- Collectible cartridges ----
export const collectibles = [
  [6, 5, 1.1],
  [-6, 5, 1.1],
  [0, -11, 1.1],
  [-8, -5, 1.1],
  [8, -5, 1.1],
  [0, 21, 2.6], // jump for these
  [-23, 10, 1.1],
  [23, 11, 2.6],
  [-5, -27, 1.1],
  [25, -14, 1.1],
  [-26, -12, 2.6],
  [15, 24, 1.1],
].map(([x, z, y], i) => ({ id: `cart-${i}`, x, y, z }))

// ---- Scenery (seeded so it's the same every visit) ----
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const clearZones = [
  ...stations.map((s) => ({ x: s.x, z: s.z, r: s.kind === 'academy' ? 7.5 : 5 })),
  ...stations.map((s) => ({ x: s.ix, z: s.iz, r: 5 })),
  ...collectibles.map((c) => ({ x: c.x, z: c.z, r: 1.6 })),
  { x: 0, z: 9, r: 4 }, // spawn
  { x: OBBY_CENTER.x, z: OBBY_CENTER.z, r: 8.5 }, // sky obby tower (keeps trees out of the course)
  { x: OBBY_PAD.x, z: OBBY_PAD.z, r: 3 },
]

// distance from point to the segment origin → (tx, tz)
function distToRoute(x, z, tx, tz) {
  const len2 = tx * tx + tz * tz
  const t = Math.max(0, Math.min(1, (x * tx + z * tz) / len2))
  return Math.hypot(x - tx * t, z - tz * t)
}

function isClear(x, z, pad = 0) {
  if (Math.hypot(x, z) < 8) return false // keep the plaza open
  // keep walking routes (and the camera behind the player) free of clutter
  if (stations.some((s) => distToRoute(x, z, s.ix, s.iz) < 3.2 + pad)) return false
  return clearZones.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + pad)
}

const rand = rng(42)
export const trees = []
for (let i = 0; i < 220 && trees.length < 46; i++) {
  const a = rand() * Math.PI * 2
  const d = 12 + rand() * 18
  const x = Math.cos(a) * d
  const z = Math.sin(a) * d
  if (!isClear(x, z, 1)) continue
  if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.6)) continue
  trees.push({ x, z, s: 0.8 + rand() * 0.6, r: rand() * Math.PI })
}

export const rocks = []
for (let i = 0; i < 120 && rocks.length < 16; i++) {
  const a = rand() * Math.PI * 2
  const d = 9 + rand() * 21
  const x = Math.cos(a) * d
  const z = Math.sin(a) * d
  if (!isClear(x, z, 0.5)) continue
  if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2)) continue
  rocks.push({ x, z, s: 0.4 + rand() * 0.7, r: rand() * Math.PI })
}

// ---- Colliders ----
const STATION_RADIUS = { billboard: 0, arcade: 0.95, frame: 0.8, signboard: 0.5, mailbox: 0.45, tv: 1.3, robot: 0.7 }

export const circleColliders = [
  ...stations.filter((s) => STATION_RADIUS[s.kind]).map((s) => ({ x: s.x, z: s.z, r: STATION_RADIUS[s.kind] })),
  // billboard posts
  { x: -2.6, z: 1, r: 0.25 },
  { x: 2.6, z: 1, r: 0.25 },
  // zone sign posts
  ...ZONES.flatMap((zn) => {
    const f = Math.atan2(-zn.x, -zn.z)
    return [-3.2, 3.2].map((o) => ({ x: zn.x + Math.cos(f) * o, z: zn.z - Math.sin(f) * o, r: 0.3 }))
  }),
  ...trees.map((t) => ({ x: t.x, z: t.z, r: 0.45 * t.s })),
  { x: OBBY_CENTER.x, z: OBBY_CENTER.z, r: 0.9 }, // obby pillar
  ...rocks.map((r) => ({ x: r.x, z: r.z, r: 0.85 * r.s })),
]

export const boxColliders = [
  // start billboard board
  { x: 0, z: 1, hx: 2.8, hz: 0.2 },
  // academy building (rotated 90°, so width runs along Z)
  { x: -20, z: 0, hx: 3.1, hz: 4.1 },
]
