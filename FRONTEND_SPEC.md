# 婚礼交互系统 · 前端落地实施规范
## The Galaxy Reception — Frontend Implementation Spec

> 版本：v1.1 | 范围：仅前端（大屏端 + 移动端 H5）| 部署方案：云服务器

---

## 一、项目结构规划


wxcloudweb/
├── apps/
│   ├── bigscreen/          # 大屏端（React 18 + R3F）
│   └── mobile/             # 移动端 H5（React 18 + TailwindCSS）
├── packages/
│   ├── shared-types/       # 共享 TS 类型定义（PhaseEnum、事件结构等）
│   ├── shared-hooks/       # 共享 Hook（useSocket、usePhase）
│   └── shared-assets/      # 盲盒头像素材库、音效
├── package.json            # monorepo 根（pnpm workspaces）
└── pnpm-workspace.yaml


**Monorepo 工具**：`pnpm workspaces` + `turborepo`（并行构建大屏/移动端）

---

## 二、云部署架构（替代局域网方案）

```
┌─────────────────────────────────────────────────────────┐
│                      云服务器                            │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │  后端服务     │   │  静态文件服务  │   │  Nginx 反代 │ │
│  │  :3000       │   │  /uploads    │   │  :443 (SSL) │ │
│  └──────────────┘   └──────────────┘   └─────────────┘ │
└─────────────────────────────────────────────────────────┘
         ↑ WSS (WebSocket Secure)  ↑ HTTPS
┌────────────────┐         ┌────────────────────┐
│  大屏端浏览器   │         │  嘉宾手机浏览器      │
│  bigscreen.xxx │         │  mobile.xxx / 扫码  │
└────────────────┘         └────────────────────┘
```

### 云部署 vs 局域网 关键差异对照

| 项目 | 局域网方案 | 云部署方案（本方案） |
|---|---|---|
| WebSocket 协议 | `ws://` | **`wss://`**（必须，微信内置浏览器强制要求 HTTPS） |
| 图片上传方式 | Base64 via Socket | **multipart/form-data via HTTPS POST**（带宽更稳定） |
| 视频文件存放 | 本地静态目录 | **对象存储（OSS/COS）或服务器静态目录 + CDN** |
| 域名 | 局域网 IP | **独立域名 + SSL 证书（Let's Encrypt 免费）** |
| 并发压力 | 局域网内网 | 公网，需关注服务器带宽上行（建议 ≥10Mbps） |
| 移动端访问 | 连同一 WiFi | **任意网络均可访问，微信扫码直接打开** |

### Nginx 配置要点（前端关注）

```nginx
# 大屏端静态资源
server {
    listen 443 ssl;
    server_name bigscreen.yourdomain.com;
    root /var/www/bigscreen/dist;
    try_files $uri $uri/ /index.html;  # SPA 路由支持
}

# 移动端静态资源
server {
    listen 443 ssl;
    server_name mobile.yourdomain.com;
    root /var/www/mobile/dist;
    try_files $uri $uri/ /index.html;
}

# WebSocket 反向代理（关键配置）
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;   # 长连接不超时
}
```

---

## 三、技术栈锁定

| 端 | 框架 | 动效 | 样式 | 构建 |
|---|---|---|---|---|
| 大屏端 | React 18 + React Three Fiber v8 | GSAP 3 + drei | CSS Modules | Vite 5 |
| 移动端 | React 18 | Framer Motion | TailwindCSS v3 | Vite 5 |
| 共享层 | TypeScript 5 | — | — | tsup |

---

## 三、共享类型定义（packages/shared-types）


// phase.ts
export enum PhaseEnum {
  STANDBY    = '0_STANDBY',
  ENTRY      = '1_ENTRY',
  WARMUP     = '2_WARMUP',
  VIDEO      = '3_VIDEO',
  INTERACT   = '4_INTERACT',
  CLIMAX     = '5_CLIMAX',
}

// events.ts —— Socket 事件契约，前后端共用
export interface S2C_RoomStateSync {
  phase: PhaseEnum
  guests: Guest[]
  danmuQueue: Danmu[]
}

