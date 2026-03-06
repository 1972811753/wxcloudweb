import { motion } from 'framer-motion'

export default function StandbyView() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-galaxy-purple text-sm tracking-widest mb-4 uppercase">
          The Galaxy Reception
        </div>
        <div className="text-4xl font-bold bg-gradient-to-br from-galaxy-pink via-galaxy-purple to-galaxy-green bg-clip-text text-transparent mb-3">
          Lujing &amp; 杨冬
        </div>
        <div className="text-white/40 text-sm mt-6">
          签到即将开始，请稍候...
        </div>
      </motion.div>
    </div>
  )
}
