import { AnimatePresence, motion } from 'framer-motion'
import { useRoomState } from '@galaxy/shared-hooks'
import { PhaseEnum } from '@galaxy/shared-types'
import StandbyView  from './views/StandbyView'
import CheckinView  from './views/CheckinView'
import DanmuView    from './views/DanmuView'
import WatchView    from './views/WatchView'
import QuestView    from './views/QuestView'
import SouvenirView from './views/SouvenirView'

const slideVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit:    { opacity: 0, y: -20, transition: { duration: 0.25 } },
}

export default function App() {
  const { phase, connected } = useRoomState()

  return (
    <div className="min-h-screen bg-galaxy-dark text-white">
      {/* 连接状态提示条 */}
      {!connected && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-500/80 text-white text-center text-xs py-1">
          正在连接服务器...
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === PhaseEnum.STANDBY && (
          <motion.div key="standby" {...slideVariants}>
            <StandbyView />
          </motion.div>
        )}
        {phase === PhaseEnum.ENTRY && (
          <motion.div key="entry" {...slideVariants}>
            <CheckinView />
          </motion.div>
        )}
        {phase === PhaseEnum.WARMUP && (
          <motion.div key="warmup" {...slideVariants}>
            <DanmuView />
          </motion.div>
        )}
        {phase === PhaseEnum.VIDEO && (
          <motion.div key="video" {...slideVariants}>
            <WatchView message="视频播放中，请抬头观看大屏" />
          </motion.div>
        )}
        {phase === PhaseEnum.INTERACT && (
          <motion.div key="interact" {...slideVariants}>
            <QuestView />
          </motion.div>
        )}
        {phase === PhaseEnum.CLIMAX && (
          <motion.div key="climax" {...slideVariants}>
            <SouvenirView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