export interface S2C_NewGuestAdded {
  guest: Guest
}

export interface S2C_NewDanmu {
  danmu: Danmu
}

export interface S2C_DrawResult {
  winner: Guest
  animationType: 'slot' | 'comet'
}

export interface S2C_ClimaxStart {
  mosaicUrl: string          // 后端预渲染完毕的马赛克图 URL
  topWords: string[]         // 高频情感词
}

export interface C2S_Checkin {
  name: string
  tag: GuestTag
}

export interface C2S_SendDanmu {
  guestId: string
  text: string
  photoBase64?: string       // 可选，图片弹幕
}

// models.ts
export type GuestTag = 'groom_family' | 'bride_family' | 'groom_friend' | 'bride_friend' | 'colleague'

export interface Guest {
  id: string
  name: string
  tag: GuestTag
  avatarIndex: number        // 对应盲盒素材库的索引
  orbitIndex: number         // 分配到第几条轨道（0-4）
  joinedAt: number
}

export interface Danmu {
  id: string
  guestId: string
  guestName: string
  text: string
  photoUrl?: string
  createdAt: number
}


---

## 四、共享 Hook（packages/shared-hooks）

### 4.1 useSocket


// useSocket.ts
// 封装 Socket.io-client，提供自动重连 + 断线恢复
// 云部署注意：VITE_SOCKET_URL 必须使用 wss:// 协议（HTTPS 页面不允许 ws://）
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

// 云部署：wss://api.yourdomain.com
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],   // 跳过 polling，直接升级为 WS
      reconnectionAttempts: Infinity, // 云端网络偶发抖动，无限重连
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  return socketRef
}


### 4.2 usePhase


// usePhase.ts
// 订阅全局阶段状态，所有 UI 组件通过此 Hook 判断渲染逻辑
import { useState, useEffect } from 'react'
import { PhaseEnum, S2C_RoomStateSync } from '@galaxy/shared-types'
import { useSocket } from './useSocket'

export function usePhase() {
  const socketRef = useSocket()
  const [phase, setPhase] = useState<PhaseEnum>(PhaseEnum.STANDBY)

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // 连接成功后服务端立即推送当前完整状态（断线重连恢复）
    socket.on('room_state_sync', (data: S2C_RoomStateSync) => {
      setPhase(data.phase)
    })

    socket.on('phase_changed', (newPhase: PhaseEnum) => {
      setPhase(newPhase)
    })

    return () => {
      socket.off('room_state_sync')
      socket.off('phase_changed')
    }
  }, [socketRef])

  return phase
}


---

## 五、大屏端实现规范（apps/bigscreen）

### 5.1 目录结构


apps/bigscreen/src/
├── main.tsx
├── App.tsx                  # 阶段路由总控
├── scenes/
│   ├── StandbyScene.tsx     # 0_STANDBY：待机画面
│   ├── GalaxyScene.tsx      # 1_ENTRY + 2_WARMUP：3D 星系主场景
│   ├── VideoScene.tsx       # 3_VIDEO：视频播放
│   ├── InteractScene.tsx    # 4_INTERACT：抽奖动画
│   └── ClimaxScene.tsx      # 5_CLIMAX：汇聚 + 马赛克
├── components/
│   ├── galaxy/
│   │   ├── StarCore.tsx     # 中心恒星（新人节点）
│   │   ├── OrbitRing.tsx    # 轨道环（按身份标签分 5 条）
│   │   ├── GuestSatellite.tsx  # 嘉宾卫星节点（InstancedMesh）
│   │   └── Starfield.tsx    # 背景星空粒子
│   ├── danmu/
│   │   ├── DanmuLayer.tsx   # 覆盖在 Canvas 上的 2D 弹幕层
│   │   └── DanmuItem.tsx    # 单条弹幕动画组件
│   ├── lottery/
│   │   ├── SlotMachine.tsx  # 照片老虎机
│   │   └── CometStrike.tsx  # 彗星打击动画
│   └── climax/
│       ├── BlackHole.tsx    # 黑洞吸入动效
│       └── MosaicReveal.tsx # 马赛克图揭幕
├── stores/
│   └── galaxyStore.ts       # Zustand 全局状态（guests、danmus）
└── hooks/
    └── useGuestOrbit.ts     # 计算嘉宾在轨道上的位置


