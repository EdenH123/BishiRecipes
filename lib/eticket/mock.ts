import { FlightResult, FlightSearchParams } from "./types";

// Seeded RNG — same route+date always gives same results
function seededRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return function () {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    h = h >>> 0;
    return h / 4294967296;
  };
}

// Major airports: [city, country, lat, lng]
const AIRPORTS: Record<string, [string, string, number, number]> = {
  JFK: ["New York", "US", 40.64, -73.78], LAX: ["Los Angeles", "US", 33.94, -118.41],
  ORD: ["Chicago", "US", 41.98, -87.91], ATL: ["Atlanta", "US", 33.64, -84.43],
  DFW: ["Dallas", "US", 32.90, -97.04], MIA: ["Miami", "US", 25.80, -80.29],
  SFO: ["San Francisco", "US", 37.62, -122.38], SEA: ["Seattle", "US", 47.45, -122.31],
  LHR: ["London", "GB", 51.48, -0.46], CDG: ["Paris", "FR", 49.01, 2.55],
  FRA: ["Frankfurt", "DE", 50.03, 8.57], AMS: ["Amsterdam", "NL", 52.31, 4.77],
  MAD: ["Madrid", "ES", 40.47, -3.57], FCO: ["Rome", "IT", 41.80, 12.25],
  ZRH: ["Zurich", "CH", 47.46, 8.55], VIE: ["Vienna", "AT", 48.11, 16.57],
  IST: ["Istanbul", "TR", 41.27, 28.74], DXB: ["Dubai", "AE", 25.25, 55.36],
  DOH: ["Doha", "QA", 25.27, 51.61], AUH: ["Abu Dhabi", "AE", 24.43, 54.65],
  BOM: ["Mumbai", "IN", 19.09, 72.87], DEL: ["New Delhi", "IN", 28.56, 77.10],
  BLR: ["Bangalore", "IN", 13.20, 77.71], MAA: ["Chennai", "IN", 12.99, 80.18],
  HYD: ["Hyderabad", "IN", 17.23, 78.43], CCU: ["Kolkata", "IN", 22.65, 88.45],
  SIN: ["Singapore", "SG", 1.36, 103.99], KUL: ["Kuala Lumpur", "MY", 2.74, 101.71],
  BKK: ["Bangkok", "TH", 13.69, 100.75], CGK: ["Jakarta", "ID", -6.13, 106.66],
  HKG: ["Hong Kong", "HK", 22.31, 113.92], PVG: ["Shanghai", "CN", 31.14, 121.81],
  PEK: ["Beijing", "CN", 40.07, 116.60], ICN: ["Seoul", "KR", 37.46, 126.44],
  NRT: ["Tokyo", "JP", 35.77, 140.39], SYD: ["Sydney", "AU", -33.95, 151.18],
  MEL: ["Melbourne", "AU", -37.67, 144.84], CAI: ["Cairo", "EG", 30.13, 31.41],
  JNB: ["Johannesburg", "ZA", -26.13, 28.24], NBO: ["Nairobi", "KE", -1.32, 36.93],
  GRU: ["São Paulo", "BR", -23.43, -46.47], EZE: ["Buenos Aires", "AR", -34.82, -58.54],
  BOG: ["Bogotá", "CO", 4.70, -74.14], LIM: ["Lima", "PE", -12.02, -77.11],
  YYZ: ["Toronto", "CA", 43.68, -79.63], YVR: ["Vancouver", "CA", 49.19, -123.18],
  MEX: ["Mexico City", "MX", 19.44, -99.07], TLV: ["Tel Aviv", "IL", 32.00, 34.89],
  MUC: ["Munich", "DE", 48.35, 11.79], BCN: ["Barcelona", "ES", 41.30, 2.08],
};

