import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock supabase
const mockSelect = vi.fn()
const mockEqChain = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()
const mockDeleteEq2 = vi.fn()

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'favorites') {
      return {
        select: mockSelect,
        insert: mockInsert,
        delete: () => ({
          eq: mockDeleteEq,
        }),
      }
    }
    return {}
  }),
}

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({
      children,
      onClick,
      disabled,
      className,
      ...props
    }: {
      children?: React.ReactNode
      onClick?: () => void
      disabled?: boolean
      className?: string
      'aria-label'?: string
      [key: string]: unknown
    }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        className={className}
        aria-label={props['aria-label']}
      >
        {children}
      </button>
    ),
    span: ({
      children,
      className,
      style,
      ...props
    }: {
      children?: React.ReactNode
      className?: string
      style?: React.CSSProperties
      [key: string]: unknown
    }) => (
      <span className={className} style={style}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import FavoriteButton from '@/components/FavoriteButton'

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: not favorited
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })
  })

  it('renders with unfavorited state initially', async () => {
    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    await waitFor(() => {
      const btn = screen.getByRole('button')
      expect(btn).toHaveAttribute('aria-label', 'הוסף למועדפים')
    })
  })

  it('renders with favorited state when data exists', async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: 'user-1', recipe_id: 'recipe-1' },
            error: null,
          }),
        }),
      }),
    })

    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    await waitFor(() => {
      const btn = screen.getByRole('button')
      expect(btn).toHaveAttribute('aria-label', 'הסר ממועדפים')
    })
  })

  it('renders star icon text', async () => {
    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    await waitFor(() => {
      expect(screen.getByText('star')).toBeInTheDocument()
    })
  })

  it('applies amber color class when favorited', async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: 'user-1', recipe_id: 'recipe-1' },
            error: null,
          }),
        }),
      }),
    })

    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    await waitFor(() => {
      const star = screen.getByText('star')
      expect(star.className).toContain('text-amber-500')
    })
  })

  it('applies gray color class when not favorited', async () => {
    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    await waitFor(() => {
      const star = screen.getByText('star')
      expect(star.className).toContain('text-gray-400')
    })
  })

  it('toggles to favorited on click', async () => {
    mockInsert.mockResolvedValue({ error: null })

    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    await waitFor(() => {
      const btn = screen.getByRole('button')
      expect(btn).toHaveAttribute('aria-label', 'הסר ממועדפים')
    })
  })

  it('calls supabase insert when favoriting', async () => {
    mockInsert.mockResolvedValue({ error: null })

    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        recipe_id: 'recipe-1',
      })
    })
  })

  it('toggles to unfavorited on click when already favorited', async () => {
    // Start as favorited
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: 'user-1', recipe_id: 'recipe-1' },
            error: null,
          }),
        }),
      }),
    })
    mockDeleteEq.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'הסר ממועדפים')
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    await waitFor(() => {
      const btn = screen.getByRole('button')
      expect(btn).toHaveAttribute('aria-label', 'הוסף למועדפים')
    })
  })

  it('is disabled while loading', () => {
    // Make the initial check never resolve
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
      }),
    })

    render(<FavoriteButton recipeId="recipe-1" userId="user-1" />)

    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })
})
