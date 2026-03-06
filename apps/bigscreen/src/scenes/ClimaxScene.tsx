import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Guest } from '@galaxy/shared-types'
import { useSocket } from '@galaxy/shared-hooks'

interface ClimaxSceneProps {
  guests: Guest[]
}

interface ClimaxData {
  mosaicUrl: string
  topWords: string[]
}

type ClimaxPhase = 'blackhole' | 'flash' | 'mosaic'

export default function ClimaxScene({ guests }: ClimaxSceneProps) {
  const { on } = useSocket()
  const [climaxData, setClimaxData] = useState<ClimaxData | null>(null)
  const [phase, setPhase] = useState<ClimaxPhase>('blackhole')

  useEffect(() => {
    const off = on<ClimaxData>('climax_start', (data) => {
      setClimaxData(data)
    })
    return off
  }, [on])

  // 三幕时序
  useEffect(() => {
    if (!climaxData) return
    const t1 = setTimeout(() => setPhase('flash'),   5000)
    const t2 = setTimeout(() => setPhase('mosaic'),  8000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [climaxData])

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: '#000010', overflow: 'hidden',
    }}>
      {/* 第一幕：黑洞粒子汇聚 */}
      <AnimatePresence>
        {phase === 'blackhole' && (
          <motion.div
            key="blackhole"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <BlackholeEffect guests={guests} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 第二幕：闪光 */}
      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle, #fff 0%, #a78bfa 40%, transparent 70%)',
              zIndex: 20,
            }}
          />
        )}
      </AnimatePresence>

      {/* 第三幕：马赛克揭幕 */}
      <AnimatePresence>
        {phase === 'mosaic' && climaxData && (
          <motion.div
            key="mosaic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <MosaicReveal data={climaxData} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 等待触发提示 */}
      {!climaxData && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)', fontSize: '1rem',
        }}>
          等待司仪触发最终汇聚...
        </div>
      )}
    </div>
  )
}

// ─── 黑洞粒子效果 ─────────────────────────────────────────────────────────────

function BlackholeEffect({ guests }: { guests: Guest[] }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0d0d2b 0%, #000010 100%)',
      position: 'relative',
    }}>
      {guests.map((g, i) => (
        <motion.div
          key={g.id}
          initial={{
            x: (Math.random() - 0.5) * window.innerWidth,
            y: (Math.random() - 0.5) * window.innerHeight,
            opacity: 1, scale: 1,
          }}
          animate={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          transition={{ duration: 4, delay: i * 0.05, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            color: '#a78bfa',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
          }}
        >
          {g.name}
        </motion.div>
      ))}
      {/* 中心黑洞 */}
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle, #000 40%, #7c3aed 70%, transparent 100%)',
          boxShadow: '0 0 60px #7c3aed',
          zIndex: 10,
        }}
      />
    </div>
  )
}

// ─── 马赛克揭幕 ───────────────────────────────────────────────────────────────

function MosaicReveal({ data }: { data: ClimaxData }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000010',
    }}>
      {/* 主图 */}
      <motion.img
        src={data.mosaicUrl}
        alt="合影马赛克"
        initial={{ clipPath: 'circle(0% at 50% 50%)' }}
        animate={{ clipPath: 'circle(80% at 50% 50%)' }}
        transition={{ duration: 4, ease: 'easeOut' }}
        style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }}
      />

      {/* 高频词浮现 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {data.topWords.map((word, i) => (
          <motion.div
            key={word}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 3 + i * 0.4, duration: 0.6, type: 'spring' }}
            style={{
              position: 'absolute',
              left: `${10 + (i % 4) * 22}%`,
              top: `${5 + Math.floor(i / 4) * 20}%`,
              color: '#fcd34d',
              fontSize: `${1.2 + Math.random() * 0.8}rem`,
              fontWeight: 700,
              textShadow: '0 0 20px rgba(252,211,77,0.8)',
            }}
          >
            {word}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