### 5.2 App.tsx 阶段路由


// App.tsx
import { usePhase } from '@galaxy/shared-hooks'
import { PhaseEnum } from '@galaxy/shared-types'
import { AnimatePresence } from 'framer-motion'
import StandbyScene from './scenes/StandbyScene'
import GalaxyScene from './scenes/GalaxyScene'
import VideoScene from './scenes/VideoScene'
import InteractScene from './scenes/InteractScene'
import ClimaxScene from './scenes/ClimaxScene'

export default function App() {
  const phase = usePhase()

  return (
    <AnimatePresence mode="wait">
      {phase === PhaseEnum.STANDBY  && <StandbyScene key="standby" />}
      {(phase === PhaseEnum.ENTRY ||
        phase === PhaseEnum.WARMUP) && <GalaxyScene key="galaxy" />}
      {phase === PhaseEnum.VIDEO    && <VideoScene key="video" />}
      {phase === PhaseEnum.INTERACT && <InteractScene key="interact" />}
      {phase === PhaseEnum.CLIMAX   && <ClimaxScene key="climax" />}
    </AnimatePresence>
  )
}


### 5.3 GalaxyScene 核心实现要点


// scenes/GalaxyScene.tsx
// 关键：Canvas 层（R3F）+ DOM 层（弹幕）分离叠加
//
// <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
//   <Canvas>          ← Three.js 3D 层
//     <StarCore />
//     <OrbitRing />
//     <GuestSatellites />   ← InstancedMesh，所有卫星一次 draw call
//     <Starfield />
//   </Canvas>
//   <DanmuLayer />    ← position: absolute; top: 0; pointer-events: none
// </div>

// GuestSatellite 轨道位置计算
// 每条轨道是一个椭圆，嘉宾均匀分布在椭圆上
// orbitIndex(0-4) → 轨道半径 & 倾斜角
// seatIndex(该轨道上第几个) → 初始角度 offset
// useFrame 每帧更新 angle += speed * delta，驱动公转


**性能红线**：
- 嘉宾节点必须使用 `InstancedMesh`，禁止每人一个独立 `<mesh>`
- 头像贴图打包为 TextureAtlas（雪碧图），运行时按 `avatarIndex` 计算 UV 偏移
- `DanmuLayer` 中超过 30 秒的弹幕 DOM 节点必须卸载，防止内存泄漏

### 5.4 VideoScene 实现要点


// scenes/VideoScene.tsx
// 从 GalaxyScene 过渡到 VideoScene 时：
// 1. GSAP 将 Canvas 层 opacity 从 1 → 0（1.5s ease-out）
// 2. <video> 元素 opacity 从 0 → 1（同步淡入）
// 3. 弹幕层保留，字体颜色改为半透明白色，模拟 Bilibili 效果
//
// 云部署方案：视频文件有两种存放选择
//   选择 A（简单）：视频上传到云服务器静态目录，直接引用 HTTPS URL
//     <video src="https://api.yourdomain.com/static/wedding.mp4" />
//   选择 B（推荐，大文件）：上传到对象存储（阿里云 OSS / 腾讯云 COS）
//     开启 CDN 加速，避免婚礼现场大屏加载卡顿
//     <video src="https://cdn.yourdomain.com/wedding.mp4" />
//
// 注意：视频文件建议提前预加载（<link rel="preload">），
//       避免阶段切换时出现黑屏等待
//
// 弹幕在 VIDEO 阶段仍接收 new_danmu 事件，继续飘动
// 但发送频率由后端节流（每用户 10 秒一条）


### 5.5 抽奖动画（InteractScene）

