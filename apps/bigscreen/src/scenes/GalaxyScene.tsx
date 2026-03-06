import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Guest, Danmu, PhaseEnum, ORBIT_CONFIG } from '@galaxy/shared-types'
import StarCore from '../components/galaxy/StarCore'
import Starfield, { OrbitRing } from '../components/galaxy/Starfield'
import GuestSatellites from '../components/galaxy/GuestSatellites'
import DanmuLayer from '../components/danmu/DanmuLayer'

interface GalaxySceneProps {
  phase: PhaseEnum
  guests: Guest[]
  danmuQueue: Danmu[]
}

export default function GalaxyScene({ phase, guests, danmuQueue }: GalaxySceneProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* ── 3D Canvas 层 ── */}
      <Canvas
        camera={{ position: [0, 8, 18], fov: 60, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'radial-gradient(ellipse at center, #0d0d2b 0%, #000010 100%)' }}
      >
        <ambientLight intensity={0.3} />
        <Suspense fallback={null}>
          <Environment preset="night" />
          <Starfield />
          {/* 5 条轨道环 */}
          {Object.keys(ORBIT_CONFIG).map(i => (
            <OrbitRing key={i} orbitIndex={Number(i)} />
          ))}
          <StarCore />
          <GuestSatellites guests={guests} />
        </Suspense>
        {/* 开发调试用，生产可移除 */}
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.3} />
      </Canvas>

      {/* ── 2D 弹幕层（叠加在 Canvas 上方）── */}
      {phase === PhaseEnum.WARMUP && (
        <DanmuLayer danmuQueue={danmuQueue} />
      )}

      {/* ── 阶段标题 ── */}
      <div style={{
        position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', letterSpacing: '0.3em',
        pointerEvents: 'none', textTransform: 'uppercase',
      }}>
        {phase === PhaseEnum.ENTRY ? '嘉宾签到中' : '热场互动中 · 发送你的祝福'}
      </div>

      {/* ── 嘉宾计数 ── */}
      <div style={{
        position: 'absolute', bottom: '2rem', right: '2rem',
        color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem',
        pointerEvents: 'none',
      }}>
        已签到 <span style={{ color: '#a78bfa', fontWeight: 700 }}>{guests.length}</span> 位嘉宾
      </div>
    </div>
  )
}
