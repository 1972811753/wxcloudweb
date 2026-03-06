import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Danmu } from '@galaxy/shared-types'

interface DanmuLayerProps {
  danmuQueue: Danmu[]
  videoMode?: boolean  // 视频阶段半透明模式
}

interface DanmuItem extends Danmu {
  lane: number     // 0-7 泳道，避免文字重叠
  startX: number   // 起始位置（屏幕右侧外）
}

const LANE_COUNT = 8
const DANMU_LIFETIME = 8000 // ms

export default function DanmuLayer({ danmuQueue, videoMode = false }: DanmuLayerProps) {
  const [activeDanmus, setActiveDanmus] = useState<DanmuItem[]>([])
  const laneTimers = useRef<number[]>(Array(LANE_COUNT).fill(0))
  const processedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (danmuQueue.length === 0) return
    const latest = danmuQueue[danmuQueue.length - 1]
    if (processedIds.current.has(latest.id)) return
    processedIds.current.add(latest.id)

    // 选择最空闲的泳道
    const now = Date.now()
    const lane = laneTimers.current.reduce((best, t, i) =>
      t < laneTimers.current[best] ? i : best, 0)
    laneTimers.current[lane] = now + DANMU_LIFETIME

    const item: DanmuItem = { ...latest, lane, startX: window.innerWidth + 50 }
    setActiveDanmus(prev => [...prev.slice(-50), item])

    // 超时清理
    setTimeout(() => {
      setActiveDanmus(prev => prev.filter(d => d.id !== latest.id))
    }, DANMU_LIFETIME + 500)
  }, [danmuQueue])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: 10,
    }}>
      <AnimatePresence>
        {activeDanmus.map(danmu => (
          <DanmuItemView key={danmu.id} danmu={danmu} videoMode={videoMode} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function DanmuItemView({ danmu, videoMode }: { danmu: DanmuItem; videoMode: boolean }) {
  const laneHeight = typeof window !== 'undefined' ? window.innerHeight / LANE_COUNT : 80
  const top = danmu.lane * laneHeight + laneHeight * 0.25

  return (
    <motion.div
      initial={{ x: typeof window !== 'undefined' ? window.innerWidth + 200 : 2000, opacity: 0 }}
      animate={{ x: -600, opacity: videoMode ? 0.7 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 8, ease: 'linear' }}
      style={{
        position: 'absolute',
        top,
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {/* 发送者名字 */}
      <span style={{
        fontSize: '0.85rem',
        color: videoMode ? 'rgba(167,139,250,0.8)' : '#a78bfa',
        fontWeight: 600,
      }}>
        {danmu.guestName}：
      </span>
      {/* 弹幕文字 */}
      <span style={{
        fontSize: '1rem',
        color: videoMode ? 'rgba(255,255,255,0.75)' : '#ffffff',
        textShadow: '0 0 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)',
        fontWeight: 500,
      }}>
        {danmu.text}
      </span>
      {/* 图片缩略图 */}
      {danmu.photoUrl && (
        <img
          src={danmu.photoUrl}
          alt=""
          style={{
            width: 40, height: 40,
            borderRadius: 6,
            objectFit: 'cover',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        />
      )}
    </motion.div>
  )
}
