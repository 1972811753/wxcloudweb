# Galaxy Reception · 项目上下文文档

> 供 AI 快速理解项目结构、已实现功能、开发规范，以便接入后续开发与调整。

---

## 项目简介

**The Galaxy Reception** 是一套婚礼现场互动系统，分为四个阶段：

| 阶段 | 名称 | 核心体验 |
|---|---|---|
| Phase 1 | 签到入场 | 嘉宾扫码签到，生成盲盒头像，以"卫星"形式飞入 3D 星系大屏 |
| Phase 2 | 热场互动 | 嘉宾发送弹幕/上传旧照片，大屏星系中飘过流星弹幕 |
| Phase 3 | 视频播放 | 星系淡出，婚礼视频全屏播放，弹幕半透明叠加 |
| Phase 4 | 互动抽奖 | 照片老虎机滚动抽奖，司仪触发，中奖者弹出展示 |
| Phase 5 | 最终汇聚 | 所有节点黑洞聚合 → 马赛克大图揭幕 → 手机端弹出个人伴手礼 |

---

## 仓库结构


wxcloudweb/                         ← Monorepo 根（pnpm workspaces + turborepo）
├── apps/
│   ├── bigscreen/                  ← 大屏端（React 18 + React Three Fiber）
│   ├── mobile/                     ← 移动端 H5（React 18 + TailwindCSS）
│   └── mock-server/                ← 模拟后端（Express + Socket.io，纯 ESM）
├── packages/
│   ├── shared-types/               ← 共享 TS 类型（PhaseEnum、事件契约、数据模型）
│   └── shared-hooks/               ← 共享 React Hook（useSocket、useRoomState）
├── package.json                    ← monorepo 根，scripts: dev:bigscreen / dev:mobile / dev:mock
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json


---

## 技术栈

| 端 | 核心依赖 | 端口 |
|---|---|---|
| bigscreen | React 18, React Three Fiber v8, drei, framer-motion, GSAP 3, Zustand, Vite 6 | 5173 |
| mobile | React 18, framer-motion, TailwindCSS v3, Zustand, Vite 6 | 5174 |
| mock-server | Express, Socket.io v4, multer, uuid（纯 ESM .mjs） | 3000 |
| shared-types | TypeScript 纯类型包，无运行时依赖 | — |
| shared-hooks | socket.io-client, zustand，peerDep: react | — |

---

## 启动方式


# 1. 安装依赖（根目录执行一次）
pnpm install

# 2. 分三个终端分别启动
pnpm dev:mock        # 先启动 mock 后端
pnpm dev:bigscreen   # 大屏端
pnpm dev:mobile      # 移动端


---

## 环境变量

**bigscreen** (`apps/bigscreen/.env.local`)

VITE_SOCKET_URL=ws://localhost:3000
VITE_STATIC_URL=http://localhost:3000/static
VITE_VIDEO_URL=http://localhost:3000/static/wedding.mp4


**mobile** (`apps/mobile/.env.local`)

VITE_SOCKET_URL=ws://localhost:3000
VITE_API_URL=http://localhost:3000/api
VITE_STATIC_URL=http://localhost:3000/static


> 生产环境（云部署）将 `ws://` 改为 `wss://`，`http://` 改为 `https://`，域名替换为实际域名。

---

## 全局状态机（核心机制）

后端维护唯一的 `roomState`，通过 Socket.io 广播给所有客户端。**前端禁止自行控制流程**，只订阅状态变更。


// packages/shared-types/src/index.ts
enum PhaseEnum {
  STANDBY  = '0_STANDBY',   // 待机
  ENTRY    = '1_ENTRY',     // 签到
  WARMUP   = '2_WARMUP',    // 热场弹幕
  VIDEO    = '3_VIDEO',     // 视频播放
  INTERACT = '4_INTERACT',  // 互动抽奖
  CLIMAX   = '5_CLIMAX',    // 最终汇聚
}


---

## Socket 事件字典

### S2C（服务端 → 客户端广播）

| 事件名 | 数据结构 | 触发时机 |
|---|---|---|
| `room_state_sync` | `{ phase, guests[], danmuQueue[] }` | 客户端连接/重连时立即推送 |
| `phase_changed` | `PhaseEnum` | Admin 切换阶段 |
| `new_guest_added` | `{ guest: Guest }` | 新嘉宾签到成功 |
| `new_danmu` | `{ danmu: Danmu }` | 新弹幕发送 |
| `draw_result` | `{ winner: Guest, animationType: 'slot'\|'comet' }` | Admin 触发抽奖 |
| `climax_start` | `{ mosaicUrl: string, topWords: string[] }` | Admin 触发第五阶段 |
| `quest_push` | `{ quest: Quest }` | Admin 推送任务 |

