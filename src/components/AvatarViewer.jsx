import { useState, useRef, useEffect, useLayoutEffect, Suspense } from 'react'
import { Box3, Vector3 } from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Float } from '@react-three/drei'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function AvatarModel({ wireframe, reducedMotion, mouseTracking }) {
  const { scene } = useGLTF('/models/avatar.glb', '/draco/')
  const groupRef = useRef()
  const fitRef = useRef()

  // Centre the model on the turntable axis and scale it to a known height, so it always sits
  // in the middle of the viewport whatever the export's origin and units are.
  useLayoutEffect(() => {
    const fit = fitRef.current
    if (!fit) return
    fit.position.set(0, 0, 0)
    fit.scale.setScalar(1)
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const k = size.y > 0 ? 1.75 / size.y : 1
    fit.scale.setScalar(k)
    fit.position.set(-center.x * k, -center.y * k + 0.1, -center.z * k)
  }, [scene])

  // Apply wireframe toggle dynamically across materials
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.wireframe = wireframe
          })
        } else {
          child.material.wireframe = wireframe
        }
      }
    })
  }, [scene, wireframe])

  // Mouse reactive tilt
  useFrame((state) => {
    if (reducedMotion || !mouseTracking || !groupRef.current) return
    const { x, y } = state.pointer
    groupRef.current.rotation.y = x * 0.35
    groupRef.current.rotation.x = -y * 0.2
  })

  return (
    <group ref={groupRef}>
      <group ref={fitRef}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

function AvatarLoading() {
  return (
    <div className="canvas-fallback" role="status" aria-live="polite">
      <div className="retro-spinner" aria-hidden="true" />
      <p className="fallback-text">[LOADING 3D AVATAR // DRACO DECODE]</p>
    </div>
  )
}

export default function AvatarViewer({ autoRotate = true, wireframe = false, active = true }) {
  const [hasWebGL, setHasWebGL] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const controlsRef = useRef()

  useEffect(() => {
    setReducedMotion(prefersReducedMotion())
    try {
      const canvas = document.createElement('canvas')
      const supported = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
      setHasWebGL(supported)
    } catch {
      setHasWebGL(false)
    }
  }, [])

  if (!hasWebGL) {
    return (
      <div className="canvas-fallback" role="img" aria-label="Avatar 2D Fallback">
        <p className="fallback-text">[2D Fallback: WebGL not available]</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<AvatarLoading />}>
      <Canvas
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 2]}
        camera={{ position: [0, 0.15, 2.75], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 4, 3]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[-3, -2, -2]} intensity={0.8} color="#88c070" />
        <pointLight position={[0, 2, 2]} intensity={1.0} color="#e0f8d0" />

        <Float speed={reducedMotion ? 0 : 1.5} rotationIntensity={0.1} floatIntensity={0.3}>
          <AvatarModel
            wireframe={wireframe}
            reducedMotion={reducedMotion}
            mouseTracking={!autoRotate}
          />
        </Float>

        <OrbitControls
          ref={controlsRef}
          enableZoom={true}
          enablePan={false}
          autoRotate={autoRotate && !reducedMotion}
          autoRotateSpeed={2.0}
          minDistance={1.4}
          maxDistance={4.5}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 3.5}
        />
      </Canvas>
    </Suspense>
  )
}

// Preload the avatar model for smooth rendering
useGLTF.preload('/models/avatar.glb', '/draco/')
