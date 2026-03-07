import { AnimatePresence, motion } from 'framer-motion'
import { useRoomState } from '@galaxy/shared-hooks'
import { PhaseEnum } from '@galaxy/shared-types'
import StandbyScene  from './scenes/StandbyScene'
import GalaxyScene   from './scenes/GalaxyScene'
import VideoScene    from './scenes/VideoScene'
import InteractScene from './scenes/InteractScene'
import ClimaxScene   from './scenes/ClimaxScene'
import ConnectionBadge from './components/ui/ConnectionBadge'

// mode="sync" 替代 "wait"：不等待退出动画完成再进入，避免初始节点被卡住不显示
// initial={false} 让首次渲染跳过 initial 状态，直接显示 animate 状态
const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.8 } },
  exit:    { opacity: 0, transition: { duration: 0.5 } },
}

export default function App() {
  const { phase, guests, danmuQueue, connected } = useRoomState()

  const isGalaxyPhase = phase === PhaseEnum.ENTRY || phase === PhaseEnum.WARMUP

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000010' }}>
      <AnimatePresence mode="sync">
        {phase === PhaseEnum.STANDBY && (
          <motion.div key="standby" {...fadeVariants} style={{ position: 'absolute', inset: 0 }}>
            <StandbyScene />
          </motion.div>
        )}
        {isGalaxyPhase && (
          <motion.div key="galaxy" {...fadeVariants} style={{ position: 'absolute', inset: 0 }}>
            <GalaxyScene phase={phase} guests={guests} danmuQueue={danmuQueue} />
          </motion.div>
        )}
        {phase === PhaseEnum.VIDEO && (
          <motion.div key="video" {...fadeVariants} style={{ position: 'absolute', inset: 0 }}>
            <VideoScene danmuQueue={danmuQueue} />
          </motion.div>
        )}
        {phase === PhaseEnum.INTERACT && (
          <motion.div key="interact" {...fadeVariants} style={{ position: 'absolute', inset: 0 }}>
            <InteractScene guests={guests} />
          </motion.div>
        )}
        {phase === PhaseEnum.CLIMAX && (
          <motion.div key="climax" {...fadeVariants} style={{ position: 'absolute', inset: 0 }}>
            <ClimaxScene guests={guests} />
          </motion.div>
        )}
      </AnimatePresence>

      <ConnectionBadge connected={connected} guestCount={guests.length} phase={phase} />
    </div>
  )
}

