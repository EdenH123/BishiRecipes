import { FlightResult, FlightSearchParams } from "./types";

function seededRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return function () { h ^= h << 13; h ^= h >> 17; h ^= h << 5; h = h >>> 0; return h / 4294967296; };
}

// [city, country, lat, lng, utcOffsetHours]
const AIRPORTS: Record<string, [string, string, number, number, number]> = {
  JFK: ["New York","US",40.64,-73.78,-5], LAX: ["Los Angeles","US",33.94,-118.41,-8],
  ORD: ["Chicago","US",41.98,-87.91,-6], ATL: ["Atlanta","US",33.64,-84.43,-5],
  DFW: ["Dallas","US",32.90,-97.04,-6], MIA: ["Miami","US",25.80,-80.29,-5],
  SFO: ["San Francisco","US",37.62,-122.38,-8], SEA: ["Seattle","US",47.45,-122.31,-8],
  BOS: ["Boston","US",42.36,-71.01,-5], LAS: ["Las Vegas","US",36.08,-115.15,-8],
  LHR: ["London","GB",51.48,-0.46,0], CDG: ["Paris","FR",49.01,2.55,1],
  FRA: ["Frankfurt","DE",50.03,8.57,1], AMS: ["Amsterdam","NL",52.31,4.77,1],
  MAD: ["Madrid","ES",40.47,-3.57,1], FCO: ["Rome","IT",41.80,12.25,1],
  ZRH: ["Zurich","CH",47.46,8.55,1], VIE: ["Vienna","AT",48.11,16.57,1],
  MUC: ["Munich","DE",48.35,11.79,1], BCN: ["Barcelona","ES",41.30,2.08,1],
  LIS: ["Lisbon","PT",38.78,-9.14,0], CPH: ["Copenhagen","DK",55.62,12.66,1],
  ARN: ["Stockholm","SE",59.65,17.92,1], OSL: ["Oslo","NO",60.20,11.08,1],
  HEL: ["Helsinki","FI",60.32,24.96,2], WAW: ["Warsaw","PL",52.17,20.97,1],
  PRG: ["Prague","CZ",50.10,14.26,1], BUD: ["Budapest","HU",47.43,19.26,1],
  ATH: ["Athens","GR",37.94,23.95,2], DUB: ["Dublin","IE",53.43,-6.27,0],
  IST: ["Istanbul","TR",41.27,28.74,3], DXB: ["Dubai","AE",25.25,55.36,4],
  DOH: ["Doha","QA",25.27,51.61,3], AUH: ["Abu Dhabi","AE",24.43,54.65,4],
  RUH: ["Riyadh","SA",24.96,46.70,3], KWI: ["Kuwait City","KW",29.23,47.97,3],
  AMM: ["Amman","JO",31.72,35.99,2], TLV: ["Tel Aviv","IL",32.00,34.89,2],
  CAI: ["Cairo","EG",30.13,31.41,2], MCT: ["Muscat","OM",23.59,58.28,4],
  BOM: ["Mumbai","IN",19.09,72.87,5.5], DEL: ["New Delhi","IN",28.56,77.10,5.5],
  BLR: ["Bangalore","IN",13.20,77.71,5.5], MAA: ["Chennai","IN",12.99,80.18,5.5],
  HYD: ["Hyderabad","IN",17.23,78.43,5.5], CCU: ["Kolkata","IN",22.65,88.45,5.5],
  CMB: ["Colombo","LK",7.18,79.88,5.5], DAC: ["Dhaka","BD",23.84,90.40,6],
  SIN: ["Singapore","SG",1.36,103.99,8], KUL: ["Kuala Lumpur","MY",2.74,101.71,8],
  BKK: ["Bangkok","TH",13.69,100.75,7], CGK: ["Jakarta","ID",-6.13,106.66,7],
  MNL: ["Manila","PH",14.51,121.02,8], SGN: ["Ho Chi Minh City","VN",10.82,106.66,7],
  HAN: ["Hanoi","VN",21.22,105.81,7], HKG: ["Hong Kong","HK",22.31,113.92,8],
  PVG: ["Shanghai","CN",31.14,121.81,8], PEK: ["Beijing","CN",40.07,116.60,8],
  CAN: ["Guangzhou","CN",23.39,113.30,8], ICN: ["Seoul","KR",37.46,126.44,9],
  NRT: ["Tokyo","JP",35.77,140.39,9], KIX: ["Osaka","JP",34.43,135.24,9],
  TPE: ["Taipei","TW",25.08,121.23,8], SYD: ["Sydney","AU",-33.95,151.18,10],
  MEL: ["Melbourne","AU",-37.67,144.84,10], BNE: ["Brisbane","AU",-27.38,153.12,10],
  PER: ["Perth","AU",-31.94,115.97,8], AKL: ["Auckland","NZ",-37.01,174.79,12],
  JNB: ["Johannesburg","ZA",-26.13,28.24,2], NBO: ["Nairobi","KE",-1.32,36.93,3],
  ADD: ["Addis Ababa","ET",8.98,38.80,3], LOS: ["Lagos","NG",6.58,3.32,1],
  CMN: ["Casablanca","MA",33.37,-7.59,1], GRU: ["São Paulo","BR",-23.43,-46.47,-3],
  EZE: ["Buenos Aires","AR",-34.82,-58.54,-3], BOG: ["Bogotá","CO",4.70,-74.14,-5],
  LIM: ["Lima","PE",-12.02,-77.11,-5], SCL: ["Santiago","CL",-33.39,-70.79,-4],
  MEX: ["Mexico City","MX",19.44,-99.07,-6], PTY: ["Panama City","PA",9.07,-79.38,-5],
  YYZ: ["Toronto","CA",43.68,-79.63,-5], YVR: ["Vancouver","CA",49.19,-123.18,-8],
  YUL: ["Montreal","CA",45.47,-73.74,-5],
};

