import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

// ─── 全局状态（模拟 Redis 状态机）────────────────────────────────────────────

const PhaseEnum = {
  STANDBY:  '0_STANDBY',
  ENTRY:    '1_ENTRY',
  WARMUP:   '2_WARMUP',
  VIDEO:    '3_VIDEO',
  INTERACT: '4_INTERACT',
  CLIMAX:   '5_CLIMAX',
}

const TAG_TO_ORBIT = {
  groom_family: 0,
  bride_family: 1,
  groom_friend: 2,
  bride_friend: 3,
  colleague:    4,
}

// 每个轨道最多容纳的人数（用于计算 seatIndex）
const orbitCounts = [0, 0, 0, 0, 0]

let roomState = {
  phase: PhaseEnum.STANDBY,
  guests: [],
  danmuQueue: [],
  photos: [],
}

// 模拟抽奖任务列表
const MOCK_QUESTS = [
  { id: 'q1', title: '跨星系合影', description: '找一位来自不同关系圈的嘉宾合影，拍照上传！' },
  { id: 'q2', title: '红衣侦探',   description: '找到今天穿红色衣服的人，一起比心！' },
  { id: 'q3', title: '长辈祝福',   description: '找一位长辈，请他/她说一句对新人的祝福并录制！' },
  { id: 'q4', title: '碰杯挑战',   description: '和三位不认识的嘉宾碰杯，拍下合照！' },
]

// ─── Express + Socket.io ──────────────────────────────────────────────────────

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  // 延长心跳超时，防止 Canvas 销毁时主线程卡顿导致误判断线
  pingTimeout:  60000,   // 默认 20000，改为 60s
  pingInterval: 25000,   // 默认 25000，保持不变
})

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

// ─── REST API ─────────────────────────────────────────────────────────────────

// POST /api/checkin
app.post('/api/checkin', (req, res) => {
  const { name, tag } = req.body
  if (!name || !tag) return res.status(400).json({ error: 'name and tag required' })

  // 防重复：同名同标签视为同一人
  const existing = roomState.guests.find(g => g.name === name && g.tag === tag)
  if (existing) {
    return res.json({ guestId: existing.id, avatarIndex: existing.avatarIndex, orbitIndex: existing.orbitIndex, guest: existing })
  }

  const orbitIndex = TAG_TO_ORBIT[tag] ?? 4
  const seatIndex  = orbitCounts[orbitIndex]++
  const avatarIndex = Math.floor(Math.random() * 100) // 模拟 100 款素材

  const guest = {
    id: uuidv4(),
    name,
    tag,
    avatarIndex,
    orbitIndex,
    seatIndex,
    joinedAt: Date.now(),
  }

  roomState.guests.push(guest)

  // 广播新嘉宾加入
  io.emit('new_guest_added', { guest })

  console.log(`[CHECKIN] ${name} (${tag}) → orbit ${orbitIndex}, seat ${seatIndex}`)
  res.json({ guestId: guest.id, avatarIndex, orbitIndex, guest })
})

// POST /api/upload
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' })
  const url = `http://localhost:3000/uploads/${req.file.filename}`
  roomState.photos.push({ url, guestId: req.body.guestId, uploadedAt: Date.now() })
  console.log(`[UPLOAD] ${url}`)
  res.json({ url })
})

// GET /api/guests
app.get('/api/guests', (_req, res) => {
  res.json({ guests: roomState.guests })
})

// GET /api/photos
app.get('/api/photos', (_req, res) => {
  res.json({ photos: roomState.photos })
})

// GET /api/souvenir/:guestId  (模拟：直接返回 ready，使用占位图)
app.get('/api/souvenir/:guestId', (req, res) => {
  const guest = roomState.guests.find(g => g.id === req.params.guestId)
  if (!guest) return res.status(404).json({ error: 'guest not found' })
  // 模拟阶段：直接返回 ready + 占位海报
  res.json({
    status: 'ready',
    posterUrl: `https://placehold.co/600x900/1a1a2e/ffffff?text=${encodeURIComponent(`${guest.name}\n感谢你的到来`)}`,
  })
})

