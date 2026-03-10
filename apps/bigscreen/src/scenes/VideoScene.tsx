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
    const video = videoRef.current
    if (!video) return

    const playVideo = () => {
      video.play().catch(() => {})
    }

    const handleEnded = () => {
      video.currentTime = 0
      playVideo()
    }

    // 监听多种事件确保循环播放
    video.addEventListener('ended', handleEnded)
    video.addEventListener('pause', () => {
      // 如果暂停但还没到结尾，检查是否已经结束
      if (video.currentTime >= video.duration - 0.1) {
        handleEnded()
      }
    })

    // 确保加载完成后播放
    if (video.readyState >= 3) {
      playVideo()
    } else {
      video.addEventListener('canplay', playVideo, { once: true })
    }

    return () => {
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <video
        ref={videoRef}
        src={VIDEO_URL}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        playsInline
        controls={false}
        loop
        muted
      />
      {/* 弹幕层（视频模式：半透明）*/}
      <DanmuLayer danmuQueue={danmuQueue} videoMode />
    </div>
  )
}
