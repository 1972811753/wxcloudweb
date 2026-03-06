import { useState, useEffect } from 'react'
import { PhaseEnum, S2C_RoomStateSync, Guest, Danmu } from '@galaxy/shared-types'
import { useSocket } from './useSocket'

export interface RoomState {
  phase: PhaseEnum
  guests: Guest[]
  danmuQueue: Danmu[]
  connected: boolean
}

export function useRoomState(): RoomState {
  const { on, socketRef } = useSocket()
  const [state, setState] = useState<RoomState>({
    phase: PhaseEnum.STANDBY,
    guests: [],
    danmuQueue: [],
    connected: false,
  })

  useEffect(() => {
    const socket = socketRef.current

    const onConnect    = () => setState(s => ({ ...s, connected: true }))
    const onDisconnect = () => setState(s => ({ ...s, connected: false }))

    socket.on('connect',    onConnect)
    socket.on('disconnect', onDisconnect)

    // 连接后服务端推送完整状态（断线重连恢复）
    const offSync = on<S2C_RoomStateSync>('room_state_sync', (data) => {
      setState(s => ({
        ...s,
        phase:      data.phase,
        guests:     data.guests,
        danmuQueue: data.danmuQueue,
        connected:  true,
      }))
    })

    // 阶段变更
    const offPhase = on<PhaseEnum>('phase_changed', (newPhase) => {
      setState(s => ({ ...s, phase: newPhase }))
    })

    // 新嘉宾加入
    const offGuest = on<{ guest: Guest }>('new_guest_added', ({ guest }) => {
      setState(s => ({
        ...s,
        guests: [...s.guests.filter(g => g.id !== guest.id), guest],
      }))
    })

    // 新弹幕
    const offDanmu = on<{ danmu: Danmu }>('new_danmu', ({ danmu }) => {
      setState(s => ({
        ...s,
        danmuQueue: [...s.danmuQueue.slice(-199), danmu],
      }))
    })

    return () => {
      socket.off('connect',    onConnect)
      socket.off('disconnect', onDisconnect)
      offSync()
      offPhase()
      offGuest()
      offDanmu()
    }
  }, [on, socketRef])

  return state
}
