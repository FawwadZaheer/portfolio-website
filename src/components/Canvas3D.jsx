import { useState, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, OrbitControls } from '@react-three/drei'
import AvatarViewer from './AvatarViewer.jsx'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function RetroArtifact({ reducedMotion }) {
  const meshRef = useRef()
  const ringRef = useRef()
  const ring2Ref = useRef()

  useFrame((state) => {
    if (reducedMotion) return

    const { x, y } = state.pointer
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.008
      meshRef.current.rotation.x = y * 0.4
      meshRef.current.rotation.z = -x * 0.4
    }

    if (ringRef.current) {
      ringRef.current.rotation.x += 0.012
      ringRef.current.rotation.y += 0.006
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= 0.01
      ring2Ref.current.rotation.z += 0.008
    }
  })

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial
          color="#88c070"
          emissive="#346856"
          roughness={0.4}
          metalness={0.2}
          flatShading
        />
      </mesh>

      <mesh ref={meshRef}>
        <octahedronGeometry args={[1.52, 0]} />
        <meshBasicMaterial color="#081820" wireframe wireframeLinewidth={2} />
      </mesh>

      <mesh ref={ringRef}>
        <torusGeometry args={[2.2, 0.03, 8, 32]} />
        <meshBasicMaterial color="#346856" wireframe />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.5, 0.03, 8, 32]} />
        <meshBasicMaterial color="#88c070" wireframe />
      </mesh>
    </group>
  )
}

function WebGLFallback() {
  return (
    <div className="canvas-fallback" role="img" aria-label="Pixel art representation of 3D gaming crystal">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,10 85,50 50,90 15,50" stroke="currentColor" strokeWidth="4" fill="none" />
        <polygon points="50,10 50,90" stroke="currentColor" strokeWidth="3" />
        <polygon points="15,50 85,50" stroke="currentColor" strokeWidth="3" />
        <polygon points="50,25 75,50 50,75 25,50" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      </svg>
      <p className="fallback-text">[2D Mode: WebGL Fallback Active]</p>
    </div>
  )
}

export default function Canvas3D() {
  const [mode, setMode] = useState('avatar') // 'avatar' | 'artifact'
  const [autoRotate, setAutoRotate] = useState(true)
  const [wireframe, setWireframe] = useState(false)
  const [hasWebGL, setHasWebGL] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

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

  return (
    <div className="hero-canvas-wrap" id="avatar">
      <div className="canvas-header">
        <div className="viewport-tabs" role="tablist" aria-label="3D Viewport mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'avatar'}
            className={`viewport-tab ${mode === 'avatar' ? 'active' : ''}`}
            onClick={() => setMode('avatar')}
          >
            ● 3D AVATAR
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'artifact'}
            className={`viewport-tab ${mode === 'artifact' ? 'active' : ''}`}
            onClick={() => setMode('artifact')}
          >
            ● ARTIFACT
          </button>
        </div>
        <span className="fps-counter">60_FPS</span>
      </div>

      <div className="canvas-body">
        {mode === 'avatar' ? (
          <AvatarViewer autoRotate={autoRotate} wireframe={wireframe} />
        ) : hasWebGL ? (
          <Canvas
            camera={{ position: [0, 0, 5.2], fov: 45 }}
            gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[4, 5, 3]} intensity={1.5} color="#e0f8d0" />
            <directionalLight position={[-4, -3, -2]} intensity={0.6} color="#346856" />

            <Float speed={reducedMotion ? 0 : 2} rotationIntensity={0.2} floatIntensity={0.5}>
              <RetroArtifact reducedMotion={reducedMotion} />
            </Float>

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate={false}
              maxPolarAngle={Math.PI / 1.5}
              minPolarAngle={Math.PI / 3}
            />
          </Canvas>
        ) : (
          <WebGLFallback />
        )}

        <div className="canvas-footer-toolbar">
          {mode === 'avatar' ? (
            <div className="avatar-controls">
              <button
                type="button"
                className="viewport-action-btn"
                onClick={() => setAutoRotate(!autoRotate)}
                aria-label={autoRotate ? 'Pause 360 rotation' : 'Enable 360 rotation'}
              >
                {autoRotate ? '⏸ PAUSE' : '▶ SPIN'}
              </button>
              <button
                type="button"
                className="viewport-action-btn"
                onClick={() => setWireframe(!wireframe)}
                aria-label={wireframe ? 'Render texture' : 'Render wireframe'}
              >
                {wireframe ? '■ TEXTURE' : '▦ WIRE'}
              </button>
              <span className="canvas-hint-inline" aria-hidden="true">
                DRAG ORBIT // ZOOM
              </span>
            </div>
          ) : (
            <span className="canvas-hint-inline" aria-hidden="true">
              [MOUSE PARALLAX ACTIVE]
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
