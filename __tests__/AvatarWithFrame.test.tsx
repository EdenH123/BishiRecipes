import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AvatarWithFrame from '@/components/AvatarWithFrame'

describe('AvatarWithFrame', () => {
  it('renders initials when no avatar URL', () => {
    render(
      <AvatarWithFrame userId="user-1" displayName="דני" />
    )
    expect(screen.getByText('ד')).toBeInTheDocument()
  })

  it('renders avatar image when URL provided', () => {
    render(
      <AvatarWithFrame userId="user-1" avatarUrl="https://example.com/avatar.jpg" displayName="דני" />
    )
    const img = screen.getByAltText('דני')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('renders ? for missing displayName', () => {
    render(
      <AvatarWithFrame userId="user-1" />
    )
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('applies custom size', () => {
    const { container } = render(
      <AvatarWithFrame userId="user-1" displayName="test" size={60} />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.width).toBe('60px')
    expect(wrapper.style.height).toBe('60px')
  })

  it('renders frame gradient when frameId provided', () => {
    const { container } = render(
      <AvatarWithFrame userId="user-1" displayName="test" frameId="frame_gold" />
    )
    // Container should be larger (size + 8) when frame is present
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.width).toBe('48px') // default 40 + 8
  })

  it('renders without frame when frameId is null', () => {
    const { container } = render(
      <AvatarWithFrame userId="user-1" displayName="test" frameId={null} />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.width).toBe('40px') // default size, no extra
  })
})
