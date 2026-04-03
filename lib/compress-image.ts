const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const QUALITY = 0.8

export async function compressImage(file: File): Promise<File> {
  // Skip non-image files or small files (under 200KB)
  if (!file.type.startsWith('image/') || file.size < 200 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      // Scale down if larger than max
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          } else {
            // Compressed is larger — keep original
            resolve(file)
          }
        },
        'image/jpeg',
        QUALITY,
      )
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}
