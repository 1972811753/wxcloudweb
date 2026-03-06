import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Guest } from '@galaxy/shared-types'
import { useSocket } from '@galaxy/shared-hooks'

interface InteractSceneProps {
  guests: Guest[]
}

interface DrawResult {
  winner: Guest
  animationType: 'slot' | 'comet'
}

export default function InteractScene({ guests }: InteractSceneProps) {
  const { on } = useSocket()
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [displayGuests, setDisplayGuests] = useState<Guest[]>([])
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // 填充显示列表（循环复制保证视觉连续）
  useEffect(() => {
    if (guests.length === 0) return
    const repeated = Array.from({ length: Math.max(30, guests.length * 3) })
      .map((_, i) => guests[i % guests.length])
    setDisplayGuests(repeated)
  }, [guests])

  useEffect(() => {
    const off = on<DrawResult>('draw_result', (result) => {
      setDrawResult(null)
      setIsRolling(true)

      // 滚动 3 秒后定格
      setTimeout(() => {
        setIsRolling(false)
        setDrawResult(result)
      }, 3500)
    })
    return off
  }, [on])

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'radial-gradient(ellipse at center, #0d0d2b 0%, #000010 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ color: '#a78bfa', fontSize: '1.2rem', letterSpacing: '0.4em', marginBottom: '2rem' }}>
        互动抽奖
      </div>

      {/* 照片/名字滚动槽 */}
      <div style={{
        width: '80vw', height: '55vh',
        overflow: 'hidden', position: 'relative',
        border: '1px solid rgba(167,139,250,0.3)',
        borderRadius: 16,
        background: 'rgba(0,0,16,0.6)',
      }}>
        <SlotReel guests={displayGuests} isRolling={isRolling} winner={drawResult?.winner ?? null} />
      </div>

      {/* 中奖结果 */}
      <AnimatePresence>
        {drawResult && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              position: 'absolute',
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              borderRadius: 20,
              padding: '2rem 4rem',
              textAlign: 'center',
              boxShadow: '0 0 60px rgba(167,139,250,0.6)',
            }}
          >
            <div style={{ color: '#fcd34d', fontSize: '1rem', marginBottom: '0.5rem' }}>恭喜获奖</div>
            <div style={{ color: '#fff', fontSize: '3rem', fontWeight: 700 }}>{drawResult.winner.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              请到台前领取礼物！
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 等待提示 */}
      {!isRolling && !drawResult && (
        <div style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
          等待司仪触发抽奖...
        </div>
      )}
    </div>
  )
}

function SlotReel({ guests, isRolling, winner }: { guests: Guest[]; isRolling: boolean; winner: Guest | null }) {
  const [offset, setOffset] = useState(0)
  const animRef = useRef<number | null>(null)
  const speedRef = useRef(0)

  useEffect(() => {
    if (isRolling) {
      speedRef.current = 30
      const tick = () => {
        speedRef.current = Math.max(speedRef.current * 0.998, 5)
        setOffset(o => (o + speedRef.current) % (guests.length * 72))
        animRef.current = requestAnimationFrame(tick)
      }
      animRef.current = requestAnimationFrame(tick)
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [isRolling, guests.length])

  const ITEM_H = 72
  const visibleCount = Math.ceil(window.innerHeight * 0.55 / ITEM_H) + 2

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div style={{ transform: `translateY(-${offset % (guests.length * ITEM_H)}px)`, transition: isRolling ? 'none' : 'transform 0.5s ease-out' }}>
        {guests.map((g, i) => (
          <div key={`${g.id}-${i}`} style={{
            height: ITEM_H,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: winner?.id === g.id ? '#fcd34d' : '#fff',
            fontSize: winner?.id === g.id ? '1.8rem' : '1.1rem',
            fontWeight: winner?.id === g.id ? 700 : 400,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            transition: 'all 0.3s',
          }}>
            {g.name}
          </div>
        ))}
      </div>
      {/* 中心高亮线 */}
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        height: ITEM_H, marginTop: -ITEM_H / 2,
        background: 'rgba(167,139,250,0.1)',
        border: '1px solid rgba(167,139,250,0.4)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
