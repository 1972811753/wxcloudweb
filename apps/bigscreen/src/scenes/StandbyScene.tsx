import { useMemo } from 'react'
import { motion } from 'framer-motion'

// 星星数据在组件外预生成，避免每次渲染重新随机（StrictMode 双重渲染安全）
const STAR_COUNT = 120
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  size:  Math.random() * 2 + 1,
  left:  `${Math.random() * 100}%`,
  top:   `${Math.random() * 100}%`,
  dur:   Math.random() * 3 + 2,
  delay: Math.random() * 4,
}))

export default function StandbyScene() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0d0d2b 0%, #000010 100%)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景星点 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STARS.map(s => (
          <motion.div
            key={s.id}
            style={{
              position: 'absolute',
              width: s.size,
              height: s.size,
              borderRadius: '50%',
              background: '#fff',
              left: s.left,
              top: s.top,
            }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
          />
        ))}
      </div>

      {/* 脉冲光环（在标题后面，z-index 低）*/}
      <motion.div
        style={{
          position: 'absolute',
          width: 300, height: 300,
          borderRadius: '50%',
          border: '1px solid rgba(167,139,250,0.3)',
          zIndex: 0,
        }}
        animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 300, height: 300,
          borderRadius: '50%',
          border: '1px solid rgba(249,168,212,0.3)',
          zIndex: 0,
        }}
        animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 1 }}
      />

      {/* 主标题 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}
      >
        <div style={{
          fontSize: '1.1rem',
          letterSpacing: '0.5em',
          color: '#a78bfa',
          marginBottom: '1.5rem',
          textTransform: 'uppercase',
        }}>
          The Galaxy Reception
        </div>
        <div style={{
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #f9a8d4 0%, #a78bfa 50%, #6ee7b7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.1,
          marginBottom: '1rem',
        }}>
          Lujing
          <br />
          &amp; 杨冬
        </div>
        <div style={{ fontSize: '1rem', color: '#94a3b8', letterSpacing: '0.3em' }}>
          扫码签到，加入我们的星系
        </div>
      </motion.div>

      {/* 底部提示 */}
      <motion.div
        style={{
          position: 'absolute', bottom: '3rem',
          color: '#475569', fontSize: '0.85rem',
          zIndex: 1,
        }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        系统待机中 · 等待司仪开启签到
      </motion.div>
    </div>
  )
}

