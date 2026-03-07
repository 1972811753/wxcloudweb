import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SpriteText } from './SpriteText'

export default function StarCore() {
  const coreRef  = useRef<THREE.Mesh>(null)
  // 每个环用一个外层 group 做旋转动画，内层 mesh 固定初始倾斜角
  const ring1GroupRef = useRef<THREE.Group>(null)
  const ring2GroupRef = useRef<THREE.Group>(null)
  const ring3GroupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (coreRef.current)       coreRef.current.rotation.y       += delta * 0.3
    if (ring1GroupRef.current) ring1GroupRef.current.rotation.y += delta * 0.55
    if (ring2GroupRef.current) ring2GroupRef.current.rotation.y -= delta * 0.35
    if (ring3GroupRef.current) ring3GroupRef.current.rotation.y += delta * 0.20
  })

  return (
    <group>
      {/* 核心球体 */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color="#fce7f3"
          emissive="#f472b6"
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* 旋转环 1：外层 group 绕 Y 轴自转，内层 mesh 固定倾斜 */}
      <group ref={ring1GroupRef}>
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[1.4, 0.025, 8, 100]} />
          <meshStandardMaterial
            color="#f9a8d4" emissive="#f9a8d4"
            emissiveIntensity={2} transparent opacity={0.7}
          />
        </mesh>
      </group>

      {/* 旋转环 2 */}
      <group ref={ring2GroupRef} rotation={[0, 0.8, 0]}>
        <mesh rotation={[Math.PI / 2.5, 0, 0]}>
          <torusGeometry args={[1.9, 0.016, 8, 100]} />
          <meshStandardMaterial
            color="#a78bfa" emissive="#a78bfa"
            emissiveIntensity={1.8} transparent opacity={0.55}
          />
        </mesh>
      </group>

      {/* 旋转环 3 */}
      <group ref={ring3GroupRef} rotation={[0.4, 0, 0.3]}>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.4, 0.010, 8, 120]} />
          <meshStandardMaterial
            color="#6ee7b7" emissive="#6ee7b7"
            emissiveIntensity={1.5} transparent opacity={0.35}
          />
        </mesh>
      </group>

      {/* 光源 */}
      <pointLight color="#f9a8d4" intensity={6} distance={20} />
      <pointLight color="#a78bfa" intensity={3} distance={30} />

      {/* 名字标签 */}
      <SpriteText
        text="Lujing & 杨冬"
        position={[0, -1.3, 0]}
        fontSize={40}
        color="#fce7f3"
        scale={0.85}
      />
    </group>
  )
}

