import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GuestTag, CheckinResponse } from '@galaxy/shared-types'
import { useGuestStore } from '../stores/guestStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const TAGS: { value: GuestTag; label: string; emoji: string }[] = [
  { value: 'groom_family', label: '男方亲友', emoji: '👨‍👩‍👧' },
  { value: 'bride_family',  label: '女方亲友', emoji: '👨‍👩‍👦' },
  { value: 'groom_friend', label: '杨冬的朋友', emoji: '🎓' },
  { value: 'bride_friend', label: 'Lujing的朋友', emoji: '💫' },
  { value: 'colleague',    label: '同事',     emoji: '💼' },
]

// 占位头像颜色（按轨道）
const AVATAR_COLORS = ['#a78bfa', '#f9a8d4', '#6ee7b7', '#fcd34d', '#93c5fd']

export default function CheckinView() {
  const { guestId, guest, setGuest } = useGuestStore()
  const [name, setName] = useState('')
  const [tag, setTag] = useState<GuestTag | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 已签到：直接展示头像
  if (guestId && guest) {
    return <CheckinSuccess guest={guest} />
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('请输入你的名字'); return }
    if (!tag) { setError('请选择你的身份'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), tag }),
      })
      if (!res.ok) throw new Error('签到失败')
      const data: CheckinResponse = await res.json()
      setGuest(data.guestId, data.guest)
    } catch (e) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-12 pb-8">
      {/* 标题 */}
      <div className="text-center mb-8">
        <div className="text-galaxy-purple text-xs tracking-widest uppercase mb-2">登录我们的星系</div>
        <div className="text-2xl font-bold text-white">嘉宾签到</div>
      </div>

      {/* 姓名输入 */}
      <div className="card mb-4">
        <div className="text-white/60 text-sm mb-2">你的名字</div>
        <input
          type="text"
          maxLength={10}
          placeholder="请输入你的名字"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-transparent text-white text-lg outline-none placeholder-white/20 border-b border-white/10 pb-2"
        />
      </div>

      {/* 身份标签 */}
      <div className="card mb-6">
        <div className="text-white/60 text-sm mb-3">你是新人的</div>
        <div className="grid grid-cols-3 gap-2">
          {TAGS.map(t => (
            <button
              key={t.value}
              onClick={() => setTag(t.value)}
              className={`btn-tag ${tag === t.value ? 'selected' : ''}`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="text-red-400 text-sm text-center mb-3">{error}</div>
      )}

      {/* 提交按钮 */}
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? '签到中...' : '进入星系 →'}
      </button>
    </div>
  )
}

// ─── 签到成功展示 ─────────────────────────────────────────────────────────────

function CheckinSuccess({ guest }: { guest: ReturnType<typeof useGuestStore>['guest'] }) {
  if (!guest) return null
  const color = AVATAR_COLORS[guest.orbitIndex] ?? '#a78bfa'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-6"
      >
        {/* 头像占位（实际替换为盲盒图片）*/}
        <div
          className="w-28 h-28 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold"
          style={{ background: `radial-gradient(circle, ${color}40, ${color}20)`, border: `2px solid ${color}` }}
        >
          {guest.name.slice(0, 1)}
        </div>
        <div className="text-white text-xl font-bold mb-1">{guest.name}</div>
        <div className="text-white/40 text-sm">你的分身已出现在星系中</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card text-center"
      >
        <div className="text-galaxy-purple text-2xl mb-2">👆</div>
        <div className="text-white/70 text-sm leading-relaxed">
          请抬头看大屏<br />找到你的星球！
        </div>
      </motion.div>
    </div>
  )
}
