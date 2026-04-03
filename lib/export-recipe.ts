import { parseIngredient } from './types'

interface ExportRecipe {
  title: string
  description?: string | null
  ingredients: string[]
  steps: string[]
  category?: string | null
  image_url?: string | null
  profiles?: { display_name: string } | null
}

const W = 1080
const PAD = 60
const CONTENT_W = W - PAD * 2

export async function exportRecipeAsImage(recipe: ExportRecipe): Promise<void> {
  // First pass: calculate total height needed
  const measureCanvas = document.createElement('canvas')
  measureCanvas.width = W
  measureCanvas.height = 100
  const mCtx = measureCanvas.getContext('2d')!
  mCtx.direction = 'rtl'

  let totalH = PAD // top padding

  // Image
  const IMG_H = 600
  let recipeImg: HTMLImageElement | null = null
  if (recipe.image_url) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject()
        img.src = recipe.image_url!
      })
      recipeImg = img
      totalH += IMG_H + 40
    } catch { /* skip */ }
  }

  // Title
  mCtx.font = 'bold 56px Rubik, sans-serif'
  const titleLines = wrapText(mCtx, recipe.title, CONTENT_W)
  totalH += titleLines.length * 68 + 10

  // Category
  if (recipe.category) totalH += 56

  // Description
  let descLines: string[] = []
  if (recipe.description) {
    mCtx.font = '32px Rubik, sans-serif'
    descLines = wrapTextMultiline(mCtx, recipe.description, CONTENT_W)
    totalH += descLines.length * 42 + 20
  }

  // Ingredients section
  totalH += 70 // header
  mCtx.font = '30px Rubik, sans-serif'
  const ingLines: string[][] = []
  for (const raw of recipe.ingredients) {
    const ing = parseIngredient(raw)
    const text = `• ${[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}`
    const lines = wrapText(mCtx, text, CONTENT_W)
    ingLines.push(lines)
    totalH += lines.length * 40
  }
  totalH += 10

  // Steps section
  totalH += 70 // header
  mCtx.font = '30px Rubik, sans-serif'
  const stepLines: string[][] = []
  for (let i = 0; i < recipe.steps.length; i++) {
    const text = `${i + 1}. ${recipe.steps[i]}`
    const lines = wrapText(mCtx, text, CONTENT_W - 20)
    stepLines.push(lines)
    totalH += lines.length * 40 + 12
  }

  // Branding footer
  totalH += 120

  // Add some bottom padding
  totalH += PAD

  // Second pass: actually draw
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = totalH
  const ctx = canvas.getContext('2d')!

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, totalH)
  grad.addColorStop(0, '#FFF8F7')
  grad.addColorStop(1, '#F5E6E0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, totalH)

  ctx.textAlign = 'right'
  ctx.direction = 'rtl'

  let y = PAD

  // Recipe image
  if (recipeImg) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(PAD, y, CONTENT_W, IMG_H, 24)
    ctx.clip()
    const scale = Math.max(CONTENT_W / recipeImg.width, IMG_H / recipeImg.height)
    const sw = recipeImg.width * scale
    const sh = recipeImg.height * scale
    ctx.drawImage(
      recipeImg,
      PAD + (CONTENT_W - sw) / 2,
      y + (IMG_H - sh) / 2,
      sw,
      sh,
    )
    ctx.restore()
    // Subtle border
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(PAD, y, CONTENT_W, IMG_H, 24)
    ctx.stroke()
    y += IMG_H + 40
  }

  // Title
  ctx.fillStyle = '#1C1B1F'
  ctx.font = 'bold 56px Rubik, sans-serif'
  for (const line of titleLines) {
    ctx.fillText(line, W - PAD, y)
    y += 68
  }
  y += 10

  // Category badge
  if (recipe.category) {
    ctx.font = '500 28px Rubik, sans-serif'
    const tw = ctx.measureText(recipe.category).width
    ctx.fillStyle = '#B41C1B'
    ctx.beginPath()
    ctx.roundRect(W - PAD - tw - 28, y - 30, tw + 28, 42, 21)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(recipe.category, W - PAD - 14, y)
    y += 56
  }

  // Description
  if (descLines.length > 0) {
    ctx.fillStyle = '#49454F'
    ctx.font = '32px Rubik, sans-serif'
    for (const line of descLines) {
      ctx.fillText(line, W - PAD, y)
      y += 42
    }
    y += 20
  }

  // Divider
  ctx.strokeStyle = '#E3BEB9'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  y += 20

  // Ingredients header
  ctx.fillStyle = '#B41C1B'
  ctx.font = 'bold 38px Rubik, sans-serif'
  ctx.fillText('🥘  מצרכים', W - PAD, y)
  y += 50

  // Ingredients
  ctx.font = '30px Rubik, sans-serif'
  ctx.fillStyle = '#1C1B1F'
  for (const lines of ingLines) {
    for (let j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], W - PAD, y)
      y += 40
    }
  }
  y += 10

  // Divider
  ctx.strokeStyle = '#E3BEB9'
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  y += 20

  // Steps header
  ctx.fillStyle = '#B41C1B'
  ctx.font = 'bold 38px Rubik, sans-serif'
  ctx.fillText('👩‍🍳  הוראות הכנה', W - PAD, y)
  y += 50

  // Steps
  ctx.font = '30px Rubik, sans-serif'
  ctx.fillStyle = '#1C1B1F'
  for (const lines of stepLines) {
    for (let j = 0; j < lines.length; j++) {
      // Bold the number on the first line
      if (j === 0) {
        ctx.font = 'bold 30px Rubik, sans-serif'
        const numMatch = lines[j].match(/^(\d+\.)/)
        if (numMatch) {
          const numW = ctx.measureText(numMatch[1] + ' ').width
          ctx.fillStyle = '#B41C1B'
          ctx.fillText(numMatch[1], W - PAD, y)
          ctx.fillStyle = '#1C1B1F'
          ctx.font = '30px Rubik, sans-serif'
          ctx.fillText(lines[j].slice(numMatch[1].length), W - PAD - numW, y)
        } else {
          ctx.fillText(lines[j], W - PAD, y)
        }
        ctx.font = '30px Rubik, sans-serif'
      } else {
        ctx.fillText(lines[j], W - PAD, y)
      }
      y += 40
    }
    y += 12
  }

  // Footer branding
  y += 20
  ctx.fillStyle = '#E3BEB9'
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  y += 30

  ctx.textAlign = 'center'
  ctx.fillStyle = '#B41C1B'
  ctx.font = 'bold 32px Rubik, sans-serif'
  ctx.fillText('בישי מתכונים 🍽️', W / 2, y)
  y += 36

  if (recipe.profiles?.display_name) {
    ctx.fillStyle = '#79747E'
    ctx.font = '26px Rubik, sans-serif'
    ctx.fillText(`הוסיף/ה: ${recipe.profiles.display_name}`, W / 2, y)
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

function wrapTextMultiline(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n')
  const allLines: string[] = []
  for (const p of paragraphs) {
    if (p.trim() === '') {
      allLines.push('')
    } else {
      allLines.push(...wrapText(ctx, p, maxWidth))
    }
  }
  return allLines
}
