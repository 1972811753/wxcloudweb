import { motion } from 'framer-motion'

export default function StandbyScene() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0d0d2b 0%, #000010 100%)',
      color: '#fff',
    }}>
      {/* 背景星点 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 120 }).map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              borderRadius: '50%',
              background: '#fff',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 4 }}
          />
        ))}
      </div>

      {/* 主标题 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{ textAlign: 'center', zIndex: 1 }}
      >
        <div style={{
          fontSize: '1.2rem',
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
        <div style={{ fontSize: '1.1rem', color: '#94a3b8', letterSpacing: '0.3em' }}>
          扫码签到，加入我们的星系
        </div>
      </motion.div>

      {/* 脉冲光环 */}
      <motion.div
        style={{
          position: 'absolute',
          width: 300, height: 300,
          borderRadius: '50%',
          border: '1px solid rgba(167,139,250,0.3)',
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
        }}
        animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 1 }}
      />

      {/* 底部提示 */}
      <motion.div
        style={{ position: 'absolute', bottom: '3rem', color: '#475569', fontSize: '0.85rem' }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        系统待机中 · 等待司仪开启签到
      </motion.div>
    </div>
  )
}