### C2S（客户端 → 服务端）

| 事件名 | 数据结构 | 说明 |
|---|---|---|
| `send_danmu` | `{ guestId, text, photoUrl? }` | 发送弹幕（photoUrl 为已上传的 HTTPS URL） |

---

## REST API（mock-server）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/checkin` | `{ name, tag }` → `{ guestId, avatarIndex, orbitIndex, guest }` |
| POST | `/api/upload` | multipart/form-data `photo` + `guestId` → `{ url }` |
| GET | `/api/guests` | 获取全部嘉宾列表 |
| GET | `/api/photos` | 获取全部上传照片列表 |
| GET | `/api/souvenir/:guestId` | `{ status: 'pending'\|'ready', posterUrl? }` |
| GET | `/api/state` | 当前阶段 + 嘉宾数 |
| POST | `/api/admin/phase` | `{ phase }` 切换阶段并广播 |
| POST | `/api/admin/draw` | `{ animationType }` 触发抽奖 |
| POST | `/api/admin/climax` | 触发第五阶段汇聚 |
| POST | `/api/admin/quest` | 随机推送一个任务 |

---

## 数据模型


// 嘉宾身份标签 → 轨道映射
type GuestTag = 'groom_family' | 'bride_family' | 'groom_friend' | 'bride_friend' | 'colleague'
// orbitIndex:       0              1               2               3               4

interface Guest {
  id: string
  name: string
  tag: GuestTag
  avatarIndex: number   // 盲盒素材库索引（0-99，mock 随机）
  orbitIndex: number    // 轨道编号 0-4
  joinedAt: number      // 时间戳
}

interface Danmu {
  id: string
  guestId: string
  guestName: string
  text: string          // 最长 50 字
  photoUrl?: string     // 可选图片 URL
  createdAt: number
}


---

## 轨道配置（ORBIT_CONFIG）

定义在 `packages/shared-types/src/index.ts`，大屏端 Three.js 直接引用：


// orbitIndex → { radiusX, radiusZ, tilt, speed, color }
0: { radiusX: 4.0,  color: '#a78bfa' }  // 男方亲友（紫色）
1: { radiusX: 5.5,  color: '#f9a8d4' }  // 女方亲友（粉色）
2: { radiusX: 7.0,  color: '#6ee7b7' }  // 杨冬朋友（绿色）
3: { radiusX: 8.5,  color: '#fcd34d' }  // Lujing朋友（金色）
4: { radiusX: 10.0, color: '#93c5fd' }  // 同事（蓝色）


---

## 已实现文件清单

### packages/shared-types
- `src/index.ts` — PhaseEnum、GuestTag、Guest、Danmu、Quest、所有 S2C/C2S 接口、CheckinResponse、SouvenirResponse、ORBIT_CONFIG、TAG_TO_ORBIT

### packages/shared-hooks
- `src/useSocket.ts` — Socket.io 单例封装，自动重连，暴露 `emit` / `on` 方法
- `src/useRoomState.ts` — 订阅全局房间状态（phase、guests、danmuQueue、connected）
- `src/index.ts` — 统一导出

### apps/mock-server
- `src/index.mjs` — Express + Socket.io 完整模拟后端，含全部 REST API 和 Socket 事件处理，上传文件存 `uploads/` 目录

### apps/bigscreen
- `src/main.tsx` — 入口
- `src/App.tsx` — 阶段路由总控（AnimatePresence 切换）
- `src/scenes/StandbyScene.tsx` — 待机画面：星空粒子 + 渐变标题 + 脉冲光环
- `src/scenes/GalaxyScene.tsx` — 星系主场景：R3F Canvas + DanmuLayer 叠加，显示嘉宾计数
- `src/scenes/VideoScene.tsx` — 视频播放 + 弹幕半透明叠加
- `src/scenes/InteractScene.tsx` — 老虎机抽奖：滚动动画 + 中奖弹出卡片
- `src/scenes/ClimaxScene.tsx` — 三幕：黑洞聚合 → 闪光 → 马赛克揭幕 + 情感词浮现
- `src/components/galaxy/StarCore.tsx` — 中心恒星（旋转光球 + 光晕环 + 新人名字）
- `src/components/galaxy/Starfield.tsx` — 背景 2000 粒子星空 + OrbitRing 轨道环组件
- `src/components/galaxy/GuestSatellites.tsx` — 嘉宾卫星节点（椭圆轨道公转 + 名字标签）
- `src/components/danmu/DanmuLayer.tsx` — 8 泳道弹幕层，30s 自动清理，支持图片缩略图
- `src/components/ui/ConnectionBadge.tsx` — 左上角连接状态 + 阶段 + 人数角标（调试用）
- `src/index.css` — 全局重置样式

