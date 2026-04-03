import { parseIngredient } from './types'

export async function exportRecipeAsImage(recipe: {
  title: string
  description?: string | null
  ingredients: string[]
  category?: string | null
  image_url?: string | null
  profiles?: { display_name: string } | null
}): Promise<void> {
  const W = 1080
  const H = 1920
  const PAD = 60
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#FFF8F7')
  grad.addColorStop(1, '#F5E6E0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Load recipe image if available
  let imgLoaded = false
  if (recipe.image_url) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject()
        img.src = recipe.image_url!
      })
      // Draw image at top with rounded bottom
      const imgH = 700
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(0, 0, W, imgH, [0, 0, 40, 40])
      ctx.clip()
      const scale = Math.max(W / img.width, imgH / img.height)
      const sw = img.width * scale
      const sh = img.height * scale
      ctx.drawImage(img, (W - sw) / 2, (imgH - sh) / 2, sw, sh)
      // Dark overlay at bottom for text
      const overlayGrad = ctx.createLinearGradient(0, imgH - 200, 0, imgH)
      overlayGrad.addColorStop(0, 'rgba(0,0,0,0)')
      overlayGrad.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = overlayGrad
      ctx.fillRect(0, 0, W, imgH)
      ctx.restore()
      imgLoaded = true
    } catch {
      // Skip image
    }
  }

  let y = imgLoaded ? 740 : 120

  // Helper: right-aligned text
  ctx.textAlign = 'right'
  ctx.direction = 'rtl'

  // Title
  ctx.fillStyle = '#1C1B1F'
  ctx.font = 'bold 64px Rubik, sans-serif'
  const titleLines = wrapText(ctx, recipe.title, W - PAD * 2)
  for (const line of titleLines) {
    ctx.fillText(line, W - PAD, y)
    y += 76
  }

  // Category badge
  if (recipe.category) {
    y += 10
    ctx.font = '500 32px Rubik, sans-serif'
    const tw = ctx.measureText(recipe.category).width
    ctx.fillStyle = '#B41C1B'
    ctx.beginPath()
    ctx.roundRect(W - PAD - tw - 30, y - 34, tw + 30, 48, 24)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(recipe.category, W - PAD - 15, y)
    y += 60
  }

  // Description
  if (recipe.description) {
    y += 10
    ctx.fillStyle = '#49454F'
    ctx.font = '36px Rubik, sans-serif'
    const descLines = wrapText(ctx, recipe.description, W - PAD * 2).slice(0, 3)
    for (const line of descLines) {
      ctx.fillText(line, W - PAD, y)
      y += 48
    }
  }

  // Ingredients
  y += 30
  ctx.fillStyle = '#1C1B1F'
  ctx.font = 'bold 40px Rubik, sans-serif'
  ctx.fillText('מצרכים', W - PAD, y)
  y += 50

  ctx.font = '32px Rubik, sans-serif'
  ctx.fillStyle = '#49454F'
  const maxIngredients = Math.min(recipe.ingredients.length, 10)
  for (let i = 0; i < maxIngredients; i++) {
    const ing = parseIngredient(recipe.ingredients[i])
    const text = [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')
    ctx.fillText(`• ${text}`, W - PAD, y)
    y += 44
  }
  if (recipe.ingredients.length > 10) {
    ctx.fillText(`...ועוד ${recipe.ingredients.length - 10}`, W - PAD, y)
    y += 44
  }

  // Branding at bottom
  ctx.fillStyle = '#B41C1B'
  ctx.font = 'bold 36px Rubik, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('בישי מתכונים 🍽️', W / 2, H - 60)

  if (recipe.profiles?.display_name) {
    ctx.fillStyle = '#79747E'
    ctx.font = '28px Rubik, sans-serif'
    ctx.fillText(`הוסיף/ה: ${recipe.profiles.display_name}`, W / 2, H - 110)
  }

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recipe.title}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}
