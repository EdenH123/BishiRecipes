import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportRecipeAsImage } from '@/lib/export-recipe'

// Mock canvas context methods
function createMockContext(): Record<string, unknown> {
  return {
    direction: 'ltr',
    textAlign: 'left',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    measureText: vi.fn(() => ({ width: 50 })),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    roundRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  }
}

describe('exportRecipeAsImage', () => {
  let mockCtx: Record<string, unknown>
  let createdElements: HTMLElement[]
  let clickedLinks: { href: string; download: string }[]

  beforeEach(() => {
    mockCtx = createMockContext()
    createdElements = []
    clickedLinks = []

    // Mock document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = {
          tagName: 'CANVAS',
          width: 0,
          height: 0,
          getContext: vi.fn(() => mockCtx),
          toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
            cb(new Blob(['fake'], { type: 'image/png' }))
          }),
        } as unknown as HTMLCanvasElement
        createdElements.push(canvas as unknown as HTMLElement)
        return canvas
      }
      if (tag === 'a') {
        const anchor = {
          tagName: 'A',
          href: '',
          download: '',
          click: vi.fn(function (this: { href: string; download: string }) {
            clickedLinks.push({ href: this.href, download: this.download })
          }),
        }
        return anchor as unknown as HTMLAnchorElement
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    })

    // Mock URL methods
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  const baseRecipe = {
    title: 'פסטה ברוטב עגבניות',
    ingredients: [
      JSON.stringify({ amount: '400', unit: 'גרם', name: 'פסטה' }),
      JSON.stringify({ amount: '2', unit: 'כוסות', name: 'רוטב עגבניות' }),
    ],
    steps: ['לבשל את הפסטה', 'להוסיף רוטב'],
  }

  it('creates a canvas and triggers download', async () => {
    await exportRecipeAsImage(baseRecipe)

    // Should have created canvases (measure + draw)
    expect(createdElements.length).toBeGreaterThanOrEqual(1)
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
  })

  it('sets download filename from recipe title', async () => {
    await exportRecipeAsImage(baseRecipe)

    expect(clickedLinks.length).toBe(1)
    expect(clickedLinks[0].download).toBe('פסטה ברוטב עגבניות.png')
  })

  it('renders category badge when provided', async () => {
    await exportRecipeAsImage({ ...baseRecipe, category: 'ארוחת ערב' })

    const fillTextCalls = (mockCtx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const categoryDrawn = fillTextCalls.some(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('ארוחת ערב')
    )
    expect(categoryDrawn).toBe(true)
  })

  it('renders description when provided', async () => {
    await exportRecipeAsImage({ ...baseRecipe, description: 'מתכון קל וטעים' })

    const fillTextCalls = (mockCtx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const descDrawn = fillTextCalls.some(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('מתכון קל וטעים')
    )
    expect(descDrawn).toBe(true)
  })

  it('renders author name when profiles provided', async () => {
    await exportRecipeAsImage({
      ...baseRecipe,
      profiles: { display_name: 'דני' },
    })

    const fillTextCalls = (mockCtx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const authorDrawn = fillTextCalls.some(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('דני')
    )
    expect(authorDrawn).toBe(true)
  })

  it('handles recipe with no image gracefully', async () => {
    await exportRecipeAsImage({ ...baseRecipe, image_url: null })

    // drawImage should not have been called since there's no image
    expect(mockCtx.drawImage).not.toHaveBeenCalled()
  })

  it('handles toBlob returning null', async () => {
    // Override toBlob to return null
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          tagName: 'CANVAS',
          width: 0,
          height: 0,
          getContext: vi.fn(() => mockCtx),
          toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
            cb(null)
          }),
        } as unknown as HTMLCanvasElement
      }
      if (tag === 'a') {
        return {
          tagName: 'A',
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    })

    // Reset call counts after re-mocking
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockClear()

    // Should not throw
    await exportRecipeAsImage(baseRecipe)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
