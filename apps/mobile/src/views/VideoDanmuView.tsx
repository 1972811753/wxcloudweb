import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useSocket } from '@galaxy/shared-hooks'
import { useGuestStore } from '../stores/guestStore'
import { uploadPhoto } from '../utils/imageCompress'

const COOLDOWN_MS = 5000 // 视频阶段冷却稍长，避免过多干扰

export default function VideoDanmuView() {
  const { emit } = useSocket()
  const { guestId, guest } = useGuestStore()
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [sent, setSent] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
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
    setPhotoPreview(null)
    setSent(true)
    setTimeout(() => setSent(false), 2000)
    startCooldown()
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !guestId) return
    if (!text.trim()) { alert('请先输入一句祝福再上传照片'); return }

    // 本地预览
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const url = await uploadPhoto(file, guestId)
      await handleSend(url)
    } catch {
      alert('图片上传失败，请重试')
      setPhotoPreview(null)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-galaxy-dark">
      {/* 顶部视频播放提示条 */}
      <div className="bg-gradient-to-r from-galaxy-purple/20 via-galaxy-pink/20 to-galaxy-purple/20 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-galaxy-purple/30 flex items-center justify-center">
                <span className="text-xl">🎬</span>
              </div>
              {/* 脉冲动画 */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-galaxy-purple"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <div className="text-white text-sm font-medium">视频播放中</div>
              <div className="text-white/40 text-xs">请抬头观看大屏</div>
            </div>
          </div>
          <div className="flex gap-1">
            <motion.div
              className="w-1.5 h-4 bg-galaxy-purple rounded-full"
              animate={{ scaleY: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.div
              className="w-1.5 h-4 bg-galaxy-pink rounded-full"
              animate={{ scaleY: [0.5, 1, 0.5] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div
              className="w-1.5 h-4 bg-galaxy-green rounded-full"
              animate={{ scaleY: [0.4, 1, 0.4] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 flex flex-col px-5 pt-6 pb-8">
        {/* 标题区 */}
        <div className="mb-4">
          <div className="text-galaxy-pink text-xs tracking-widest uppercase mb-1">视频互动</div>
          <div className="text-xl font-bold text-white">边看边聊</div>
          <div className="text-white/40 text-sm mt-1">你的祝福弹幕会出现在视频上方 ✨</div>
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
        <div className="card mb-3 relative">
          <textarea
            className="w-full bg-transparent text-white text-base outline-none placeholder-white/20 resize-none"
            rows={4}
            maxLength={50}
            placeholder="写下你的祝福，让它飘过视频..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex justify-between items-center mt-1">
            {/* 图片预览 */}
            {photoPreview && (
              <div className="relative">
                <img src={photoPreview} alt="preview" className="w-12 h-12 object-cover rounded" />
                <button
                  onClick={() => setPhotoPreview(null)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}
            <div className="text-white/20 text-xs ml-auto">{text.length}/50</div>
          </div>
        </div>

        {/* 发送成功提示 */}
        {sent && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-galaxy-green text-sm mb-3"
          >
            弹幕已发射！在大屏上找你的祝福 🎉
          </motion.div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-auto">
          {/* 图片上传 */}
          <label className={`flex-1 btn-tag cursor-pointer ${uploading || photoPreview ? 'opacity-50' : ''}`}>
            <span className="text-2xl">{uploading ? '⏳' : photoPreview ? '✓' : '📷'}</span>
            <span className="text-xs">{uploading ? '上传中...' : photoPreview ? '已添加' : '附照片'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
              disabled={uploading || !!photoPreview}
            />
          </label>

          {/* 发送文字弹幕 */}
          <button
            className={`flex-[2] btn-primary ${!canSend ? 'opacity-50' : ''}`}
            onClick={() => handleSend()}
            disabled={!canSend}
          >
            {cooldown > 0 ? `${cooldown}s 后可再发` : '发送弹幕 →'}
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
    </div>
  )
}
