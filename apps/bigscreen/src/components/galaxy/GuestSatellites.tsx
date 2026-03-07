import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Guest, ORBIT_CONFIG } from '@galaxy/shared-types'
import { SpriteText } from './SpriteText'

interface GuestSatellitesProps {
  guests: Guest[]
}

// 模块级角度缓存，HMR 安全
const guestAngles = new Map<string, number>()

export default function GuestSatellites({ guests }: GuestSatellitesProps) {
  useEffect(() => {
    guests.forEach(g => {
      if (!guestAngles.has(g.id)) {
        const sameOrbit = guests.filter(x => x.orbitIndex === g.orbitIndex)
        const idx = sameOrbit.findIndex(x => x.id === g.id)
        guestAngles.set(g.id, (idx / Math.max(sameOrbit.length, 1)) * Math.PI * 2)
      }
    })
  }, [guests])

  return (
    <>
      {guests.map(guest => (
        <GuestNode key={guest.id} guest={guest} />
      ))}
    </>
  )
}

function GuestNode({ guest }: { guest: Guest }) {
  const groupRef = useRef<THREE.Group>(null)
  const cfg = ORBIT_CONFIG[guest.orbitIndex] ?? ORBIT_CONFIG[4]
  const color = cfg.color

  useFrame((_, delta) => {
    const angle = (guestAngles.get(guest.id) ?? 0) + delta * cfg.speed
    guestAngles.set(guest.id, angle)
    if (groupRef.current) {
      groupRef.current.position.set(
        Math.cos(angle) * cfg.radiusX,
        Math.sin(angle) * cfg.tilt * 2,
        Math.sin(angle) * cfg.radiusZ,
      )
    }
  })

  return (
    <group ref={groupRef}>
      {/* 卫星球体 */}
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* 微光晕 */}
      <mesh>
        <sphereGeometry args={[0.26, 8, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      {/* 名字标签（Canvas Sprite，完全离线）*/}
      <SpriteText
        text={guest.name}
        position={[0, 0.38, 0]}
        fontSize={36}
        color="#ffffff"
        scale={0.3}
      />
    </group>
  )
}


