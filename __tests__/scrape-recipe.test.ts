import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/server
vi.mock('next/server', () => {
  class MockNextRequest {
    private body: unknown
    constructor(url: string, init?: { method?: string; body?: string }) {
      this.body = init?.body ? JSON.parse(init.body) : null
    }
    async json() {
      return this.body
    }
  }

  class MockNextResponse {
    static json(data: unknown, init?: { status?: number }) {
      return {
        status: init?.status || 200,
        json: async () => data,
      }
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  }
})

// Mock global fetch for the scraper's outbound requests
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock AbortSignal.timeout
vi.stubGlobal('AbortSignal', {
  timeout: vi.fn(() => ({})),
})

import { POST } from '@/app/api/scrape-recipe/route'
import { NextRequest } from 'next/server'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/scrape-recipe', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('scrape-recipe POST handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 if no URL provided', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('URL is required')
  })

  it('returns 400 if URL is not a string', async () => {
    const res = await POST(makeRequest({ url: 123 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid URL format', async () => {
    const res = await POST(makeRequest({ url: 'not-a-url' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid URL')
  })

  it('returns 400 for non-http protocol', async () => {
    const res = await POST(makeRequest({ url: 'ftp://example.com/recipe' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid URL')
  })

  it('returns 502 when fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 })

    const res = await POST(makeRequest({ url: 'https://example.com/recipe' }))
    expect(res.status).toBe(502)
  })

  it('returns 422 when no recipe data found on page', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><body><p>Hello world</p></body></html>',
    })

    const res = await POST(makeRequest({ url: 'https://example.com/page' }))
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error).toBe('Could not find recipe data on this page')
  })

  it('extracts recipe from JSON-LD structured data', async () => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'עוגת שוקולד',
      description: 'עוגה פשוטה וטעימה',
      recipeIngredient: ['200 גרם שוקולד', '3 ביצים', '1 כוס סוכר'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'להמיס את השוקולד' },
        { '@type': 'HowToStep', text: 'להוסיף ביצים' },
      ],
      image: 'https://example.com/cake.jpg',
    }

    const html = `
      <html>
      <head>
        <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      </head>
      <body><h1>Recipe</h1></body>
      </html>
    `

    mockFetch.mockResolvedValue({ ok: true, text: async () => html })

    const res = await POST(makeRequest({ url: 'https://example.com/recipe' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe('עוגת שוקולד')
    expect(data.description).toBe('עוגה פשוטה וטעימה')
    expect(data.ingredients).toEqual(['200 גרם שוקולד', '3 ביצים', '1 כוס סוכר'])
    expect(data.steps).toEqual(['להמיס את השוקולד', 'להוסיף ביצים'])
    expect(data.image).toBe('https://example.com/cake.jpg')
  })

  it('extracts recipe from JSON-LD with @graph array', async () => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Some Page' },
        {
          '@type': 'Recipe',
          name: 'סלט קיסר',
          description: '',
          recipeIngredient: ['חסה', 'קרוטונים'],
          recipeInstructions: 'לערבב הכל ביחד',
          image: ['https://example.com/salad.jpg'],
        },
      ],
    }

    const html = `
      <html><head>
        <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      </head><body></body></html>
    `

    mockFetch.mockResolvedValue({ ok: true, text: async () => html })

    const res = await POST(makeRequest({ url: 'https://example.com/salad' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe('סלט קיסר')
    expect(data.ingredients).toEqual(['חסה', 'קרוטונים'])
    expect(data.steps).toEqual(['לערבב הכל ביחד'])
    expect(data.image).toBe('https://example.com/salad.jpg')
  })

  it('extracts recipe from JSON-LD with HowToSection', async () => {
    const jsonLd = {
      '@type': 'Recipe',
      name: 'מתכון מורכב',
      recipeIngredient: ['קמח'],
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          itemListElement: [
            { '@type': 'HowToStep', text: 'שלב ראשון' },
            { '@type': 'HowToStep', text: 'שלב שני' },
          ],
        },
      ],
    }

    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    </head><body></body></html>`

    mockFetch.mockResolvedValue({ ok: true, text: async () => html })

    const res = await POST(makeRequest({ url: 'https://example.com/complex' }))
    const data = await res.json()
    expect(data.steps).toEqual(['שלב ראשון', 'שלב שני'])
  })

  it('extracts recipe from JSON-LD with string instructions', async () => {
    const jsonLd = {
      '@type': 'Recipe',
      name: 'תה',
      recipeIngredient: ['מים', 'שקית תה'],
      recipeInstructions: 'להרתיח מים\nלהכניס שקית תה',
      image: { url: 'https://example.com/tea.jpg' },
    }

    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    </head><body></body></html>`

    mockFetch.mockResolvedValue({ ok: true, text: async () => html })

    const res = await POST(makeRequest({ url: 'https://example.com/tea' }))
    const data = await res.json()
    expect(data.steps).toEqual(['להרתיח מים', 'להכניס שקית תה'])
    expect(data.image).toBe('https://example.com/tea.jpg')
  })

  it('falls back to HTML extraction when no JSON-LD', async () => {
    const html = `
      <html>
      <head>
        <title>פיצה ביתית</title>
        <meta property="og:title" content="פיצה ביתית" />
        <meta property="og:description" content="מתכון לפיצה" />
        <meta property="og:image" content="https://example.com/pizza.jpg" />
      </head>
      <body>
        <ul class="recipe-ingredients">
          <li>קמח</li>
          <li>מים</li>
        </ul>
        <ol class="recipe-instructions">
          <li>ללוש את הבצק</li>
          <li>לאפות בתנור</li>
        </ol>
      </body>
      </html>
    `

    mockFetch.mockResolvedValue({ ok: true, text: async () => html })

    const res = await POST(makeRequest({ url: 'https://example.com/pizza' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe('פיצה ביתית')
    expect(data.description).toBe('מתכון לפיצה')
    expect(data.image).toBe('https://example.com/pizza.jpg')
    expect(data.ingredients).toEqual(['קמח', 'מים'])
    expect(data.steps).toEqual(['ללוש את הבצק', 'לאפות בתנור'])
  })

  it('handles JSON-LD with array @type including Recipe', async () => {
    const jsonLd = {
      '@type': ['WebPage', 'Recipe'],
      name: 'סלט',
      recipeIngredient: ['עגבניות'],
      recipeInstructions: [{ text: 'לחתוך' }],
    }

    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    </head><body></body></html>`

    mockFetch.mockResolvedValue({ ok: true, text: async () => html })

    const res = await POST(makeRequest({ url: 'https://example.com/salad' }))
    const data = await res.json()
    expect(data.title).toBe('סלט')
  })

  it('strips HTML tags from ingredients', async () => {
    const jsonLd = {
      '@type': 'Recipe',
      name: 'Test',
      recipeIngredient: ['<b>200 גרם</b> שוקולד', '3 <em>ביצים</em>'],
      recipeInstructions: [{ text: 'Do something' }],
    }

    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    </head><body></body></html>`

    mockFetch.mockResolvedValue({ ok: true, text: async () => html })

    const res = await POST(makeRequest({ url: 'https://example.com/test' }))
    const data = await res.json()
    expect(data.ingredients[0]).toBe('200 גרם שוקולד')
    expect(data.ingredients[1]).toBe('3 ביצים')
  })

  it('returns 500 for unexpected errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const res = await POST(makeRequest({ url: 'https://example.com/fail' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Network error')
  })
})
