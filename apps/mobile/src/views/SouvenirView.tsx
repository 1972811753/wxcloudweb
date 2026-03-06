import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { SouvenirResponse } from '@galaxy/shared-types'
import { useGuestStore } from '../stores/guestStore'

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function SouvenirView() {
  const { guestId } = useGuestStore()
  const [status, setStatus] = useState<'pending' | 'ready'>('pending')
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!guestId) return

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/souvenir/${guestId}`)
        const data: SouvenirResponse = await res.json()
        if (data.status === 'ready' && data.posterUrl) {
          setPosterUrl(data.posterUrl)
          setStatus('ready')
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch { /* 静默忽略轮询错误 */ }
    }

    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [guestId])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 pb-10">
      <div className="text-center mb-6">
        <div className="text-galaxy-purple text-xs tracking-widest uppercase mb-1">数字伴手礼</div>
        <div className="text-xl font-bold text-white">专属纪念卡片</div>
      </div>

      {status === 'pending' ? (
        <motion.div
          className="text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="text-4xl mb-4">✨</div>
          <div className="text-white/60 text-sm">正在为你定制专属礼物...</div>
        </motion.div>
      ) : posterUrl ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <img
            src={posterUrl}
            alt="专属纪念卡片"
            className="w-full rounded-2xl shadow-2xl mb-5"
            style={{ boxShadow: '0 0 40px rgba(167,139,250,0.3)' }}
          />
          <div className="text-center text-white/50 text-xs mb-4">长按图片保存到相册</div>
          <a
            href={posterUrl}
            download="galaxy-souvenir.jpg"
            className="btn-primary block text-center"
          >
            保存到相册
          </a>
        </motion.div>
      ) : null}
    </div>
  )
}