**形式 1：照片老虎机**

实现思路：
1. 从 store 获取所有已上传照片 URL 列表
2. 用 CSS columns 或 CSS Grid 构建照片瀑布流
3. GSAP 驱动整体向上滚动（translateY），速度先快后慢（ease: "power4.out"）
4. 接收 draw_result 事件后，定格并放大 winner 的照片
5. 放大动画：scale 1 → 3，配合 backdrop-blur 背景虚化


**形式 2：彗星打击**

实现思路：
1. 3D 星系保持运转
2. 接收 draw_result 后，在场景外生成一个高亮粒子拖尾的 Three.js 对象
3. 使用 GSAP 的 motionPath 让彗星沿贝塞尔曲线弹射 3-5 次
4. 最终砸中 winner 对应的 InstancedMesh 节点
5. 命中时触发爆炸粒子效果（drei 的 <Sparkles>）
6. 该节点放大 + 名字标签高亮，屏幕边缘显示中奖信息


### 5.6 ClimaxScene 实现要点


动画分三幕（总时长约 15 秒）：

第一幕（0-5s）：黑洞聚合
- 所有 InstancedMesh 节点的位置用 GSAP 驱动向 (0,0,0) 汇聚
- 同时 Three.js 相机 FOV 从 60 → 30（拉近感）
- 背景星空粒子反向向中心加速

第二幕（5-8s）：能量爆发
- 中心闪光（白色 PointLight intensity 0 → 100 → 0）
- Canvas 整体 opacity 0 → 0（黑场 0.5s）

第三幕（8-15s）：马赛克揭幕
- 显示后端提供的马赛克大图
- 图片用 CSS clip-path: circle(0% at 50% 50%) → circle(100%)
  实现从中心向外扩散的揭幕效果
- 高频情感词用 GSAP stagger 逐个浮现在图片周围


---

## 六、移动端实现规范（apps/mobile）

### 6.1 目录结构


apps/mobile/src/
├── main.tsx
├── App.tsx                  # 阶段路由总控（同大屏逻辑）
├── views/
│   ├── StandbyView.tsx      # 等待入场提示
│   ├── CheckinView.tsx      # Phase 1：签到表单
│   ├── DanmuView.tsx        # Phase 2：发弹幕/上传照片
│   ├── WatchView.tsx        # Phase 3：提示观看大屏
│   ├── QuestView.tsx        # Phase 4：任务接收 + 拍照上传
│   └── SouvenirView.tsx     # Phase 5：数字伴手礼
├── components/
│   ├── AvatarCard.tsx       # 展示分配到的盲盒头像
│   ├── PhotoUploader.tsx    # 图片选择 + Canvas 压缩
│   ├── DanmuInput.tsx       # 防抖输入框
│   └── SouvenirPoster.tsx   # 伴手礼长图展示
├── stores/
│   └── guestStore.ts        # 本地存储当前用户信息（id、avatarIndex）
└── utils/
    └── imageCompress.ts     # Canvas 压缩工具


### 6.2 CheckinView 实现要点


// views/CheckinView.tsx
// 表单字段：
// - 姓名（text input，maxLength=10）
// - 身份标签（5 个大按钮单选，图标+文字）
//   [👴 长辈亲友] [🎓 同学] [💼 同事] [👫 朋友] [💒 新人团队]
//
// 提交流程：
// 1. POST /api/checkin → 返回 { guestId, avatarIndex, orbitIndex }
// 2. 将 guestId 存入 localStorage（防刷新丢失）
// 3. 展示 AvatarCard（从本地素材库按 avatarIndex 取图）
// 4. 提示语："你的分身已出现在星系中，请抬头看大屏！"
//
// 防重复签到：
// - 进入页面先检查 localStorage 是否有 guestId
// - 有则直接跳过表单，展示已有头像


### 6.3 PhotoUploader + 图片压缩


