import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Guest, Danmu, PhaseEnum, ORBIT_CONFIG } from '@galaxy/shared-types'
import StarCore from '../components/galaxy/StarCore'
import Starfield, { OrbitRing, NebulaCloud } from '../components/galaxy/Starfield'
import GuestSatellites from '../components/galaxy/GuestSatellites'
import DanmuLayer from '../components/danmu/DanmuLayer'
import { MeteorShower } from '../components/galaxy/MeteorShower'

interface GalaxySceneProps {
  phase: PhaseEnum
  guests: Guest[]
  danmuQueue: Danmu[]
}

// ── CSS 关键帧（仅用于 DOM 覆盖层动画）─────────────────────────────────────
const OVERLAY_STYLES = `
@keyframes infoGlow {
  0%,100% { text-shadow: 0 0 6px rgba(249,168,212,0.5); }
  50%      { text-shadow: 0 0 16px rgba(249,168,212,1), 0 0 28px rgba(167,139,250,0.5); }
}
@keyframes pulseDot {
  0%,100% { opacity: 0.35; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.5); }
}
@keyframes cornerPulse {
  0%,100% { opacity: 0.3; }
  50%      { opacity: 0.7; }
}
`

export default function GalaxyScene({ phase, guests, danmuQueue }: GalaxySceneProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <style>{OVERLAY_STYLES}</style>

      {/* ── 3D Canvas（全部视觉效果在 Three.js 内部实现）── */}
      {/*三个值的含义：*/}
      {/*x=0：水平居中*/}
      {/*y=6：相机高于星系平面 6 个单位（越大越俯视，越小越平视）*/}
      {/*z=34：相机距离中心 34 个单位（越大越远，轨道越小）*/}
      {/*fov=60 是视野角，越大看到的范围越宽但有透视变形。*/}
      <Canvas
        camera={{ position: [0, 29, 48], fov: 45, near: 0.1, far: 300 }}
        gl={{ antialias: true, alpha: false }}
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse 90% 80% at 50% 50%, #0e0e30 0%, #07071e 55%, #000010 100%)',
        }}
      >
        {/* 场景光照 */}
        <ambientLight intensity={0.35} />
        <pointLight position={[0, 0, 0]} color="#f9a8d4" intensity={6}  distance={20} />
        <pointLight position={[12, 6, 6]}  color="#a78bfa" intensity={3}  distance={35} />
        <pointLight position={[-12,-6,-6]} color="#6ee7b7" intensity={2}  distance={35} />

        <Suspense fallback={null}>
          {/* 深空背景星场 */}
          <Starfield />
          {/* 彩色星云光晕 */}
          <NebulaCloud />
          {/* 流星雨 */}
          <MeteorShower />
          {/* 轨道环 */}
          {Object.keys(ORBIT_CONFIG).map(i => (
            <OrbitRing key={i} orbitIndex={Number(i)} />
          ))}
          {/* 中心恒星 */}
          <StarCore />
          {/* 嘉宾卫星 */}
          <GuestSatellites guests={guests} />
        </Suspense>

        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.3} />
      </Canvas>

      {/* ── 扫描线（科技感，极低 opacity）── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,20,0.06) 3px, rgba(0,0,20,0.06) 4px)',
      }} />

      {/* ── 弹幕层 ── */}
      {phase === PhaseEnum.WARMUP && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
          <DanmuLayer danmuQueue={danmuQueue} />
        </div>
      )}

      {/* ── 顶部状态标题 ── */}
      <div style={{
        position: 'absolute', top: '1.6rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 4, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
      }}>
        <span style={{
          display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%',
          background: phase === PhaseEnum.ENTRY ? '#a78bfa' : '#f9a8d4',
          animation: 'pulseDot 2s ease-in-out infinite',
        }} />
        <span style={{
          color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', letterSpacing: '0.38em',
          textTransform: 'uppercase', fontWeight: 300,
        }}>
          {phase === PhaseEnum.ENTRY ? 'Guest Check-In · 嘉宾签到' : 'Live Blessings · 发送祝福'}
        </span>
        <span style={{
          display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%',
          background: phase === PhaseEnum.ENTRY ? '#a78bfa' : '#f9a8d4',
          animation: 'pulseDot 2s ease-in-out infinite 1s',
        }} />
      </div>

      {/* ── 底部婚礼信息栏 ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        zIndex: 4, pointerEvents: 'none',
        padding: '1.2rem 2.5rem 1rem',
        background: 'linear-gradient(to top, rgba(0,0,12,0.9) 0%, rgba(0,0,12,0.5) 60%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* 左：日期 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            Wedding Date
          </span>
          <span style={{
            color: '#f9a8d4', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.15em',
            animation: 'infoGlow 4s ease-in-out infinite',
          }}>
            2025 · 09 · 28
          </span>
        </div>

        {/* 中：主标题 */}
        <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
          <div style={{
            color: 'rgba(255,255,255,0.2)', fontSize: '0.55rem', letterSpacing: '0.5em',
            textTransform: 'uppercase', marginBottom: '2px',
          }}>
            The Galaxy Reception
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', letterSpacing: '0.2em', fontWeight: 300 }}>
            Lujing&nbsp;
            <span style={{ color: '#a78bfa' }}>✦</span>
            &nbsp;杨冬
          </div>
        </div>

        {/* 右：嘉宾计数 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            Guests Arrived
          </span>
          <span style={{ color: '#a78bfa', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.1em' }}>
            {String(guests.length).padStart(3, '0')}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', fontWeight: 400 }}>&nbsp;/ ∞</span>
          </span>
        </div>
      </div>

      {/* ── 四角装饰框线 ── */}
      {(['tl', 'tr', 'bl', 'br'] as const).map(pos => (
        <div key={pos} style={{
          position: 'absolute', zIndex: 4, pointerEvents: 'none',
          width: '24px', height: '24px',
          animation: 'cornerPulse 3s ease-in-out infinite',
          ...(pos === 'tl' ? { top: '0.9rem', left: '0.9rem',
            borderTop: '1px solid rgba(167,139,250,0.5)',
            borderLeft: '1px solid rgba(167,139,250,0.5)' } : {}),
          ...(pos === 'tr' ? { top: '0.9rem', right: '0.9rem',
            borderTop: '1px solid rgba(167,139,250,0.5)',
            borderRight: '1px solid rgba(167,139,250,0.5)' } : {}),
          ...(pos === 'bl' ? { bottom: '4.2rem', left: '0.9rem',
            borderBottom: '1px solid rgba(167,139,250,0.5)',
            borderLeft: '1px solid rgba(167,139,250,0.5)' } : {}),
          ...(pos === 'br' ? { bottom: '4.2rem', right: '0.9rem',
            borderBottom: '1px solid rgba(167,139,250,0.5)',
            borderRight: '1px solid rgba(167,139,250,0.5)' } : {}),
        }} />
      ))}
    </div>
  )
}








