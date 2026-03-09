import { useState, useEffect, useRef } from 'react'
import { PhaseEnum, S2C_RoomStateSync, Guest, Danmu } from '@galaxy/shared-types'
import { useSocket } from './useSocket'

export interface RoomState {
  phase: PhaseEnum
  guests: Guest[]
  danmuQueue: Danmu[]
  connected: boolean
}

export function useRoomState(): RoomState {
  const { socketRef } = useSocket()
  const [state, setState] = useState<RoomState>({
    phase: PhaseEnum.STANDBY,
    guests: [],
    danmuQueue: [],
    connected: false,
  })

  // 用 ref 持有 setState，避免 effect 依赖 state 导致重复注册
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    // 直接从 globalThis 取单例，不依赖 socketRef 引用稳定性
    const socket = socketRef.current

    const onConnect = () => {
      setState(s => ({ ...s, connected: true }))
    }

    const onDisconnect = (reason: string) => {
      console.warn('[Socket] disconnected:', reason)
      setState(s => ({ ...s, connected: false }))
      // transport close / server namespace disconnect 会自动重连
      // 如果是服务端主动踢出，手动触发重连
      if (reason === 'io server disconnect') {
        socket.connect()
      }
    }

    const onRoomStateSync = (data: S2C_RoomStateSync) => {
      setState(s => ({
        ...s,
        phase:      data.phase,
        guests:     data.guests,
        danmuQueue: data.danmuQueue,
        connected:  true,
      }))
    }

    const onPhaseChanged = (newPhase: PhaseEnum) => {
      setState(s => ({ ...s, phase: newPhase }))
    }

    const onNewGuest = ({ guest }: { guest: Guest }) => {
      setState(s => ({
        ...s,
        guests: [...s.guests.filter(g => g.id !== guest.id), guest],
      }))
    }

    const onNewDanmu = ({ danmu }: { danmu: Danmu }) => {
      setState(s => ({
        ...s,
        danmuQueue: [...s.danmuQueue.slice(-199), danmu],
      }))
    }

    socket.on('connect',         onConnect)
    socket.on('disconnect',      onDisconnect)
    socket.on('room_state_sync', onRoomStateSync)
    socket.on('phase_changed',   onPhaseChanged)
    socket.on('new_guest_added', onNewGuest)
    socket.on('new_danmu',       onNewDanmu)

    // 如果挂载时已连接，同步一次 connected 状态
    if (socket.connected) {
      setState(s => ({ ...s, connected: true }))
    }

    return () => {
      socket.off('connect',         onConnect)
      socket.off('disconnect',      onDisconnect)
      socket.off('room_state_sync', onRoomStateSync)
      socket.off('phase_changed',   onPhaseChanged)
      socket.off('new_guest_added', onNewGuest)
      socket.off('new_danmu',       onNewDanmu)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 空依赖：socket 单例生命周期与 tab 一致，只注册一次

  return state
}