### apps/mobile
- `src/main.tsx` — 入口
- `src/App.tsx` — 阶段路由总控 + 断线提示条
- `src/stores/guestStore.ts` — Zustand store，持久化到 localStorage（guestId + guest）
- `src/views/StandbyView.tsx` — 等待签到开始画面
- `src/views/CheckinView.tsx` — 签到表单（姓名+身份标签）+ 防重复签到 + 成功展示
- `src/views/DanmuView.tsx` — 弹幕发送（3s 冷却进度条）+ 图片上传
- `src/views/WatchView.tsx` — 通用"请看大屏"提示页
- `src/views/QuestView.tsx` — 任务接收 + 拍照上传完成
- `src/views/SouvenirView.tsx` — 轮询伴手礼状态 + 长按保存
- `src/utils/imageCompress.ts` — Canvas Blob 压缩（≤500KB）+ multipart/form-data 上传

---

## Admin 控台操作（curl 示例）


# 切换阶段（依次执行推进流程）
curl -X POST http://localhost:3000/api/admin/phase \
  -H "Content-Type: application/json" \
  -d '{"phase":"1_ENTRY"}'

# 可用 phase 值：0_STANDBY / 1_ENTRY / 2_WARMUP / 3_VIDEO / 4_INTERACT / 5_CLIMAX

# 触发抽奖
curl -X POST http://localhost:3000/api/admin/draw \
  -H "Content-Type: application/json" \
  -d '{"animationType":"slot"}'

# 推送任务（随机）
curl -X POST http://localhost:3000/api/admin/quest

# 触发第五阶段汇聚
curl -X POST http://localhost:3000/api/admin/climax


---

## 开发规范

### 新增阶段视图
1. 在 `packages/shared-types/src/index.ts` 的 `PhaseEnum` 添加新值
2. 在 `apps/bigscreen/src/scenes/` 新增对应 Scene 组件
3. 在 `apps/bigscreen/src/App.tsx` 的 `AnimatePresence` 中添加路由分支
4. 在 `apps/mobile/src/views/` 新增对应 View 组件
5. 在 `apps/mobile/src/App.tsx` 同步添加路由分支
6. 在 `apps/mock-server/src/index.mjs` 的 `PhaseEnum` 对象同步添加

### 新增 Socket 事件
1. 在 `packages/shared-types/src/index.ts` 添加接口定义（`S2C_Xxx` 或 `C2S_Xxx`）
2. 在 `apps/mock-server/src/index.mjs` 添加 `io.emit()` 或 `socket.on()` 处理
3. 在需要监听的前端组件中使用 `useSocket().on('event_name', handler)`

### 新增 REST 接口
1. 在 `packages/shared-types/src/index.ts` 添加响应类型接口
2. 在 `apps/mock-server/src/index.mjs` 添加 `app.get/post()` 路由
3. 在前端对应组件中用 `fetch(${VITE_API_URL}/xxx)` 调用

### 修改轨道/身份标签
- 轨道配置：`packages/shared-types/src/index.ts` 中的 `ORBIT_CONFIG` 和 `TAG_TO_ORBIT`
- 身份标签选项 UI：`apps/mobile/src/views/CheckinView.tsx` 中的 `TAGS` 数组

### 样式规范
- bigscreen：使用内联 style 对象（配合 Three.js 场景统一管理），复杂动效用 framer-motion
- mobile：优先使用 TailwindCSS 类名，自定义颜色在 `tailwind.config.js` 的 `galaxy` 扩展色板中定义
- 颜色体系：`#a78bfa`（紫）/ `#f9a8d4`（粉）/ `#6ee7b7`（绿）/ `#fcd34d`（金）/ `#93c5fd`（蓝）/ `#0d0d2b`（深背景）

---

## 待实现 / 已知 TODO

- [ ] 盲盒头像素材库（`packages/shared-assets/avatars/`，需设计师提供 100+ PNG）
- [ ] 大屏端 Admin 控台页面（当前只有 curl API，待做 Web 控台 UI）
- [ ] 婚礼视频文件（放置于 `apps/mock-server/uploads/wedding.mp4` 或配置 CDN URL）
- [ ] 伴手礼海报合成（当前 mock 返回占位图，真实后端需用 sharp/canvas 合成）
- [ ] 马赛克图合成（当前 mock 返回占位图，真实后端需后台异步合成）
- [ ] 彗星打击抽奖动画（`InteractScene.tsx` 当前只实现了老虎机形式）
- [ ] 生产环境 Nginx 配置（参见 `FRONTEND_SPEC.md` 第二章）
- [ ] 移动端微信分享卡片配置（og:image / og:title）

---

## 参考文档

- 完整设计规范：`FRONTEND_SPEC.md`（含云部署架构、性能红线、开发里程碑）
