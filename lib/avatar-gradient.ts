/**
 * Generates a deterministic colorful gradient for users without profile photos.
 * The gradient is derived from a hash of the user ID so the same user always
 * gets the same colors.
 */

// Warm, friendly palette suited for a cooking app
const PALETTE = [
  '#FF6B6B', // coral red
  '#FFE66D', // sunny yellow
  '#FF8E53', // tangerine
  '#F7797D', // salmon pink
  '#C471ED', // soft purple
  '#12C2E9', // sky blue
  '#A8E063', // lime green
  '#FDBB2D', // golden amber
  '#F78CA0', // rose
  '#36D1DC', // turquoise
  '#FDC830', // marigold
  '#E44D26', // warm orange-red
  '#FC5C7D', // watermelon
  '#6A82FB', // periwinkle
  '#38EF7D', // mint green
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // convert to 32-bit int
  }
  return Math.abs(hash)
}

export function getAvatarGradient(userId: string): string {
  const hash = hashString(userId)
  const index1 = hash % PALETTE.length
  // Use a second derivation so the two colors differ
  const index2 = (hash >> 8) % PALETTE.length
  const color1 = PALETTE[index1]
  // If both indices collide, nudge to the next colour
  const color2 = PALETTE[index2 === index1 ? (index2 + 1) % PALETTE.length : index2]
  return `linear-gradient(135deg, ${color1}, ${color2})`
}
