import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { getFrameDecorations, GoldDecos, FireDecos, IceDecos, RainbowDecos, DiamondDecos, CrownDecos } from '@/components/FrameDecorations'

describe('getFrameDecorations', () => {
  it('returns GoldDecos for frame_gold', () => {
    const result = getFrameDecorations('frame_gold')
    expect(result).not.toBeNull()
  })

  it('returns FireDecos for frame_fire', () => {
    const result = getFrameDecorations('frame_fire')
    expect(result).not.toBeNull()
  })

  it('returns null for unknown frame', () => {
    expect(getFrameDecorations('unknown')).toBeNull()
  })

  it('accepts custom radius', () => {
    const result = getFrameDecorations('frame_gold', 30)
    expect(result).not.toBeNull()
  })
})

describe('decoration components render without errors', () => {
  it('GoldDecos renders SVG stars', () => {
    const { container } = render(<GoldDecos r={44} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(4) // 4 cardinal positions
  })

  it('FireDecos renders SVG flames', () => {
    const { container } = render(<FireDecos r={44} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(3) // 3 flame positions
  })

  it('IceDecos renders SVG crystals', () => {
    const { container } = render(<IceDecos r={44} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(3)
  })

  it('RainbowDecos renders 6 colored gems', () => {
    const { container } = render(<RainbowDecos r={44} />)
    const divs = container.querySelectorAll('.rounded-full')
    expect(divs.length).toBe(6)
  })

  it('DiamondDecos renders SVG gems', () => {
    const { container } = render(<DiamondDecos r={44} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(3)
  })

  it('CrownDecos renders crown and side gems', () => {
    const { container } = render(<CrownDecos r={44} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(1) // crown SVG
    const gems = container.querySelectorAll('.rounded-full')
    expect(gems.length).toBe(2) // side gems
  })

  it('scales decorations with smaller radius', () => {
    const { container } = render(<GoldDecos r={20} />)
    const svg = container.querySelector('svg')
    // At r=20, size = max(8, 20*0.25) = 8
    expect(svg!.style.width).toBe('8px')
  })

  it('scales decorations with larger radius', () => {
    const { container } = render(<GoldDecos r={50} />)
    const svg = container.querySelector('svg')
    // At r=50, size = max(8, 50*0.25) = 12.5
    expect(svg!.style.width).toBe('12.5px')
  })
})
