const AIRLINES: Record<string, string> = {
  AA: "American Airlines", AC: "Air Canada", AF: "Air France",
  AI: "Air India", AK: "AirAsia", AM: "Aeromexico",
  AR: "Aerolíneas Argentinas", AT: "Royal Air Maroc", AV: "Avianca",
  AY: "Finnair", AZ: "ITA Airways", BA: "British Airways",
  BG: "Biman Bangladesh", BI: "Royal Brunei Airlines", BR: "EVA Air",
  BW: "Caribbean Airlines", CA: "Air China", CI: "China Airlines",
  CX: "Cathay Pacific", CZ: "China Southern Airlines",
  DL: "Delta Air Lines", EK: "Emirates", ET: "Ethiopian Airlines",
  EY: "Etihad Airways", FJ: "Fiji Airways", FZ: "flydubai",
  GA: "Garuda Indonesia", GF: "Gulf Air", HA: "Hawaiian Airlines",
  HM: "Air Seychelles", HR: "Hahn Air", IB: "Iberia",
  IC: "IndiGo", IK: "Imair Airlines", IR: "Iran Air",
  JL: "Japan Airlines", JP: "Adria Airways", JQ: "Jetstar",
  JU: "Air Serbia", KE: "Korean Air", KL: "KLM",
  KM: "Air Malta", KQ: "Kenya Airways", KU: "Kuwait Airways",
  LA: "LATAM Airlines", LH: "Lufthansa", LO: "LOT Polish Airlines",
  LX: "Swiss International Air Lines", LY: "El Al",
  MH: "Malaysia Airlines", MK: "Air Mauritius", MS: "EgyptAir",
  MU: "China Eastern Airlines", MX: "Breeze Airways",
  NH: "All Nippon Airways", NZ: "Air New Zealand",
  OK: "Czech Airlines", OS: "Austrian Airlines",
  OZ: "Asiana Airlines", PC: "Pegasus Airlines",
  PK: "Pakistan International Airlines", PR: "Philippine Airlines",
  PS: "Ukraine International Airlines", PX: "Air Niugini",
  PY: "Surinam Airways", QF: "Qantas", QR: "Qatar Airways",
  RJ: "Royal Jordanian", RO: "TAROM",
  S7: "S7 Airlines", SA: "South African Airways",
  SG: "SpiceJet", SK: "Scandinavian Airlines",
  SN: "Brussels Airlines", SQ: "Singapore Airlines",
  SU: "Aeroflot", SV: "Saudi Arabian Airlines",
  TG: "Thai Airways", TK: "Turkish Airlines",
  TP: "TAP Air Portugal", TW: "T'way Air",
  UA: "United Airlines", UB: "Myanmar National Airlines",
  UK: "Vistara", UL: "SriLankan Airlines",
  UN: "Transaero", US: "US Airways",
  UX: "Air Europa", VN: "Vietnam Airlines",
  VT: "Air Tahiti", VW: "Transportes Aeromar",
  W6: "Wizz Air", WN: "Southwest Airlines",
  WS: "WestJet", XY: "Flynas", ZH: "Shenzhen Airlines",
};

export function getAirlineName(code: string): string {
  return AIRLINES[code.toUpperCase()] ?? code;
}

// Brand colors for ticket header
export const AIRLINE_COLORS: Record<string, { bg: string; text: string }> = {
  LY: { bg: '#003366', text: '#ffffff' },  // El Al
  EK: { bg: '#d71920', text: '#ffffff' },  // Emirates
  QR: { bg: '#5c0632', text: '#ffffff' },  // Qatar
  BA: { bg: '#075AAA', text: '#ffffff' },  // British Airways
  LH: { bg: '#05164d', text: '#ffffff' },  // Lufthansa
  AF: { bg: '#002157', text: '#ffffff' },  // Air France
  TK: { bg: '#c8102e', text: '#ffffff' },  // Turkish Airlines
  UA: { bg: '#002244', text: '#ffffff' },  // United
  DL: { bg: '#003366', text: '#ffffff' },  // Delta
  AA: { bg: '#0078D2', text: '#ffffff' },  // American
  SQ: { bg: '#F0AB00', text: '#1a1a2e' }, // Singapore
  KL: { bg: '#00A1DE', text: '#ffffff' },  // KLM
  EY: { bg: '#BD8B13', text: '#1a1a2e' }, // Etihad
  AI: { bg: '#E8452C', text: '#ffffff' },  // Air India
  TG: { bg: '#6B2C91', text: '#ffffff' },  // Thai Airways
  CX: { bg: '#006564', text: '#ffffff' },  // Cathay Pacific
  QF: { bg: '#E40000', text: '#ffffff' },  // Qantas
  NH: { bg: '#00467F', text: '#ffffff' },  // ANA
  JL: { bg: '#CC0000', text: '#ffffff' },  // JAL
  KE: { bg: '#00256C', text: '#ffffff' },  // Korean Air
  ET: { bg: '#009639', text: '#ffffff' },  // Ethiopian
  SV: { bg: '#006633', text: '#ffffff' },  // Saudia
  FZ: { bg: '#F26F21', text: '#ffffff' },  // flydubai
  W6: { bg: '#CF007C', text: '#ffffff' },  // Wizz Air
  PC: { bg: '#FFD200', text: '#1a1a2e' }, // Pegasus
}

export function getAirlineColor(code: string): { bg: string; text: string } {
  return AIRLINE_COLORS[code.toUpperCase()] ?? { bg: '#1a1a2e', text: '#ffffff' }
}

// Seat options
export const SEAT_ROWS = Array.from({ length: 40 }, (_, i) => i + 1)
export const SEAT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function generateRandomSeat(): string {
  const row = Math.floor(Math.random() * 30) + 1
  const letter = SEAT_LETTERS[Math.floor(Math.random() * SEAT_LETTERS.length)]
  return `${row}${letter}`
}
