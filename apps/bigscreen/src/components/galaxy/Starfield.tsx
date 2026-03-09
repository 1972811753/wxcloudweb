import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ORBIT_CONFIG } from '@galaxy/shared-types'

// ─── 圆形粒子 Shader（星空用）────────────────────────────────────────────────

const CIRCLE_VERT = /* glsl */`
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;
  varying   float vAlpha;
  void main() {
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position  = projectionMatrix * mvPos;
    vAlpha = clamp(1.0 - length(position) / 80.0, 0.3, 1.0);
  }
`
const CIRCLE_FRAG = /* glsl */`
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = pow(1.0 - dist * 2.0, 1.5) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`

// ─── 星空数据（模块级，seeded 随机）─────────────────────────────────────────

const STAR_DATA = (() => {
  const count  = 2500
  const pos    = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes  = new Float32Array(count)
  let s = 42
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (rng()-0.5)*150
    pos[i*3+1] = (rng()-0.5)*150
    pos[i*3+2] = (rng()-0.5)*150
    const t = rng()
    if      (t < 0.60) { colors[i*3]=1;    colors[i*3+1]=1;    colors[i*3+2]=1    }
    else if (t < 0.78) { colors[i*3]=0.75; colors[i*3+1]=0.85; colors[i*3+2]=1    }
    else if (t < 0.90) { colors[i*3]=1;    colors[i*3+1]=0.8;  colors[i*3+2]=0.95 }
    else               { colors[i*3]=0.9;  colors[i*3+1]=0.95; colors[i*3+2]=1    }
    sizes[i] = 1.5 + rng() * 2.5
  }
  return { pos, colors, sizes }
})()

export default function Starfield() {
  const points = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: CIRCLE_VERT, fragmentShader: CIRCLE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(STAR_DATA.pos,    3))
    geo.setAttribute('aColor',   new THREE.BufferAttribute(STAR_DATA.colors, 3))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(STAR_DATA.sizes,  1))
    return new THREE.Points(geo, mat)
  }, [])

  useFrame(() => {
    points.rotation.y += 0.00015
    points.rotation.x += 0.00006
  })
  return <primitive object={points} />
}

// ─── 星云：不规则光晕 Sprite，多笔刷叠加模拟真实云雾 ─────────────────────────

/**
 * 用多个椭圆径向渐变叠加，生成不规则星云纹理
 * 每次调用结果不同（由 seed 控制），保证 StrictMode 稳定
 */
function makeNebulaTexture(
  r: number, g: number, b: number,
  seed: number,
  size = 512,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!

  // seeded rng
  let s = seed
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }

  const c = size / 2

  // 画 6~9 个大小/位置/透明度各异的椭圆渐变，叠加成不规则云团
  const blobs = 7 + Math.floor(rng() * 3)
  for (let i = 0; i < blobs; i++) {
    // 偏心位置（在中心附近随机偏移）
    const ox = c + (rng() - 0.5) * size * 0.45
    const oy = c + (rng() - 0.5) * size * 0.45
    // 椭圆半径
    const rx = size * (0.15 + rng() * 0.35)
    const ry = size * (0.10 + rng() * 0.25)
    // 透明度：外层 blob 更透
    const alpha = 0.06 + rng() * 0.18

    // 用 save/restore + scale 实现椭圆渐变
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(1, ry / rx)

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    grad.addColorStop(0,    `rgba(${r},${g},${b},${(alpha * 2.2).toFixed(3)})`)
    grad.addColorStop(0.30, `rgba(${r},${g},${b},${(alpha * 1.4).toFixed(3)})`)
    grad.addColorStop(0.65, `rgba(${r},${g},${b},${(alpha * 0.5).toFixed(3)})`)
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // 最后叠一层大的整体光晕，让边缘更柔和
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.9)
  grad.addColorStop(0,   `rgba(${r},${g},${b},0.12)`)
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.05)`)
  grad.addColorStop(1,   `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// 星云团配置（四角分布，不覆盖中心）
const NEBULA_CONFIGS = [
  { x: -38, y:  6, z: -10, sx: 36, sy: 22, color: [130, 80, 255]  as [number,number,number], seed: 1001 },
  { x:  40, y: -5, z:  12, sx: 38, sy: 23, color: [240, 100, 170] as [number,number,number], seed: 2002 },
  { x:   8, y: 14, z: -32, sx: 30, sy: 18, color: [80, 200, 160]  as [number,number,number], seed: 3003 },
  { x: -22, y:-10, z:  20, sx: 26, sy: 16, color: [90,  50, 210]  as [number,number,number], seed: 4004 },
]

export function NebulaCloud() {
  const groupRef = useRef<THREE.Group>(null)

  const sprites = useMemo(() => {
    return NEBULA_CONFIGS.flatMap((cfg, ci) => {
      const [r, g, b] = cfg.color
      // 每个星云团 3 层：大/中/小，透明度递增，轻微错位
      return [
        { scale: 1.0, opacity: 0.50, dx:  0,   dy:  0  },
        { scale: 0.7, opacity: 0.65, dx:  1.5, dy: -1  },
        { scale: 0.4, opacity: 0.75, dx: -1,   dy:  1.5 },
      ].map((layer, li) => {
        const tex = makeNebulaTexture(r, g, b, cfg.seed + li * 100)
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: layer.opacity,
        })
        const sprite = new THREE.Sprite(mat)
        sprite.position.set(
          cfg.x + layer.dx,
          cfg.y + layer.dy,
          cfg.z,
        )
        sprite.scale.set(cfg.sx * layer.scale, cfg.sy * layer.scale, 1)
        return sprite
      })
    })
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.003
  })

  return (
    <group ref={groupRef}>
      {sprites.map((s, i) => <primitive key={i} object={s} />)}
    </group>
  )
}

// ─── 轨道环（useMemo 直接创建 Group，绕过 useEffect ref 时序问题）────────────

interface OrbitRingProps { orbitIndex: number }

function buildOrbitPoints(cfg: typeof ORBIT_CONFIG[0], segments: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(
      Math.cos(a) * cfg.radiusX,
      Math.sin(a) * cfg.tilt * 8,
      Math.sin(a) * cfg.radiusZ,
    ))
  }
  return pts
}

export function OrbitRing({ orbitIndex }: OrbitRingProps) {
  const cfg = ORBIT_CONFIG[orbitIndex]

  const group = useMemo(() => {
    const g   = new THREE.Group()
    const col = new THREE.Color(cfg.color)

    const geoLow = new THREE.BufferGeometry().setFromPoints(buildOrbitPoints(cfg, 128))
    const geoHD  = new THREE.BufferGeometry().setFromPoints(buildOrbitPoints(cfg, 256))

    // 外层宽光晕
    g.add(new THREE.Line(geoLow, new THREE.LineBasicMaterial({
      color: col, transparent: true, opacity: 0.20, depthWrite: false,
    })))
    // 主轨道线
    g.add(new THREE.Line(geoHD, new THREE.LineBasicMaterial({
      color: col, transparent: true, opacity: 0.70, depthWrite: false,
    })))
    // 白色高光
    g.add(new THREE.Line(geoHD, new THREE.LineBasicMaterial({
      color: new THREE.Color(0xffffff), transparent: true, opacity: 0.08, depthWrite: false,
    })))
    return g
  }, [cfg])

  return <primitive object={group} />
}





