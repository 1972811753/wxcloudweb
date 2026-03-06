import { useRef, useEffect } from 'react'
import { Danmu } from '@galaxy/shared-types'
import DanmuLayer from '../components/danmu/DanmuLayer'

interface VideoSceneProps {
  danmuQueue: Danmu[]
}

const VIDEO_URL = import.meta.env.VITE_VIDEO_URL ?? '/static/wedding.mp4'

export default function VideoScene({ danmuQueue }: VideoSceneProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    videoRef.current?.play().catch(() => {
      // 自动播放被浏览器阻止时静默处理（需用户交互触发）
    })
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <video
        ref={videoRef}
        src={VIDEO_URL}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        playsInline
        controls={false}
      />
      {/* 弹幕层（视频模式：半透明）*/}
      <DanmuLayer danmuQueue={danmuQueue} videoMode />
    </div>
  )
}
