/**
 * 图片压缩工具
 * 云部署版：压缩后返回 Blob，通过 multipart/form-data 上传（非 Base64）
 */

const MAX_SIDE = 1200  // 长边最大像素
const MAX_KB   = 500   // 目标大小上限

export async function compressImageToBlob(file: File, maxKB = MAX_KB): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // 等比缩放，长边不超过 MAX_SIDE
      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width > height) {
          height = Math.round((height / width) * MAX_SIDE)
          width  = MAX_SIDE
        } else {
          width  = Math.round((width / height) * MAX_SIDE)
          height = MAX_SIDE
        }
      }

      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)

      let quality = 0.82

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('canvas.toBlob failed')); return }
            if (blob.size / 1024 > maxKB && quality > 0.2) {
              quality = Math.max(quality - 0.08, 0.2)
              tryCompress()
            } else {
              resolve(blob)
            }
          },
          'image/jpeg',
          quality,
        )
      }

      tryCompress()
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('图片加载失败'))
    }

    img.src = objectUrl
  })
}

/**
 * 上传图片到后端
 * @returns 后端返回的可访问 HTTPS URL
 */
export async function uploadPhoto(file: File, guestId: string): Promise<string> {
  const blob = await compressImageToBlob(file)
  const formData = new FormData()
  formData.append('photo', blob, 'photo.jpg')
  formData.append('guestId', guestId)

  const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
    // 不要手动设置 Content-Type，浏览器自动添加 boundary
  })

  if (!res.ok) throw new Error(`上传失败: ${res.status}`)
  const data = await res.json()
  return data.url as string
}