// GET /api/state  (Admin 查看当前状态)
app.get('/api/state', (_req, res) => {
  res.json({ phase: roomState.phase, guestCount: roomState.guests.length })
})

// POST /api/admin/phase  (Admin 切换阶段)
app.post('/api/admin/phase', (req, res) => {
  const { phase } = req.body
  if (!Object.values(PhaseEnum).includes(phase)) {
    return res.status(400).json({ error: 'invalid phase' })
  }
  roomState.phase = phase
  io.emit('phase_changed', phase)
  // 切换阶段时同步广播完整状态
  io.emit('room_state_sync', {
    phase: roomState.phase,
    guests: roomState.guests,
    danmuQueue: roomState.danmuQueue.slice(-50),
  })
  console.log(`[PHASE] → ${phase}`)
  res.json({ ok: true, phase })
})

// POST /api/admin/draw  (Admin 触发抽奖)
app.post('/api/admin/draw', (req, res) => {
  const { animationType = 'slot' } = req.body
  if (roomState.guests.length === 0) {
    return res.status(400).json({ error: 'no guests' })
  }
  const winner = roomState.guests[Math.floor(Math.random() * roomState.guests.length)]
  io.emit('draw_result', { winner, animationType })
  console.log(`[DRAW] Winner: ${winner.name}`)
  res.json({ winner, animationType })
})

// POST /api/admin/climax  (Admin 触发第五阶段汇聚)
app.post('/api/admin/climax', (_req, res) => {
  const payload = {
    mosaicUrl: 'https://placehold.co/1920x1080/0f0f1a/ffffff?text=Lujing+%26+%E6%9D%A8%E5%86%AC',
    topWords: ['幸福', '终于', '般配', '白头偕老', '早生贵子', '甜蜜', '感动'],
  }
  io.emit('climax_start', payload)
  res.json(payload)
})

// POST /api/admin/quest  (Admin 推送随机任务)
app.post('/api/admin/quest', (_req, res) => {
  const quest = MOCK_QUESTS[Math.floor(Math.random() * MOCK_QUESTS.length)]
  io.emit('quest_push', { quest })
  res.json({ quest })
})

// ─── Socket.io 事件处理 ───────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WS] connected: ${socket.id}`)

  // 连接后立即推送当前完整状态（断线重连恢复）
  socket.emit('room_state_sync', {
    phase: roomState.phase,
    guests: roomState.guests,
    danmuQueue: roomState.danmuQueue.slice(-50),
  })

  // 收到弹幕
  socket.on('send_danmu', (data) => {
    const { guestId, text, photoUrl } = data
    const guest = roomState.guests.find(g => g.id === guestId)
    if (!guest || !text?.trim()) return

    const danmu = {
      id: uuidv4(),
      guestId,
      guestName: guest.name,
      text: text.trim().slice(0, 50), // 限制长度
      photoUrl,
      createdAt: Date.now(),
    }
    roomState.danmuQueue.push(danmu)
    // 只保留最近 200 条
    if (roomState.danmuQueue.length > 200) roomState.danmuQueue.shift()

    io.emit('new_danmu', { danmu })
    console.log(`[DANMU] ${guest.name}: ${danmu.text}`)
  })

  socket.on('disconnect', () => {
    console.log(`[WS] disconnected: ${socket.id}`)
  })
})

// ─── 启动 ─────────────────────────────────────────────────────────────────────

const PORT = 3000
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Galaxy Reception · Mock Server       ║
║   http://localhost:${PORT}                 ║
╠════════════════════════════════════════╣
║  Admin API:                            ║
║  POST /api/admin/phase  { phase }      ║
║  POST /api/admin/draw   { animType }   ║
║  POST /api/admin/climax                ║
║  POST /api/admin/quest                 ║
║  GET  /api/state                       ║
╚════════════════════════════════════════╝
  `)
})

