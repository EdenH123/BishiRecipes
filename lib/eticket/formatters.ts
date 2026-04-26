import { format, parseISO } from "date-fns";

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy").toUpperCase(); // "15 DEC 2025"
}

export function formatDayOfWeek(iso: string): string {
  return format(parseISO(iso), "EEEE d MMM").toUpperCase(); // "MONDAY 15 DEC"
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm"); // "03:45"
}

export function generateReservationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function generateEticketReceipt(): string {
  return String(Math.floor(1000000000000 + Math.random() * 9000000000000));
}

export function generateShareSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function generatePassportNumber(): string {
  const num = Math.floor(10000000 + Math.random() * 90000000)
  return String(num)
}

// Generate barcode-like SVG data (visual only, not scannable)
export function generateBarcodeBars(seed: string): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 16777619) >>> 0 }
  const bars: number[] = []
  for (let i = 0; i < 60; i++) {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5; h = h >>> 0
    bars.push(h % 3 === 0 ? 2 : h % 3 === 1 ? 1 : 3)
  }
  return bars
}
