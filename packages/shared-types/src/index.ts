export enum PhaseEnum {
  STANDBY  = '0_STANDBY',
  ENTRY    = '1_ENTRY',
  WARMUP   = '2_WARMUP',
  VIDEO    = '3_VIDEO',
  INTERACT = '4_INTERACT',
  CLIMAX   = '5_CLIMAX',
}

export type GuestTag =
  | 'groom_family'
  | 'bride_family'
  | 'groom_friend'
  | 'bride_friend'
  | 'colleague'

export interface Guest {
  id: string
  name: string
  tag: GuestTag
  avatarIndex: number   // 对应盲盒素材库索引
  orbitIndex: number    // 分配到第几条轨道 (0-4)
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

export interface Quest {
  id: string
  title: string
  description: string
}

// ─── Socket 事件契约 (S2C = 服务端→客户端) ───────────────────────────────────

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
  mosaicUrl: string   // 后端预渲染马赛克图 URL
  topWords: string[]  // 高频情感词
}

export interface S2C_QuestPush {
  quest: Quest
}

// ─── Socket 事件契约 (C2S = 客户端→服务端) ───────────────────────────────────

export interface C2S_Checkin {
  name: string
  tag: GuestTag
}

export interface C2S_SendDanmu {
  guestId: string
  text: string
  photoUrl?: string  // 云部署：只传 URL，不传二进制
}

// ─── REST API 响应结构 ────────────────────────────────────────────────────────

export interface CheckinResponse {
  guestId: string
  avatarIndex: number
  orbitIndex: number
  guest: Guest
}

export interface UploadResponse {
  url: string
}

export interface SouvenirResponse {
  status: 'pending' | 'ready'
  posterUrl?: string
}

// ─── 轨道配置（前端渲染用）────────────────────────────────────────────────────

export const ORBIT_CONFIG: Record<number, { radiusX: number; radiusZ: number; tilt: number; speed: number; color: string }> = {
  0: { radiusX: 4.0, radiusZ: 2.5, tilt: 0.1,  speed: 0.18, color: '#a78bfa' }, // groom_family
  1: { radiusX: 5.5, radiusZ: 3.2, tilt: 0.25, speed: 0.14, color: '#f9a8d4' }, // bride_family
  2: { radiusX: 7.0, radiusZ: 4.0, tilt: 0.4,  speed: 0.11, color: '#6ee7b7' }, // groom_friend
  3: { radiusX: 8.5, radiusZ: 5.0, tilt: 0.15, speed: 0.09, color: '#fcd34d' }, // bride_friend
  4: { radiusX: 10,  radiusZ: 6.0, tilt: 0.35, speed: 0.07, color: '#93c5fd' }, // colleague
}

export const TAG_TO_ORBIT: Record<GuestTag, number> = {
  groom_family: 0,
  bride_family: 1,
  groom_friend: 2,
  bride_friend: 3,
  colleague:    4,
}
