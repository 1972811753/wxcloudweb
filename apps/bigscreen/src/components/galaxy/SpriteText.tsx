import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * 用 Canvas 2D 绘制文字，生成 Three.js Sprite
 * 完全离线，不依赖任何网络字体资源
 */
interface SpriteTextProps {
  text: string
  position?: [number, number, number]
  fontSize?: number        // canvas 字号（px），影响清晰度
  color?: string
  scale?: number           // Three.js 世界单位缩放
}

export function SpriteText({
  text,
  position = [0, 0, 0],
  fontSize = 48,
  color = '#ffffff',
  scale = 1,
}: SpriteTextProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    // 量出文字宽度
    ctx.font = `600 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
    const metrics = ctx.measureText(text)
    const textW = Math.ceil(metrics.width) + 20
    const textH = fontSize + 16

    canvas.width  = textW
    canvas.height = textH

    // 重新设置字体（resize 后 context 会重置）
    ctx.font = `600 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    // 描边（增加可读性）
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'
    ctx.lineWidth   = fontSize * 0.08
    ctx.strokeText(text, textW / 2, textH / 2)

    // 填充
    ctx.fillStyle = color
    ctx.fillText(text, textW / 2, textH / 2)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [text, fontSize, color])

  // Sprite 宽高比与 canvas 保持一致
  const aspect = texture.image ? texture.image.width / texture.image.height : 4
  const spriteW = scale * aspect
  const spriteH = scale

  return (
    <sprite position={position} scale={[spriteW, spriteH, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        sizeAttenuation
      />
    </sprite>
  )
}
