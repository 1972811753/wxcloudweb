import { PhaseEnum } from '@galaxy/shared-types'

const PHASE_LABELS: Record<PhaseEnum, string> = {
  [PhaseEnum.STANDBY]:  '待机',
  [PhaseEnum.ENTRY]:    '签到',
  [PhaseEnum.WARMUP]:   '热场',
  [PhaseEnum.VIDEO]:    '视频',
  [PhaseEnum.INTERACT]: '互动',
  [PhaseEnum.CLIMAX]:   '高潮',
}

interface ConnectionBadgeProps {
  connected: boolean
  guestCount: number
  phase: PhaseEnum
}

export default function ConnectionBadge({ connected, guestCount, phase }: ConnectionBadgeProps) {
  return (
    <div style={{
      position: 'fixed', top: '1rem', left: '1rem',
      display: 'flex', gap: '0.5rem', alignItems: 'center',
      background: 'rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '0.3rem 0.7rem',
      fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)',
      zIndex: 100, pointerEvents: 'none',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: connected ? '#4ade80' : '#f87171',
      }} />
      <span>{connected ? '已连接' : '连接中...'}</span>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
      <span>阶段: {PHASE_LABELS[phase]}</span>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
      <span>{guestCount} 人</span>
    </div>
  )
}
