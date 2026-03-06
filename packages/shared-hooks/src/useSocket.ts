import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SOCKET_URL)
  ?? 'http://localhost:3000'

// 单例 socket，避免 React StrictMode 双重 effect 创建两个连接
let _socket: Socket | null = null

function getSocket(): Socket {
  if (!_socket || _socket.disconnected) {
    _socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    })
  }
  return _socket
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket
    if (!socket.connected) socket.connect()
    return () => {
      // 不在 cleanup 中 disconnect，保持单例长连接
    }
  }, [])

  const emit = useCallback(<T>(event: string, data?: T) => {
    socketRef.current.emit(event, data)
  }, [])

  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    socketRef.current.on(event, handler)
    return () => { socketRef.current.off(event, handler) }
  }, [])

  return { socketRef, emit, on }
}