// utils/imageCompress.ts
// 核心逻辑：用 Canvas 将图片压缩到 500KB 以下
// 云部署改动：不再转 Base64 via Socket，改为返回 Blob，通过 HTTPS POST 上传
// 原因：Base64 体积比原文件大 33%，公网带宽比局域网宝贵，multipart 更高效

export async function compressImageToBlob(file: File, maxKB = 500): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = (height / width) * MAX; width = MAX }
        else { width = (width / height) * MAX; height = MAX }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      let quality = 0.8
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) return
          if (blob.size / 1024 > maxKB && quality > 0.2) {
            quality -= 0.1
            tryCompress()
          } else {
            URL.revokeObjectURL(url)
            resolve(blob)
          }
        }, 'image/jpeg', quality)
      }
      tryCompress()
    }
    img.src = url
  })
}

// 上传函数：multipart/form-data POST 到云端 API
export async function uploadPhoto(file: File): Promise<string> {
  const blob = await compressImageToBlob(file)
  const formData = new FormData()
  formData.append('photo', blob, 'photo.jpg')
  formData.append('guestId', localStorage.getItem('guestId') ?? '')

  const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
    method: 'POST',
    body: formData,
    // 不要手动设置 Content-Type，让浏览器自动添加 boundary
  })
  const data = await res.json()
  return data.url  // 后端返回可访问的 HTTPS 图片 URL
}


### 6.4 DanmuView 防抖逻辑


// views/DanmuView.tsx
// 发送冷却：前端维护 lastSentAt 时间戳
// 每次点击发送前检查：Date.now() - lastSentAt < 3000 则禁止发送
// UI 上显示倒计时按钮（3s 冷却进度条）
//
// 图片弹幕流程（云部署版）：
// 1. 用户点击图片按钮 → <input type="file" accept="image/*"> 触发相册
// 2. 选择后调用 uploadPhoto()（内部完成压缩 + HTTPS POST 上传）
// 3. 上传成功拿到图片 URL 后，通过 Socket emit('send_danmu', { photoUrl, text })
//    注意：Socket 只传 URL 字符串，不传图片二进制，减少 WS 消息体积
// 4. 发送成功后显示"纸飞机已发射"的短暂提示


### 6.5 SouvenirView（数字伴手礼）


// views/SouvenirView.tsx
// 进入 Phase 5 后：
// 1. 轮询 GET /api/souvenir/:guestId（每 2 秒一次）
// 2. 后端返回 { status: 'pending' | 'ready', posterUrl: string }
// 3. status=pending 时显示加载动画（"正在为你定制专属礼物..."）
// 4. status=ready 时展示海报图片
//
// 海报内容（由后端合成图片，前端只负责展示）：
// - 盲盒头像
// - 嘉宾姓名 + 身份标签
// - 今晚参与的合影照片（如有）
// - 专属感谢语（后端模板生成）
// - 婚礼日期 + 新人名字水印
//
// 长按保存：
// - iOS/Android 长按图片原生支持保存
// - 额外提供"保存到相册"按钮（通过 a[download] 触发）


---

## 七、盲盒头像素材库规范


packages/shared-assets/avatars/
├── groom_family/     # 男方亲友（建议 20 款）
│   ├── 001.png
│   └── ...
├── bride_family/     # 女方亲友（20 款）
├── friend/           # 朋友/同学（30 款）
├── colleague/        # 同事（20 款）
└── team/             # 新人团队（10 款）

规格要求：
- 尺寸：512×512px（正方形，透明背景 PNG）
- 风格：3D 盲盒公仔 / 黏土风，统一光源方向（左上角）
- 总数：≥100 款，保证 200 人签到不重复
- 大屏端使用：打包为 TextureAtlas（2048×2048，每格 128×128，共 256 格）
- 移动端使用：直接引用原始 PNG


---

## 八、环境变量规范

