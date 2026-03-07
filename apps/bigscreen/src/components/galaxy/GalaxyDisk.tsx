import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * 螺旋星系背景盘
 * - 2 条主旋臂 + 散射粒子，用对数螺旋线分布
 * - 中心核：大 Sprite 径向渐变
 * - 整体倾斜 ~20° 模拟俯视角，缓慢自转
 * - 纯 ShaderMaterial，圆形粒子，无任何网络依赖
 */

// ── 旋臂粒子 Shader ───────────────────────────────────────────────────────────
const DISK_VERT = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3  aColor;
  varying   float vAlpha;
  varying   vec3  vColor;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / -mvPos.z);
    gl_Position  = projectionMatrix * mvPos;
  }
`
const DISK_FRAG = /* glsl */`
  varying float vAlpha;
  varying vec3  vColor;

  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    // 软圆：中心亮，边缘柔和消散
    float soft  = 1.0 - smoothstep(0.0, 0.5, dist);
    float alpha = soft * soft * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`

// ── seeded 伪随机（保证 StrictMode 稳定）────────────────────────────────────
function makeRng(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

// ── 对数螺旋线坐标 ────────────────────────────────────────────────────────────
// r = a * e^(b*θ)，armOffset = 旋臂起始角偏移
function spiralPoint(theta: number, a: number, b: number, armOffset: number) {
  const angle = theta + armOffset
  const r = a * Math.exp(b * theta)
  return { x: r * Math.cos(angle), z: r * Math.sin(angle) }
}

// ── 生成星系盘粒子数据 ────────────────────────────────────────────────────────
const DISK_DATA = (() => {
  const ARM_COUNT     = 2       // 主旋臂数量
  const ARM_PARTICLES = 4000    // 每条旋臂粒子数
  const SCATTER       = 2000    // 散射粒子（旋臂间弥散）
  const TOTAL = ARM_COUNT * ARM_PARTICLES + SCATTER

  const pos    = new Float32Array(TOTAL * 3)
  const colors = new Float32Array(TOTAL * 3)
  const sizes  = new Float32Array(TOTAL)
  const alphas = new Float32Array(TOTAL)

  const rng = makeRng(314159)
  let idx = 0

  // 主旋臂粒子
  for (let arm = 0; arm < ARM_COUNT; arm++) {
    const armOffset = (arm / ARM_COUNT) * Math.PI * 2

    for (let i = 0; i < ARM_PARTICLES; i++) {
      const t = i / ARM_PARTICLES            // 0=内 1=外
      const theta = t * Math.PI * 3.5        // 旋臂展开角度（约 1.75 圈）

      const { x, z } = spiralPoint(theta, 0.8, 0.22, armOffset)

      // 垂直方向薄盘扰动
      const ySpread = 0.3 * (1 - t * 0.5)
      const scatter = (rng() - 0.5) * (0.8 + t * 3.0)   // 外侧更散

      pos[idx*3]   = x + (rng()-0.5) * scatter
      pos[idx*3+1] = (rng()-0.5) * ySpread
      pos[idx*3+2] = z + (rng()-0.5) * scatter

      // 颜色：内侧偏白/粉，外侧偏紫蓝
      const innerFrac = 1 - t
      const r = 0.75 + innerFrac * 0.25
      const g = 0.65 + innerFrac * 0.20
      const b = 0.90 + innerFrac * 0.10
      // 旋臂亮区叠加白色高光
      const bright = rng() < 0.08 ? 1.0 : (0.5 + rng() * 0.5)
      colors[idx*3]   = Math.min(r * bright, 1)
      colors[idx*3+1] = Math.min(g * bright * 0.9, 1)
      colors[idx*3+2] = Math.min(b * bright, 1)

      // 大小：内侧稍大，外侧小
      sizes[idx]  = (0.8 + innerFrac * 1.5) * (0.5 + rng() * 0.5)
      // 透明度：内侧亮，外侧渐暗
      alphas[idx] = (0.3 + innerFrac * 0.6) * (0.4 + rng() * 0.6)

      idx++
    }
  }

  // 散射粒子（旋臂间弥散星云）
  for (let i = 0; i < SCATTER; i++) {
    const angle = rng() * Math.PI * 2
    const r     = rng() * rng() * 18         // 平方分布，中心密集
    pos[idx*3]   = Math.cos(angle) * r
    pos[idx*3+1] = (rng()-0.5) * 0.5
    pos[idx*3+2] = Math.sin(angle) * r

    colors[idx*3]   = 0.65 + rng() * 0.25
    colors[idx*3+1] = 0.55 + rng() * 0.20
    colors[idx*3+2] = 0.80 + rng() * 0.20

    sizes[idx]  = 0.4 + rng() * 0.6
    alphas[idx] = 0.08 + rng() * 0.18
    idx++
  }

  return { pos, colors, sizes, alphas, count: TOTAL }
})()

// ── 中心核 Sprite 纹理 ────────────────────────────────────────────────────────
const CORE_TEX = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const c = 256
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0,    'rgba(255, 240, 255, 0.95)')
  g.addColorStop(0.08, 'rgba(230, 200, 255, 0.80)')
  g.addColorStop(0.20, 'rgba(180, 140, 240, 0.50)')
  g.addColorStop(0.45, 'rgba(130,  90, 200, 0.20)')
  g.addColorStop(0.70, 'rgba( 80,  40, 160, 0.07)')
  g.addColorStop(1,    'rgba(  0,   0,   0, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)
  return new THREE.CanvasTexture(canvas)
})()

// ── 组件 ─────────────────────────────────────────────────────────────────────

export function GalaxyDisk() {
  const groupRef = useRef<THREE.Group>(null)

  const diskPoints = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader:   DISK_VERT,
      fragmentShader: DISK_FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(DISK_DATA.pos,    3))
    geo.setAttribute('aColor',   new THREE.BufferAttribute(DISK_DATA.colors, 3))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(DISK_DATA.sizes,  1))
    geo.setAttribute('aAlpha',   new THREE.BufferAttribute(DISK_DATA.alphas, 1))
    return new THREE.Points(geo, mat)
  }, [])

  // 中心核光晕 Sprite（3层叠加）
  const coreSprites = useMemo(() => {
    return [
      { scale: 14, opacity: 0.60 },
      { scale:  7, opacity: 0.75 },
      { scale:  3, opacity: 0.85 },
    ].map(({ scale, opacity }) => {
      const mat = new THREE.SpriteMaterial({
        map: CORE_TEX,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity,
      })
      const s = new THREE.Sprite(mat)
      s.scale.set(scale, scale * 0.55, 1)   // 扁平化模拟盘面
      return s
    })
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.025   // 缓慢自转
  })

  return (
    // 整体倾斜：绕 X 轴 ~22° 模拟从斜上方俯视的星系盘面
    <group ref={groupRef} rotation={[0.38, 0, 0.05]}>
      <primitive object={diskPoints} />
      {coreSprites.map((s, i) => <primitive key={i} object={s} />)}
    </group>
  )
}
