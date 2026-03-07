import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * 流星拖尾：用 ShaderMaterial Points 实现圆形粒子拖尾
 * 每颗流星 = 一个 Points 对象，包含 TAIL_SEGMENTS 个粒子
 * 头部最大最亮，尾部渐小渐暗
 */

const METEOR_COUNT  = 8
const TAIL_SEGMENTS = 10

// 圆形粒子 shader（与 Starfield 一致）
const METEOR_VERT = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  varying   float vAlpha;

  void main() {
    vAlpha = aAlpha;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position  = projectionMatrix * mvPos;
  }
`

const METEOR_FRAG = /* glsl */`
  uniform vec3  uColor;
  varying float vAlpha;

  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float soft  = 1.0 - dist * 2.0;
    float alpha = pow(soft, 1.2) * vAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`

interface Meteor {
  origin:   THREE.Vector3
  dir:      THREE.Vector3
  speed:    number
  traveled: number
  maxDist:  number
  tailLen:  number
  color:    THREE.Color
}

function spawnMeteor(rng: () => number): Meteor {
  const theta = rng() * Math.PI * 2
  const phi   = rng() * Math.PI * 0.65 + Math.PI * 0.17
  const r     = 38 + rng() * 10
  const origin = new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi) * 0.5,
    r * Math.sin(phi) * Math.sin(theta),
  )
  const dir = origin.clone().negate().normalize()
  dir.x += (rng() - 0.5) * 0.2
  dir.y += (rng() - 0.5) * 0.2
  dir.z += (rng() - 0.5) * 0.2
  dir.normalize()

  const COLORS = [
    new THREE.Color('#f9a8d4'),
    new THREE.Color('#c4b5fd'),
    new THREE.Color('#93c5fd'),
    new THREE.Color('#6ee7b7'),
    new THREE.Color('#fde68a'),
  ]
  return {
    origin,
    dir,
    speed:    10 + rng() * 12,
    traveled: -(rng() * 25),
    maxDist:  50 + rng() * 12,
    tailLen:  3 + rng() * 4,
    color:    COLORS[Math.floor(rng() * COLORS.length)],
  }
}

export function MeteorShower() {
  const rng = useMemo(() => {
    let s = 12345
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  }, [])

  const meteors = useMemo<Meteor[]>(() =>
    Array.from({ length: METEOR_COUNT }, () => spawnMeteor(rng)), [rng])

  // 每颗流星一个 Points 对象，共享 ShaderMaterial（不同 color uniform）
  const meteorObjects = useMemo(() => {
    return meteors.map((m) => {
      const positions = new Float32Array(TAIL_SEGMENTS * 3)
      const sizes     = new Float32Array(TAIL_SEGMENTS)
      const alphas    = new Float32Array(TAIL_SEGMENTS)

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1))
      geo.setAttribute('aAlpha',   new THREE.BufferAttribute(alphas,    1))

      const mat = new THREE.ShaderMaterial({
        vertexShader:   METEOR_VERT,
        fragmentShader: METEOR_FRAG,
        uniforms: { uColor: { value: m.color.clone() } },
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      })

      return { points: new THREE.Points(geo, mat), positions, sizes, alphas }
    })
  }, [meteors])

  useFrame((_, delta) => {
    meteors.forEach((m, mi) => {
      m.traveled += delta * m.speed

      if (m.traveled > m.maxDist) {
        Object.assign(m, spawnMeteor(rng))
        // 更新 uniform 颜色
        ;(meteorObjects[mi].points.material as THREE.ShaderMaterial).uniforms.uColor.value = m.color.clone()
      }

      const { positions, sizes, alphas } = meteorObjects[mi]
      const geo = meteorObjects[mi].points.geometry

      // 整体淡入淡出
      const globalFade =
        Math.min(Math.max(m.traveled, 0) / 5, 1) *
        Math.max(0, 1 - (m.traveled - m.maxDist * 0.65) / (m.maxDist * 0.35))

      for (let si = 0; si < TAIL_SEGMENTS; si++) {
        const segFrac = si / (TAIL_SEGMENTS - 1)  // 0=头, 1=尾
        const dist    = m.traveled - segFrac * m.tailLen

        if (dist < 0) {
          positions[si*3] = 0; positions[si*3+1] = 0; positions[si*3+2] = 0
          sizes[si]  = 0
          alphas[si] = 0
          continue
        }

        const p = m.origin.clone().addScaledVector(m.dir, dist)
        positions[si*3]   = p.x
        positions[si*3+1] = p.y
        positions[si*3+2] = p.z

        const headFade = 1 - segFrac
        sizes[si]  = (0.3 + headFade * 0.9) * globalFade   // 头部最大 2.5，尾部 0.5
        alphas[si] = headFade * headFade * globalFade * 0.9
      }

      geo.attributes.position.needsUpdate = true
      geo.attributes.aSize.needsUpdate    = true
      geo.attributes.aAlpha.needsUpdate   = true
    })
  })

  return (
    <group>
      {meteorObjects.map((obj, i) => (
        <primitive key={i} object={obj.points} />
      ))}
    </group>
  )
}