```bash
# apps/bigscreen/.env.production
VITE_SOCKET_URL=wss://api.yourdomain.com       # 必须 wss://，对应 Nginx 反代
VITE_STATIC_URL=https://api.yourdomain.com/static

# apps/mobile/.env.production
VITE_SOCKET_URL=wss://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com/api
VITE_STATIC_URL=https://api.yourdomain.com/static

# 本地开发（联调后端时）
# apps/bigscreen/.env.local
VITE_SOCKET_URL=ws://localhost:3000
VITE_STATIC_URL=http://localhost:3000/static

# apps/mobile/.env.local
VITE_SOCKET_URL=ws://localhost:3000
VITE_API_URL=http://localhost:3000/api
VITE_STATIC_URL=http://localhost:3000/static
```

> **重要**：生产环境 `wss://` 和 `https://` 缺一不可。微信内置浏览器（WebView）在 HTTPS 页面中会直接拦截 `ws://` 连接，导致 Socket 无法建立。

---

## 九、性能指标与红线

| 指标 | 目标 | 措施 |
|---|---|---|
| 大屏帧率 | 稳定 60fps | InstancedMesh + TextureAtlas |
| 移动端首屏 | < 3s（公网 4G） | Vite 代码分割 + 懒加载 + gzip |
| 图片上传大小 | < 500KB/张 | Canvas Blob 压缩（非 Base64） |
| 弹幕发送频率 | 前端 3s 冷却 | lastSentAt 时间戳判断 |
| DOM 弹幕节点 | 最多保留 50 条 | 超时自动卸载 |
| 内存泄漏防护 | 场景切换时释放 Three.js 资源 | dispose() + useEffect cleanup |
| Socket 消息体积 | 图片只传 URL，不传二进制 | 上传与 Socket 分离 |
| 视频加载 | 阶段切换前预加载完毕 | `<link rel="preload">` + CDN |

---

## 十、开发里程碑

```
Week 1：基础设施
  ✦ Monorepo 搭建（pnpm + turborepo）
  ✦ shared-types 完成（PhaseEnum、事件契约、数据模型）
  ✦ shared-hooks 完成（useSocket wss://、usePhase）
  ✦ 两端 Vite 项目初始化
  ✦ 云服务器 Nginx 配置（SSL + WS 反代）+ Socket 连接联调

Week 2：大屏核心
  ✦ GalaxyScene：3D 星系基础渲染（恒星 + 轨道 + 背景星空）
  ✦ GuestSatellite：InstancedMesh + TextureAtlas 接入
  ✦ DanmuLayer：弹幕飘动动画

Week 3：移动端核心
  ✦ CheckinView：签到表单 + 头像展示
  ✦ DanmuView：弹幕发送 + 图片压缩（Blob）+ HTTPS 上传
  ✦ 阶段路由自动切换联调

Week 4：特效与收尾
  ✦ VideoScene：星系→视频过渡动效（视频走 CDN/OSS）
  ✦ InteractScene：抽奖动画（老虎机 or 彗星，二选一先做）
  ✦ ClimaxScene：黑洞聚合 + 马赛克揭幕
  ✦ SouvenirView：伴手礼展示

Week 5：压测与演练
  ✦ 模拟 100 人并发签到压测（公网环境）
  ✦ 全流程彩排（含 Admin 控台配合）
  ✦ 性能调优 + Bug 修复
  ✦ 服务器带宽压测（上行峰值评估）
```

---

## 十一、待确认事项（需与后端对齐）

- [ ] 云服务器域名确认（API 域名 / 大屏域名 / 移动端域名）
- [ ] SSL 证书申请方式（Let's Encrypt 自动续签 or 云厂商购买）
- [ ] 视频文件存放方案（服务器静态目录 or OSS/COS + CDN）
- [ ] `/api/checkin` 返回结构最终版本
- [ ] 图片上传接口 `/api/upload` 返回的 URL 格式（绝对路径 HTTPS URL）
- [ ] 马赛克图合成由后端完成，前端只需展示 URL
- [ ] 伴手礼海报合成方案（后端 sharp / canvas 生成）
- [ ] 盲盒头像素材由谁提供（设计师 or AI 批量生成）
- [ ] 服务器带宽规格（100 人同时上传图片，建议上行 ≥ 10Mbps）










