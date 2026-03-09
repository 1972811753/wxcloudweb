import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// Vite 在编译 shared-hooks（通过 alias 直接引用源文件）时，
// import.meta.env 是 bigscreen/mobile 各自的构建上下文，可以正常读取 VITE_ 变量
const SOCKET_URL: string =
  (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SOCKET_URL : undefined)
  ?? 'http://localhost:3000'

// ── 模块级单例 ────────────────────────────────────────────────────────────────
// 挂到 globalThis 上，确保 Vite HMR 热更新时不会重置（模块会被重新执行，
// 但 globalThis 上的引用在同一个浏览器 tab 里持续存在）
declare global {
  // eslint-disable-next-line no-var
  var __galaxySocket: Socket | undefined
}

function getSocket(): Socket {
  if (globalThis.__galaxySocket && !globalThis.__galaxySocket.disconnected) {
    return globalThis.__galaxySocket
  }
  // 旧连接存在但已断开，先清理
  if (globalThis.__galaxySocket) {
    globalThis.__galaxySocket.removeAllListeners()
    globalThis.__galaxySocket.disconnect()
  }
  globalThis.__galaxySocket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
    // 与服务端 pingTimeout 对齐，避免 Canvas 销毁时主线程短暂卡顿被误判断线
    timeout: 60000,
  })
  return globalThis.__galaxySocket
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    // 确保 ref 始终指向当前单例
    socketRef.current = getSocket()
    if (!socketRef.current.connected) {
      socketRef.current.connect()
    }
    // 不在 cleanup 中 disconnect：单例生命周期与 tab 一致
  }, [])

  const emit = useCallback(<T>(event: string, data?: T) => {
    socketRef.current.emit(event, data)
  }, [])

  // on 返回取消监听函数，供 useEffect cleanup 使用
  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    const socket = socketRef.current
    socket.on(event, handler as (...args: unknown[]) => void)
    return () => {
      socket.off(event, handler as (...args: unknown[]) => void)
    }
  }, [])

  return { socketRef, emit, on }
}


