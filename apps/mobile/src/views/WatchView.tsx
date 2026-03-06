interface WatchViewProps {
  message?: string
}

export default function WatchView({ message = '请抬头观看大屏' }: WatchViewProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="text-6xl">🎬</div>
      <div className="text-white text-xl font-semibold">{message}</div>
      <div className="text-white/40 text-sm">互动即将继续，请稍候...</div>
    </div>
  )
}
