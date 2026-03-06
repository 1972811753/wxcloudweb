import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'

export default function StarCore() {
  const coreRef  = useRef<THREE.Mesh>(null)
  const glowRef  = useRef<THREE.Mesh>(null)
  const ringRef  = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (coreRef.current)  coreRef.current.rotation.y  += delta * 0.3
    if (glowRef.current)  glowRef.current.rotation.y  -= delta * 0.15
    if (ringRef.current)  ringRef.current.rotation.z  += delta * 0.1
  })

  return (
    <group>
      {/* 核心光球 */}
      <Sphere ref={coreRef} args={[0.6, 32, 32]}>
        <meshStandardMaterial
          color="#f9a8d4"
          emissive="#f472b6"
          emissiveIntensity={2}
          roughness={0.1}
          metalness={0.8}
        />
      </Sphere>

      {/* 外发光层 */}
      <Sphere ref={glowRef} args={[0.85, 32, 32]}>
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#7c3aed"
          emissiveIntensity={1.2}
          transparent
          opacity={0.25}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* 光晕环 */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.03, 8, 64]} />
        <meshStandardMaterial color="#f9a8d4" emissive="#f9a8d4" emissiveIntensity={1.5} transparent opacity={0.6} />
      </mesh>

      {/* 点光源 */}
      <pointLight color="#f9a8d4" intensity={8} distance={15} />
      <pointLight color="#a78bfa" intensity={4} distance={20} />

      {/* 新人名字标签 */}
      <Text
        position={[0, 1.4, 0]}
        fontSize={0.28}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        Lujing &amp; 杨冬
      </Text>
    </group>
  )
}
