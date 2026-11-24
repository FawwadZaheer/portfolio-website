import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Group, Vector3, MathUtils } from 'three'
import { game, input, player, toast } from './store.js'
import { stations, collectibles, circleColliders, boxColliders, trees, WALK_RADIUS } from './world.js'
import { sfx } from './sfx.js'
import {
  platforms,
  PAD,
  run,
  updateCourse,
  isOver,
  barHits,
  startRun,
  leaveRun,
  reachCheckpoint,
  finishRun,
  tangentHeading,
} from './obby.js'
import { audio } from './audio.js'

export const AVATAR_URL = '/models/avatar.glb'
const DRACO_PATH = '/draco/'
const HEIGHT = 1.8
const WALK = 4.6
const RUN = 7.4
const GRAVITY = 24
const JUMP_V = 8
const BODY_R = 0.38
const INTERACT_R = 2.4
const LAUNCH_V = 18.5 // launch pad: enough to clear the start platform
const COYOTE = 0.1 // you can still jump this long after walking off an edge
const JUMP_BUFFER = 0.13 // a jump pressed this long before landing still counts

const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

function resolveCollisions(p) {
  for (const c of circleColliders) {
    const dx = p.x - c.x
    const dz = p.z - c.z
    const min = c.r + BODY_R
    const d2 = dx * dx + dz * dz
    if (d2 < min * min) {
      const d = Math.sqrt(d2) || 0.0001
      p.x = c.x + (dx / d) * min
      p.z = c.z + (dz / d) * min
    }
  }
  for (const b of boxColliders) {
    const hx = b.hx + BODY_R
    const hz = b.hz + BODY_R
    const dx = p.x - b.x
    const dz = p.z - b.z
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      const px = hx - Math.abs(dx)
      const pz = hz - Math.abs(dz)
      if (px < pz) p.x = b.x + Math.sign(dx || 1) * hx
      else p.z = b.z + Math.sign(dz || 1) * hz
    }
  }
  const r = Math.hypot(p.x, p.z)
  if (r > WALK_RADIUS) {
    p.x *= WALK_RADIUS / r
    p.z *= WALK_RADIUS / r
  }
}

/** The avatar GLB, scaled to HEIGHT with its feet on y = 0, facing +Z. */
function useAvatar() {
  const { scene } = useGLTF(AVATAR_URL, DRACO_PATH)
  return useMemo(() => {
    const clone = scene.clone(true)
    clone.updateMatrixWorld(true)
    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    clone.position.set(-center.x, -box.min.y, -center.z)
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = false
      }
    })
    const wrapper = new Group()
    wrapper.add(clone)
    wrapper.scale.setScalar(HEIGHT / (size.y || 1))
    return wrapper
  }, [scene])
}

