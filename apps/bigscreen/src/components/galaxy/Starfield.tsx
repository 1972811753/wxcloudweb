import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ORBIT_CONFIG } from '@galaxy/shared-types'

export default function Starfield() {
  const meshRef = useRef<THREE.Points>(null)

  const { positions, speeds } = useMemo(() => {
    const count = 2000
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
      spd[i] = Math.random() * 0.002 + 0.0005
    }
    return { positions: pos, speeds: spd }
  }, [])

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += 0.0003
    meshRef.current.rotation.x += 0.0001
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#ffffff" transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}

// ─── 轨道环 ───────────────────────────────────────────────────────────────────

interface OrbitRingProps {
  orbitIndex: number
}

export function OrbitRing({ orbitIndex }: OrbitRingProps) {
  const cfg = ORBIT_CONFIG[orbitIndex]
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segments = 128
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      pts.push(new THREE.Vector3(
        Math.cos(angle) * cfg.radiusX,
        Math.sin(angle) * cfg.tilt * 2,
        Math.sin(angle) * cfg.radiusZ,
      ))
    }
    return pts
  }, [cfg])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={cfg.color} transparent opacity={0.25} />
    </line>
  )
}