export const ALL_AIRLINES: Array<{ code: string; name: string; aircraft: string[] }> = [
  { code:"AA", name:"American Airlines",          aircraft:["BOEING 737-800","BOEING 777-200","AIRBUS A321"] },
  { code:"DL", name:"Delta Air Lines",             aircraft:["BOEING 737-800","BOEING 767-300","AIRBUS A220"] },
  { code:"UA", name:"United Airlines",             aircraft:["BOEING 737-800","BOEING 787-9","AIRBUS A320"] },
  { code:"WN", name:"Southwest Airlines",          aircraft:["BOEING 737-800","BOEING 737 MAX 8"] },
  { code:"B6", name:"JetBlue Airways",             aircraft:["AIRBUS A320","AIRBUS A321","EMBRAER E190"] },
  { code:"AS", name:"Alaska Airlines",             aircraft:["BOEING 737-800","BOEING 737-900","AIRBUS A320"] },
  { code:"AC", name:"Air Canada",                  aircraft:["BOEING 787-9","AIRBUS A320","BOEING 737 MAX 8"] },
  { code:"WS", name:"WestJet",                     aircraft:["BOEING 737-800","BOEING 737 MAX 8"] },
  { code:"BA", name:"British Airways",             aircraft:["BOEING 777-300ER","AIRBUS A320","BOEING 787-9"] },
  { code:"LH", name:"Lufthansa",                   aircraft:["AIRBUS A320","AIRBUS A330-300","BOEING 747-400"] },
  { code:"AF", name:"Air France",                  aircraft:["AIRBUS A320","BOEING 777-300ER","AIRBUS A350-900"] },
  { code:"KL", name:"KLM",                         aircraft:["BOEING 777-300ER","BOEING 737-800","AIRBUS A330-300"] },
  { code:"IB", name:"Iberia",                      aircraft:["AIRBUS A320","AIRBUS A330-200","AIRBUS A350-900"] },
  { code:"AZ", name:"ITA Airways",                 aircraft:["AIRBUS A320","AIRBUS A330-200"] },
  { code:"TP", name:"TAP Air Portugal",            aircraft:["AIRBUS A320neo","AIRBUS A330-900neo"] },
  { code:"AY", name:"Finnair",                     aircraft:["AIRBUS A350-900","AIRBUS A321","AIRBUS A320"] },
  { code:"SK", name:"Scandinavian Airlines",       aircraft:["AIRBUS A320neo","AIRBUS A330-300","BOEING 737-800"] },
  { code:"LX", name:"Swiss International Air Lines", aircraft:["AIRBUS A220-300","BOEING 777-300ER","AIRBUS A320"] },
  { code:"OS", name:"Austrian Airlines",           aircraft:["BOEING 767-300","AIRBUS A320","AIRBUS A321"] },
  { code:"TK", name:"Turkish Airlines",            aircraft:["BOEING 737-800","AIRBUS A330-300","BOEING 777-300ER"] },
  { code:"PC", name:"Pegasus Airlines",            aircraft:["AIRBUS A320neo","BOEING 737-800"] },
  { code:"FR", name:"Ryanair",                     aircraft:["BOEING 737-800","BOEING 737 MAX 200"] },
  { code:"U2", name:"easyJet",                     aircraft:["AIRBUS A320","AIRBUS A319","AIRBUS A321neo"] },
  { code:"W6", name:"Wizz Air",                    aircraft:["AIRBUS A320neo","AIRBUS A321neo"] },
  { code:"VY", name:"Vueling",                     aircraft:["AIRBUS A320","AIRBUS A321"] },
  { code:"DY", name:"Norwegian Air Shuttle",       aircraft:["BOEING 737-800","BOEING 787-9"] },
  { code:"LO", name:"LOT Polish Airlines",         aircraft:["BOEING 737-800","BOEING 787-8","EMBRAER E195"] },
  { code:"EK", name:"Emirates",                    aircraft:["BOEING 777-300ER","AIRBUS A380","BOEING 777-200"] },
  { code:"QR", name:"Qatar Airways",               aircraft:["BOEING 787-9","AIRBUS A350-900","BOEING 777-300ER"] },
  { code:"EY", name:"Etihad Airways",              aircraft:["BOEING 787-9","AIRBUS A380","BOEING 777-300ER"] },
  { code:"FZ", name:"flydubai",                    aircraft:["BOEING 737-800","BOEING 737 MAX 8"] },
  { code:"G9", name:"Air Arabia",                  aircraft:["AIRBUS A320","AIRBUS A321neo"] },
  { code:"GF", name:"Gulf Air",                    aircraft:["BOEING 787-9","AIRBUS A320neo"] },
  { code:"KU", name:"Kuwait Airways",              aircraft:["AIRBUS A330-200","BOEING 777-300ER"] },
  { code:"SV", name:"Saudi Arabian Airlines",      aircraft:["BOEING 777-300ER","AIRBUS A320","BOEING 787-9"] },
  { code:"RJ", name:"Royal Jordanian",             aircraft:["BOEING 787-8","AIRBUS A319","AIRBUS A321"] },
  { code:"MS", name:"EgyptAir",                    aircraft:["BOEING 777-300","AIRBUS A220-300","BOEING 737-800"] },
  { code:"LY", name:"El Al",                       aircraft:["BOEING 787-9","BOEING 737-900","BOEING 777-200"] },
  { code:"AI", name:"Air India",                   aircraft:["BOEING 787-8","AIRBUS A320","BOEING 777-200"] },
  { code:"6E", name:"IndiGo",                      aircraft:["AIRBUS A320neo","AIRBUS A321neo","AIRBUS A320"] },
  { code:"SG", name:"SpiceJet",                    aircraft:["BOEING 737-800","BOEING 737 MAX 8"] },
  { code:"UK", name:"Vistara",                     aircraft:["AIRBUS A320neo","BOEING 787-9","AIRBUS A321"] },
  { code:"ET", name:"Ethiopian Airlines",          aircraft:["BOEING 787-9","BOEING 737-800","AIRBUS A350-900"] },
  { code:"KQ", name:"Kenya Airways",               aircraft:["BOEING 787-8","BOEING 737-800"] },
  { code:"AT", name:"Royal Air Maroc",             aircraft:["BOEING 787-9","BOEING 737-800"] },
  { code:"TG", name:"Thai Airways",                aircraft:["BOEING 777-300ER","AIRBUS A350-900","AIRBUS A330-300"] },
  { code:"MH", name:"Malaysia Airlines",           aircraft:["AIRBUS A330-300","BOEING 737-800","AIRBUS A350-900"] },
  { code:"SQ", name:"Singapore Airlines",          aircraft:["AIRBUS A380","BOEING 787-10","AIRBUS A350-900"] },
  { code:"CX", name:"Cathay Pacific",              aircraft:["BOEING 777-300ER","AIRBUS A350-900","BOEING 747-400"] },
  { code:"GA", name:"Garuda Indonesia",            aircraft:["BOEING 737-800","AIRBUS A330-300","BOEING 777-300ER"] },
  { code:"PR", name:"Philippine Airlines",         aircraft:["AIRBUS A321neo","AIRBUS A330-300","BOEING 777-300ER"] },
  { code:"VN", name:"Vietnam Airlines",            aircraft:["AIRBUS A321neo","BOEING 787-9","AIRBUS A350-900"] },
  { code:"VJ", name:"VietJet Air",                 aircraft:["AIRBUS A320","AIRBUS A321neo"] },
  { code:"AK", name:"AirAsia",                     aircraft:["AIRBUS A320neo","AIRBUS A321neo"] },
  { code:"NH", name:"All Nippon Airways",          aircraft:["BOEING 787-9","AIRBUS A320","BOEING 777-300ER"] },
  { code:"JL", name:"Japan Airlines",              aircraft:["BOEING 787-8","AIRBUS A350-900","BOEING 777-300ER"] },
  { code:"KE", name:"Korean Air",                  aircraft:["BOEING 777-300ER","AIRBUS A330-300","BOEING 747-400"] },
  { code:"OZ", name:"Asiana Airlines",             aircraft:["AIRBUS A350-900","BOEING 777-200","AIRBUS A321"] },
  { code:"CI", name:"China Airlines",              aircraft:["AIRBUS A350-900","BOEING 777-300ER","BOEING 737-800"] },
  { code:"BR", name:"EVA Air",                     aircraft:["BOEING 787-10","BOEING 777-300ER","AIRBUS A321"] },
  { code:"CA", name:"Air China",                   aircraft:["BOEING 777-300ER","BOEING 737-800","AIRBUS A350-900"] },
  { code:"MU", name:"China Eastern Airlines",      aircraft:["AIRBUS A320","BOEING 737-800","AIRBUS A350-900"] },
  { code:"CZ", name:"China Southern Airlines",     aircraft:["AIRBUS A320","BOEING 787-8","AIRBUS A380"] },
  { code:"QF", name:"Qantas",                      aircraft:["BOEING 787-9","AIRBUS A380","BOEING 737-800"] },
  { code:"NZ", name:"Air New Zealand",             aircraft:["BOEING 787-9","AIRBUS A320neo","BOEING 777-200"] },
  { code:"AV", name:"Avianca",                     aircraft:["AIRBUS A320","AIRBUS A319","BOEING 787-8"] },
  { code:"LA", name:"LATAM Airlines",              aircraft:["AIRBUS A320","BOEING 787-9","BOEING 767-300"] },
  { code:"AM", name:"Aeromexico",                  aircraft:["BOEING 737-800","BOEING 787-8","BOEING 737 MAX 8"] },
  { code:"CM", name:"Copa Airlines",               aircraft:["BOEING 737-800","BOEING 737 MAX 9"] },
  { code:"AR", name:"Aerolíneas Argentinas",       aircraft:["BOEING 737-800","AIRBUS A330-200"] },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function estimateDurationMins(from: string, to: string): number {
  const o = AIRPORTS[from]; const d = AIRPORTS[to];
  if (!o || !d) return 180;
  return Math.round((haversineKm(o[2], o[3], d[2], d[3]) / 850) * 60 + 45);
}

export function calcDurationFromTimes(depTime: string, arrTime: string, fromIata: string, toIata: string): string {
  const depOffset = (AIRPORTS[fromIata.toUpperCase()]?.[4] ?? 0) as number;
  const arrOffset = (AIRPORTS[toIata.toUpperCase()]?.[4] ?? 0) as number;
  const [dh, dm] = depTime.split(":").map(Number);
  const [ah, am] = arrTime.split(":").map(Number);
  const depUTC = dh * 60 + dm - depOffset * 60;
  let arrUTC = ah * 60 + am - arrOffset * 60;
  if (arrUTC <= depUTC) arrUTC += 24 * 60;
  const diff = arrUTC - depUTC;
  return `${Math.floor(diff/60)}hr(s) ${diff%60}min(s)`;
}

export function getAirportInfo(iata: string): { city: string; country: string } {
  const info = AIRPORTS[iata.toUpperCase()];
  return info ? { city: info[0], country: info[1] } : { city: iata, country: "" };
}

export function buildFlight(
  airline: typeof ALL_AIRLINES[0],
  fromIata: string, toIata: string,
  date: string, depTime: string, arrTime: string
): FlightResult {
  const rng = seededRng(`${airline.code}-${fromIata}-${toIata}-${date}`);
  const o = AIRPORTS[fromIata.toUpperCase()] ?? [fromIata,"",0,0,0];
  const d = AIRPORTS[toIata.toUpperCase()] ?? [toIata,"",0,0,0];
  const aircraft = airline.aircraft[Math.floor(rng() * airline.aircraft.length)];
  const T = ["1","2","3","A","B"];
  const flightNum = 100 + Math.floor(rng() * 900);
  const km = haversineKm(o[2] as number, o[3] as number, d[2] as number, d[3] as number);
  return {
    id: `${airline.code}${flightNum}-${date}`,
    airline: { code: airline.code, name: airline.name, flightNumber: `${airline.code} ${flightNum}` },
    origin:      { iata: fromIata.toUpperCase(), city: o[0], country: o[1], terminal: T[Math.floor(rng()*3)], at: `${date}T${depTime}:00` },
    destination: { iata: toIata.toUpperCase(),   city: d[0], country: d[1], terminal: T[Math.floor(rng()*3)], at: `${date}T${arrTime}:00` },
    duration: calcDurationFromTimes(depTime, arrTime, fromIata, toIata),
    durationRaw: "",
    aircraft,
    cabin: "Economy", meal: "Snack", status: "Confirmed",
    distance: km > 0 ? `${Math.round(km*0.621)} mi` : "Not Available",
    numberOfStops: 0,
  };
}

// kept for backwards compat
export function generateMockFlights(params: FlightSearchParams): FlightResult[] {
  const { from, to, date } = params;
  const rng = seededRng(`${from}-${to}-${date}`);
  const durationMins = estimateDurationMins(from.toUpperCase(), to.toUpperCase());
  const pool = [...ALL_AIRLINES].sort(() => rng()-0.5).slice(0,6);
  const depHours = [2,5,8,11,15,19].map(h => h+Math.floor(rng()*3));
  return pool.map((airline,i) => {
    const fNum = 100+Math.floor(rng()*900);
    const dh = depHours[i]%24, dm = Math.floor(rng()*4)*15;
    const dep = `${String(dh).padStart(2,"0")}:${String(dm).padStart(2,"0")}`;
    const arrMs = new Date(`${date}T${dep}:00`).getTime() + (durationMins+Math.floor(rng()*20)-10)*60000;
    const arrD = new Date(arrMs);
    const arr = `${String(arrD.getHours()).padStart(2,"0")}:${String(arrD.getMinutes()).padStart(2,"0")}`;
    const o = AIRPORTS[from.toUpperCase()]??[from,"",0,0,0];
    const d2 = AIRPORTS[to.toUpperCase()]??[to,"",0,0,0];
    const T = ["1","2","3","A","B"];
    const km = haversineKm(o[2] as number,o[3] as number,d2[2] as number,d2[3] as number);
    return {
      id:`${airline.code}${fNum}-${date}`,
      airline:{code:airline.code,name:airline.name,flightNumber:`${airline.code} ${fNum}`},
      origin:     {iata:from.toUpperCase(),city:o[0],country:o[1],terminal:T[Math.floor(rng()*3)],at:`${date}T${dep}:00`},
      destination:{iata:to.toUpperCase(), city:d2[0],country:d2[1],terminal:T[Math.floor(rng()*3)],at:`${date}T${arr}:00`},
      duration:`${Math.floor(durationMins/60)}hr(s) ${durationMins%60}min(s)`,
      durationRaw:"", aircraft:airline.aircraft[Math.floor(rng()*airline.aircraft.length)],
      cabin:"Economy",meal:"Snack",status:"Confirmed",
      distance:km>0?`${Math.round(km*0.621)} mi`:"Not Available",numberOfStops:0,
    };
  });
}
