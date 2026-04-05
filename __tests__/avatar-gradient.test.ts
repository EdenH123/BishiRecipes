import { describe, it, expect } from 'vitest'
import { getAvatarGradient } from '@/lib/avatar-gradient'

describe('getAvatarGradient', () => {
  it('returns a CSS gradient string', () => {
    const result = getAvatarGradient('user-123')
    expect(result).toMatch(/^linear-gradient\(135deg, #[0-9A-Fa-f]+, #[0-9A-Fa-f]+\)$/)
  })

  it('is deterministic (same input = same output)', () => {
    const a = getAvatarGradient('abc')
    const b = getAvatarGradient('abc')
    expect(a).toBe(b)
  })

  it('produces different gradients for different users', () => {
    const a = getAvatarGradient('user-1')
    const b = getAvatarGradient('user-2')
    expect(a).not.toBe(b)
  })

  it('uses two different colors', () => {
    const result = getAvatarGradient('test-user')
    const colors = result.match(/#[0-9A-Fa-f]+/g)
    expect(colors).toHaveLength(2)
    expect(colors![0]).not.toBe(colors![1])
  })
})
