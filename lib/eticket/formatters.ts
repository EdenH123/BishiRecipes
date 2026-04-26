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
