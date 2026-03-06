import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useSocket } from '@galaxy/shared-hooks'
import { useGuestStore } from '../stores/guestStore'
import { uploadPhoto } from '../utils/imageCompress'

const COOLDOWN_MS = 3000

export default function DanmuView() {
  const { emit } = useSocket()
  const { guestId, guest } = useGuestStore()
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [sent, setSent] = useState(false)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSentAt = useRef(0)

  const startCooldown = useCallback(() => {
    lastSentAt.current = Date.now()
    setCooldown(COOLDOWN_MS / 1000)
    cooldownTimer.current = setInterval(() => {
      const remaining = Math.ceil((lastSentAt.current + COOLDOWN_MS - Date.now()) / 1000)
      if (remaining <= 0) {
        setCooldown(0)
        if (cooldownTimer.current) clearInterval(cooldownTimer.current)
      } else {
        setCooldown(remaining)
      }
    }, 200)
  }, [])

  const canSend = cooldown === 0 && !uploading && text.trim().length > 0

  const handleSend = async (photoUrl?: string) => {
    if (!guestId || !canSend) return
    emit('send_danmu', { guestId, text: text.trim(), photoUrl })
    setText('')
    setSent(true)
    setTimeout(() => setSent(false), 2000)
    startCooldown()
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !guestId) return
    if (!text.trim()) { alert('请先输入一句祝福语再上传照片'); return }
    setUploading(true)
    try {
      const url = await uploadPhoto(file, guestId)
      await handleSend(url)
    } catch {
      alert('图片上传失败，请重试')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-10 pb-8">
      <div className="text-center mb-6">
        <div className="text-galaxy-purple text-xs tracking-widest uppercase mb-1">热场互动</div>
        <div className="text-xl font-bold text-white">发射你的祝福纸飞机</div>
      </div>

      {/* 嘉宾信息 */}
      {guest && (
        <div className="flex items-center gap-2 mb-4 text-white/50 text-sm">
          <div className="w-6 h-6 rounded-full bg-galaxy-purple/30 flex items-center justify-center text-xs">
            {guest.name.slice(0, 1)}
          </div>
          以 <span className="text-white/80">{guest.name}</span> 的身份发送
        </div>
      )}

      {/* 输入框 */}
      <div className="card mb-3 flex-1">
        <textarea
          className="w-full bg-transparent text-white text-base outline-none placeholder-white/20 resize-none"
          rows={5}
          maxLength={50}
          placeholder="写下你对 Lujing & 杨冬的祝福..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="text-right text-white/20 text-xs mt-1">{text.length}/50</div>
      </div>

      {/* 发送成功提示 */}
      {sent && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-center text-galaxy-green text-sm mb-3"
        >
          纸飞机已发射！✈
        </motion.div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        {/* 图片上传 */}
        <label className={`flex-1 btn-tag cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
          <span className="text-2xl">{uploading ? '⏳' : '📷'}</span>
          <span className="text-xs">{uploading ? '上传中...' : '附上照片'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
            disabled={uploading}
          />
        </label>

        {/* 发送文字弹幕 */}
        <button
          className={`flex-[2] btn-primary ${!canSend ? 'opacity-50' : ''}`}
          onClick={() => handleSend()}
          disabled={!canSend}
        >
          {cooldown > 0 ? `${cooldown}s 后可再发` : '发射 →'}
        </button>
      </div>

      {/* 冷却进度条 */}
      {cooldown > 0 && (
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-galaxy-purple rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: COOLDOWN_MS / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  )
}