// Airlines per region with realistic aircraft
const AIRLINE_POOLS: Array<{ code: string; name: string; aircraft: string[] }> = [
  { code: "AA", name: "American Airlines", aircraft: ["BOEING 737-800", "BOEING 777-200", "AIRBUS A321"] },
  { code: "DL", name: "Delta Air Lines", aircraft: ["BOEING 737-800", "BOEING 767-300", "AIRBUS A220"] },
  { code: "UA", name: "United Airlines", aircraft: ["BOEING 737-800", "BOEING 787-9", "AIRBUS A320"] },
  { code: "BA", name: "British Airways", aircraft: ["BOEING 777-300ER", "AIRBUS A320", "BOEING 787-9"] },
  { code: "LH", name: "Lufthansa", aircraft: ["AIRBUS A320", "AIRBUS A330-300", "BOEING 747-400"] },
  { code: "AF", name: "Air France", aircraft: ["AIRBUS A320", "BOEING 777-300ER", "AIRBUS A350-900"] },
  { code: "EK", name: "Emirates", aircraft: ["BOEING 777-300ER", "AIRBUS A380", "BOEING 777-200"] },
  { code: "QR", name: "Qatar Airways", aircraft: ["BOEING 787-9", "AIRBUS A350-900", "BOEING 777-300ER"] },
  { code: "EY", name: "Etihad Airways", aircraft: ["BOEING 787-9", "AIRBUS A380", "BOEING 777-300ER"] },
  { code: "SQ", name: "Singapore Airlines", aircraft: ["AIRBUS A380", "BOEING 787-10", "AIRBUS A350-900"] },
  { code: "CX", name: "Cathay Pacific", aircraft: ["BOEING 777-300ER", "AIRBUS A350-900", "BOEING 747-400"] },
  { code: "TK", name: "Turkish Airlines", aircraft: ["BOEING 737-800", "AIRBUS A330-300", "BOEING 777-300ER"] },
  { code: "AI", name: "Air India", aircraft: ["BOEING 787-8", "AIRBUS A320", "BOEING 777-200"] },
  { code: "6E", name: "IndiGo", aircraft: ["AIRBUS A320neo", "AIRBUS A321neo", "AIRBUS A320"] },
  { code: "SG", name: "SpiceJet", aircraft: ["BOEING 737-800", "BOEING 737 MAX 8", "BOEING 737"] },
  { code: "UK", name: "Vistara", aircraft: ["AIRBUS A320neo", "BOEING 787-9", "AIRBUS A321"] },
  { code: "TG", name: "Thai Airways", aircraft: ["BOEING 777-300ER", "AIRBUS A350-900", "AIRBUS A330-300"] },
  { code: "MH", name: "Malaysia Airlines", aircraft: ["AIRBUS A330-300", "BOEING 737-800", "AIRBUS A350-900"] },
  { code: "QF", name: "Qantas", aircraft: ["BOEING 787-9", "AIRBUS A380", "BOEING 737-800"] },
  { code: "NH", name: "All Nippon Airways", aircraft: ["BOEING 787-9", "AIRBUS A320", "BOEING 777-300ER"] },
  { code: "KE", name: "Korean Air", aircraft: ["BOEING 777-300ER", "AIRBUS A330-300", "BOEING 747-400"] },
  { code: "KL", name: "KLM", aircraft: ["BOEING 777-300ER", "BOEING 737-800", "AIRBUS A330-300"] },
  { code: "IB", name: "Iberia", aircraft: ["AIRBUS A320", "AIRBUS A330-200", "AIRBUS A350-900"] },
  { code: "SK", name: "Scandinavian Airlines", aircraft: ["AIRBUS A320neo", "AIRBUS A330-300", "BOEING 737-800"] },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDurationMins(from: string, to: string): number {
  const orig = AIRPORTS[from];
  const dest = AIRPORTS[to];
  if (!orig || !dest) return 180; // default 3h
  const km = haversineKm(orig[2], orig[3], dest[2], dest[3]);
  // ~850 km/h cruise + ~45 min overhead
  return Math.round((km / 850) * 60 + 45);
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}hr(s) ${m}min(s)`;
}

function addMinutes(dateStr: string, mins: number): string {
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

function padTwo(n: number): string {
  return String(n).padStart(2, "0");
}

export function generateMockFlights(params: FlightSearchParams): FlightResult[] {
  const { from, to, date } = params;
  const rng = seededRng(`${from}-${to}-${date}`);

  const origInfo = AIRPORTS[from.toUpperCase()] ?? [from, "", 0, 0];
  const destInfo = AIRPORTS[to.toUpperCase()] ?? [to, "", 0, 0];
  const durationMins = estimateDurationMins(from.toUpperCase(), to.toUpperCase());

  // Pick 6 airlines
  const pool = [...AIRLINE_POOLS].sort(() => rng() - 0.5).slice(0, 6);

  // Departure times spread through the day
  const depHours = [2, 5, 8, 11, 15, 19].map((h) => h + Math.floor(rng() * 3));

  return pool.map((airline, i) => {
    const flightNum = 100 + Math.floor(rng() * 900);
    const depH = depHours[i] % 24;
    const depM = Math.floor(rng() * 4) * 15; // 0, 15, 30, 45
    const depIso = `${date}T${padTwo(depH)}:${padTwo(depM)}:00`;
    const arrIso = addMinutes(depIso, durationMins + Math.floor(rng() * 20) - 10);
    const aircraft = airline.aircraft[Math.floor(rng() * airline.aircraft.length)];
    const terminals = ["1", "2", "3", "A", "B"];
    const depTerminal = terminals[Math.floor(rng() * 3)];
    const arrTerminal = terminals[Math.floor(rng() * 3)];

    return {
      id: `${airline.code}${flightNum}-${date}`,
      airline: {
        code: airline.code,
        name: airline.name,
        flightNumber: `${airline.code} ${flightNum}`,
      },
      origin: {
        iata: from.toUpperCase(),
        city: origInfo[0],
        country: origInfo[1],
        terminal: depTerminal,
        at: depIso,
      },
      destination: {
        iata: to.toUpperCase(),
        city: destInfo[0],
        country: destInfo[1],
        terminal: arrTerminal,
        at: arrIso,
      },
      duration: formatDuration(durationMins),
      durationRaw: "",
      aircraft,
      cabin: "Economy",
      meal: "Snack",
      status: "Confirmed",
      distance: `${Math.round(haversineKm(origInfo[2] as number, origInfo[3] as number, destInfo[2] as number, destInfo[3] as number) * 0.621)} mi`,
      numberOfStops: 0,
    };
  });
}
