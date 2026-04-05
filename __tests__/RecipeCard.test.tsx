import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecipeCard from '@/components/RecipeCard'
import type { Recipe } from '@/lib/types'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" />
  ),
}))

// Mock framer-motion to render plain elements
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div>{children}</div>
    ),
    span: ({ children, className, style, ...props }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties; [key: string]: unknown }) => (
      <span className={className} style={style}>{children}</span>
    ),
    button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <button>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    title: 'פסטה ברוטב עגבניות',
    description: 'מתכון פשוט וטעים',
    ingredients: [
      JSON.stringify({ amount: '400', unit: 'גרם', name: 'פסטה' }),
      JSON.stringify({ amount: '2', unit: 'כוסות', name: 'רוטב עגבניות' }),
    ],
    steps: ['לבשל פסטה', 'להוסיף רוטב'],
    image_url: null,
    video_url: null,
    prep_time: null,
    category: null,
    tags: [],
    created_by: 'user-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('RecipeCard', () => {
  it('renders recipe title', () => {
    render(<RecipeCard recipe={makeRecipe()} />)
    expect(screen.getAllByText('פסטה ברוטב עגבניות').length).toBeGreaterThan(0)
  })

  it('renders recipe description', () => {
    render(<RecipeCard recipe={makeRecipe()} />)
    expect(screen.getByText('מתכון פשוט וטעים')).toBeInTheDocument()
  })

  it('renders tags', () => {
    render(<RecipeCard recipe={makeRecipe({ tags: ['מהיר', 'חלבי', 'ילדים'] })} />)
    expect(screen.getByText('מהיר')).toBeInTheDocument()
    expect(screen.getByText('חלבי')).toBeInTheDocument()
    expect(screen.getByText('ילדים')).toBeInTheDocument()
  })

  it('limits displayed tags to 3', () => {
    render(
      <RecipeCard
        recipe={makeRecipe({ tags: ['א', 'ב', 'ג', 'ד'] })}
      />
    )
    expect(screen.getByText('א')).toBeInTheDocument()
    expect(screen.getByText('ב')).toBeInTheDocument()
    expect(screen.getByText('ג')).toBeInTheDocument()
    expect(screen.queryByText('ד')).not.toBeInTheDocument()
  })

  it('shows logo placeholder when no image_url', () => {
    render(<RecipeCard recipe={makeRecipe({ image_url: null })} />)
    const logo = screen.getByAltText('BISHILicious')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/logo.png')
  })

  it('shows recipe image when image_url is set', () => {
    render(
      <RecipeCard recipe={makeRecipe({ image_url: 'https://example.com/food.jpg' })} />
    )
    const img = screen.getByAltText('פסטה ברוטב עגבניות')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/food.jpg')
  })

  it('shows category badge when category is set', () => {
    render(<RecipeCard recipe={makeRecipe({ category: 'קינוח' })} />)
    expect(screen.getByText('קינוח')).toBeInTheDocument()
  })

  it('shows prep time when set', () => {
    render(<RecipeCard recipe={makeRecipe({ prep_time: 30 })} />)
    expect(screen.getByText(/30/)).toBeInTheDocument()
  })

  it('shows author name when profiles provided', () => {
    render(
      <RecipeCard
        recipe={makeRecipe({
          profiles: {
            id: 'user-1',
            display_name: 'דני',
            avatar_url: null,
            is_admin: false,
            created_at: '2025-01-01',
          },
        })}
      />
    )
    expect(screen.getByText(/דני/)).toBeInTheDocument()
  })

  it('links to recipe page', () => {
    render(<RecipeCard recipe={makeRecipe({ id: 'abc-123' })} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/recipe/abc-123')
  })

  it('renders ingredients on the back side', () => {
    render(<RecipeCard recipe={makeRecipe()} />)
    // The back side always renders (just hidden via CSS transform)
    expect(screen.getByText('מצרכים')).toBeInTheDocument()
  })

  it('shows "אין מצרכים" when ingredients array is empty', () => {
    render(<RecipeCard recipe={makeRecipe({ ingredients: [] })} />)
    expect(screen.getByText('אין מצרכים')).toBeInTheDocument()
  })
})