export default function Player() {
  const avatar = useAvatar()
  const root = useRef()
  const body = useRef()
  const shadow = useRef()
  const { camera } = useThree()

  const sim = useRef({
    pos: new Vector3(player.position.x, 0, player.position.z),
    vel: new Vector3(),
    vy: 0,
    grounded: true,
    heading: player.heading,
    stride: 0,
    squash: 0,
    lastNearby: null,
    camPos: new Vector3(0, 4, 16),
    look: new Vector3(),
    coyote: 0,
    jumpBuf: 0,
    plat: null, // platform the player is standing on
    camY: 0, // smoothed height the camera follows (so jumps don't jerk the view)
    safeUntil: 0, // brief protection from the sweeper bar right after a respawn
  }).current

  function respawn(fell, msg = 'OOF! BACK TO THE CHECKPOINT') {
    const cp = platforms[run.checkpoint]
    sim.pos.set(cp.cur.x, cp.cur.y, cp.cur.z)
    sim.vel.set(0, 0, 0)
    sim.vy = 0
    sim.plat = cp
    sim.grounded = true
    sim.heading = tangentHeading(cp)
    input.camYawTarget = sim.heading - Math.PI
    run.respawnQueued = false
    sim.safeUntil = performance.now() + 900
    if (fell) {
      run.falls++
      toast(msg, 1600)
    }
    sfx.warp()
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = game.get()
    const playing = s.phase === 'play' && !s.panel && !s.menuOpen
    const now = state.clock.elapsedTime
    updateCourse(now)

    // ---- fast travel ----
    if (player.warpTo) {
      if (run.active) leaveRun()
      sim.plat = null
      sim.pos.set(player.warpTo.x, 0, player.warpTo.z)
      sim.vel.set(0, 0, 0)
      sim.vy = 0
      sim.heading = player.warpTo.heading
      input.camYaw = player.warpTo.heading - Math.PI
      player.warpTo = null
      sfx.warp()
    }

    // ---- input → camera-relative direction ----
    let ix = 0
    let iz = 0
    const k = input.keys
    if (k.has('KeyW') || k.has('ArrowUp')) iz -= 1
    if (k.has('KeyS') || k.has('ArrowDown')) iz += 1
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1
    ix += input.joy.x
    iz += input.joy.y
    const len = Math.hypot(ix, iz)
    if (len > 1) {
      ix /= len
      iz /= len
    }
    if (!playing) ix = iz = 0
    const running = k.has('ShiftLeft') || k.has('ShiftRight') || Math.hypot(input.joy.x, input.joy.y) > 0.92
    const yaw = input.camYaw
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const rx = Math.cos(yaw)
    const rz = -Math.sin(yaw)
    const speed = running ? RUN : WALK
    const tx = (rx * ix - fx * iz) * speed
    const tz = (rz * ix - fz * iz) * speed

    const accel = 1 - Math.exp(-(sim.grounded ? 12 : 4) * dt)
    sim.vel.x += (tx - sim.vel.x) * accel
    sim.vel.z += (tz - sim.vel.z) * accel

    // ---- ride moving platforms ----
    if (sim.plat && sim.grounded && sim.plat.solid) {
      const pl = sim.plat
      sim.pos.x += pl.cur.x - pl.prev.x
      sim.pos.y += pl.cur.y - pl.prev.y
      sim.pos.z += pl.cur.z - pl.prev.z
    }

    // ---- jump / gravity (with coyote time and a jump buffer, so edges feel fair) ----
    if (input.jumpQueued) sim.jumpBuf = JUMP_BUFFER
    input.jumpQueued = false
    sim.coyote = sim.grounded ? COYOTE : Math.max(0, sim.coyote - dt)
    sim.jumpBuf = Math.max(0, sim.jumpBuf - dt)
    if (sim.jumpBuf > 0 && sim.coyote > 0 && playing) {
      sim.vy = JUMP_V
      sim.grounded = false
      sim.coyote = 0
      sim.jumpBuf = 0
      sim.plat = null
      sfx.jump()
    }
    const wasGrounded = sim.grounded
    const prevY = sim.pos.y
    sim.vy -= GRAVITY * dt
    sim.pos.y += sim.vy * dt
    sim.grounded = false
    let landed = null
    if (sim.vy <= 0) {
      // land on the highest platform whose top we just passed through
      let top = -Infinity
      for (const pl of platforms) {
        if (!pl.solid || prevY < pl.prev.y - 0.08 || sim.pos.y > pl.cur.y) continue
        if (pl.cur.y > top && isOver(pl, sim.pos.x, sim.pos.z)) {
          top = pl.cur.y
          landed = pl
        }
      }
      if (landed) {
        if (!wasGrounded && sim.vy < -4) sim.squash = Math.min(1, -sim.vy / 14)
        sim.pos.y = landed.cur.y
        sim.vy = 0
        sim.grounded = true
      }
    }
    if (!landed && sim.pos.y <= 0) {
      if (!wasGrounded && sim.vy < -4) sim.squash = Math.min(1, -sim.vy / 14)
      sim.pos.y = 0
      sim.vy = 0
      sim.grounded = true
    }
    sim.plat = landed
    if (landed && s.phase === 'play') {
      if (landed.kind === 'crumble' && landed.touchedAt == null) landed.touchedAt = now
      if (landed.kind === 'checkpoint' && reachCheckpoint(landed.i)) sfx.coin()
      if (landed.kind === 'finish' && run.active) {
        finishRun()
        sfx.fanfare()
      }
    }

    // ---- obby: launch pad, falls and the sweeper bar ----
    if (s.phase === 'play' && !run.active && sim.grounded && sim.pos.y < 0.1 && playing) {
      if (Math.hypot(sim.pos.x - PAD.x, sim.pos.z - PAD.z) < PAD.r * 0.8) {
        startRun()
        sim.pos.x = PAD.x
        sim.pos.z = PAD.z
        sim.vel.set(0, 0, 0)
        sim.vy = LAUNCH_V
        sim.grounded = false
        sim.coyote = 0
        sfx.start()
      }
    }
    if (run.active) {
      const cp = platforms[run.checkpoint]
      if (run.respawnQueued) respawn(false)
      else if (sim.vy < 0 && sim.pos.y < cp.base.y - 4.5) respawn(true)
      else if (
        performance.now() > sim.safeUntil &&
        platforms.some((pl) => barHits(pl, sim.pos.x, sim.pos.y, sim.pos.z))
      ) {
        respawn(true, 'BONK! JUMP OVER THE BAR')
      }
    }

    sim.pos.x += sim.vel.x * dt
    sim.pos.z += sim.vel.z * dt
    resolveCollisions(sim.pos)

    // ---- facing ----
    const hSpeed = Math.hypot(sim.vel.x, sim.vel.z)
    if (hSpeed > 0.3) sim.heading = lerpAngle(sim.heading, Math.atan2(sim.vel.x, sim.vel.z), 1 - Math.exp(-14 * dt))

    root.current.position.copy(sim.pos)
    root.current.rotation.y = sim.heading
    player.position.x = sim.pos.x
    player.position.y = sim.pos.y
    player.position.z = sim.pos.z
    player.heading = sim.heading

    // ---- procedural animation (the GLB has no rig, so we animate the whole body) ----
    const t = state.clock.elapsedTime
    const move = Math.min(1, hSpeed / WALK)
    sim.stride += dt * (6 + hSpeed * 1.6)
    sim.squash = Math.max(0, sim.squash - dt * 4)
    const b = body.current
    if (sim.grounded) {
      b.position.y = Math.abs(Math.sin(sim.stride)) * 0.11 * move
      b.rotation.z = Math.sin(sim.stride) * 0.08 * move
      b.rotation.x = MathUtils.lerp(b.rotation.x, 0.14 * move * (running ? 1.5 : 1), 0.2)
      const breathe = Math.sin(t * 2.2) * 0.012 * (1 - move)
      const sq = Math.sin(sim.squash * Math.PI) * 0.22
      b.scale.set(1 + sq * 0.5, 1 + breathe - sq, 1 + sq * 0.5)
    } else {
      b.position.y = 0
      b.rotation.z *= 0.9
      b.rotation.x = MathUtils.lerp(b.rotation.x, sim.vy > 0 ? -0.08 : 0.12, 0.15)
      const st = MathUtils.clamp(Math.abs(sim.vy) / JUMP_V, 0, 1) * 0.1
      b.scale.set(1 - st * 0.5, 1 + st, 1 - st * 0.5)
    }
    // blob shadow sits on whatever is below (ground or a platform) and shrinks with height
    let support = 0
    for (const pl of platforms) {
      if (pl.solid && pl.cur.y <= sim.pos.y + 0.01 && pl.cur.y > support && isOver(pl, sim.pos.x, sim.pos.z, 0)) support = pl.cur.y
    }
    const above = sim.pos.y - support
    const sh = 1 / (1 + above * 0.5)
    shadow.current.scale.setScalar(sh)
    shadow.current.position.y = -above + 0.02
    shadow.current.material.opacity = 0.35 * sh

    // ---- camera ----
    if (s.phase === 'title') input.camYaw += dt * 0.25
    else if (input.camYawTarget != null) {
      input.camYaw = lerpAngle(input.camYaw, input.camYawTarget, 1 - Math.exp(-3.5 * dt))
      if (Math.abs(Math.sin((input.camYaw - input.camYawTarget) / 2)) < 0.004) input.camYawTarget = null
    }
    const titleView = s.phase === 'title'
    // follow height smoothly: lag a little on the way up, catch up faster when falling
    const follow = sim.pos.y < sim.camY ? 9 : 4
    sim.camY += (sim.pos.y - sim.camY) * (1 - Math.exp(-follow * dt))
    if (Math.abs(sim.pos.y - sim.camY) > 8) sim.camY = sim.pos.y // respawns / warps
    const dist = titleView ? 5.2 : input.camDist
    const pitch = titleView ? 0.18 : input.camPitch
    const target = sim.camPos.set(
      sim.pos.x + Math.sin(input.camYaw) * Math.cos(pitch) * dist,
      sim.camY + 1.2 + Math.sin(pitch) * dist,
      sim.pos.z + Math.cos(input.camYaw) * Math.cos(pitch) * dist,
    )
    // pull the camera in front of any tree between it and the player
    if (!titleView && sim.pos.y < 4) {
      const lx = sim.pos.x
      const lz = sim.pos.z
      const dx = target.x - lx
      const dz = target.z - lz
      const len2 = dx * dx + dz * dz
      let tMin = 1
      for (const tr of trees) {
        const t = ((tr.x - lx) * dx + (tr.z - lz) * dz) / len2
        if (t <= 0 || t >= 1.15) continue
        const px = lx + dx * t - tr.x
        const pz = lz + dz * t - tr.z
        const r = 1.35 * tr.s
        if (px * px + pz * pz < r * r) tMin = Math.min(tMin, Math.max(0.3, t - r / Math.sqrt(len2)))
      }
      if (tMin < 1) {
        target.x = lx + dx * tMin
        target.z = lz + dz * tMin
        target.y = sim.camY + 1.2 + (target.y - sim.camY - 1.2) * tMin
      }
    }
    const ct = 1 - Math.exp(-(titleView ? 3 : 7) * dt)
    camera.position.lerp(target, ct)
    sim.look.lerp(new Vector3(sim.pos.x, sim.camY + (titleView ? 1.1 : 1.3), sim.pos.z), 1 - Math.exp(-12 * dt))
    camera.lookAt(sim.look)

    // ---- audio mix: duck under overlays, waves louder near the shore ----
    const r = Math.hypot(sim.pos.x, sim.pos.z)
    audio.update(
      {
        overlay: !!(s.panel || s.menuOpen),
        shore: MathUtils.smoothstep(r, 10, WALK_RADIUS),
      },
      dt,
    )

    // ---- nearby station ----
    let nearest = null
    let best = INTERACT_R
    for (const st of stations) {
      const d = Math.hypot(sim.pos.x - st.ix, sim.pos.z - st.iz)
      if (d < best) {
        best = d
        nearest = st.id
      }
    }
    if (s.phase !== 'play' || sim.pos.y > 2) nearest = null
    if (nearest !== sim.lastNearby) {
      sim.lastNearby = nearest
      if (nearest) sfx.blip()
      game.set({ nearby: nearest })
    }

    // ---- collectibles ----
    if (s.phase === 'play') {
      for (const c of collectibles) {
        if (s.collected.includes(c.id)) continue
        const dy = c.y - (sim.pos.y + 0.9)
        if (Math.hypot(sim.pos.x - c.x, dy, sim.pos.z - c.z) < 1.15) {
          const n = s.collected.length + 1
          game.set({ collected: [...s.collected, c.id] })
          if (n === collectibles.length) {
            sfx.fanfare()
            toast('★ ALL CARTRIDGES FOUND! 100% COMPLETE ★', 4200)
          } else {
            sfx.coin()
            toast(`CARTRIDGE ${n}/${collectibles.length}`)
          }
          break
        }
      }
    }
  })

  return (
    <group ref={root}>
      <group ref={body}>
        <primitive object={avatar} />
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  )
}

useGLTF.preload(AVATAR_URL, DRACO_PATH)
