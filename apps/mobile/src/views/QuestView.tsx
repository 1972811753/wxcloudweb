import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '@galaxy/shared-hooks'
import { Quest } from '@galaxy/shared-types'
import { useGuestStore } from '../stores/guestStore'
import { uploadPhoto } from '../utils/imageCompress'

export default function QuestView() {
  const { on } = useSocket()
  const { guestId } = useGuestStore()
  const [quest, setQuest] = useState<Quest | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const off = on<{ quest: Quest }>('quest_push', ({ quest }) => {
      setQuest(quest)
      setDone(false)
    })
    return off
  }, [on])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !guestId) return
    setUploading(true)
    try {
      await uploadPhoto(file, guestId)
      setDone(true)
    } catch {
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center gap-6">
      <div className="text-galaxy-purple text-xs tracking-widest uppercase">互动任务</div>

      <AnimatePresence mode="wait">
        {!quest ? (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-5xl mb-4">🎯</div>
            <div className="text-white/50 text-sm">等待任务下发...</div>
          </motion.div>
        ) : done ? (
          <motion.div
            key="done"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-white text-xl font-bold mb-2">任务完成！</div>
            <div className="text-white/50 text-sm">照片已上传，等待下一个任务</div>
          </motion.div>
        ) : (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="card mb-6 text-left">
              <div className="text-galaxy-gold text-xs mb-2 uppercase tracking-wider">任务</div>
              <div className="text-white text-lg font-bold mb-2">{quest.title}</div>
              <div className="text-white/60 text-sm leading-relaxed">{quest.description}</div>
            </div>

            <label className={`btn-primary flex items-center justify-center gap-2 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
              <span>{uploading ? '上传中...' : '📸 拍照完成任务'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
