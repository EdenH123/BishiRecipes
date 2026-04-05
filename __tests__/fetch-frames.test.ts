import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing the module under test
const mockSelect = vi.fn()
const mockIn = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { fetchEquippedFrames } from '@/lib/fetch-frames'

describe('fetchEquippedFrames', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default chain: from().select().in().eq()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ in: mockIn })
    mockIn.mockReturnValue({ eq: mockEq })
  })

  it('returns empty map for empty user IDs array', async () => {
    const result = await fetchEquippedFrames([])
    expect(result).toEqual(new Map())
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('queries user_items table with correct parameters', async () => {
    mockEq.mockResolvedValue({ data: [] })

    await fetchEquippedFrames(['user-1', 'user-2'])

    expect(mockFrom).toHaveBeenCalledWith('user_items')
    expect(mockSelect).toHaveBeenCalledWith('user_id, item_id')
    expect(mockIn).toHaveBeenCalledWith('user_id', ['user-1', 'user-2'])
    expect(mockEq).toHaveBeenCalledWith('equipped', true)
  })

  it('returns map of user IDs to frame IDs for frame items', async () => {
    mockEq.mockResolvedValue({
      data: [
        { user_id: 'user-1', item_id: 'frame_gold' },
        { user_id: 'user-2', item_id: 'frame_fire' },
      ],
    })

    const result = await fetchEquippedFrames(['user-1', 'user-2'])

    expect(result.get('user-1')).toBe('frame_gold')
    expect(result.get('user-2')).toBe('frame_fire')
    expect(result.size).toBe(2)
  })

  it('excludes non-frame items (e.g., titles)', async () => {
    mockEq.mockResolvedValue({
      data: [
        { user_id: 'user-1', item_id: 'frame_gold' },
        { user_id: 'user-2', item_id: 'title_foodie' },
      ],
    })

    const result = await fetchEquippedFrames(['user-1', 'user-2'])

    expect(result.get('user-1')).toBe('frame_gold')
    expect(result.has('user-2')).toBe(false)
    expect(result.size).toBe(1)
  })

  it('handles null data response gracefully', async () => {
    mockEq.mockResolvedValue({ data: null })

    const result = await fetchEquippedFrames(['user-1'])

    expect(result.size).toBe(0)
  })

  it('excludes unknown item IDs', async () => {
    mockEq.mockResolvedValue({
      data: [
        { user_id: 'user-1', item_id: 'nonexistent_item' },
      ],
    })

    const result = await fetchEquippedFrames(['user-1'])

    expect(result.size).toBe(0)
  })
})
