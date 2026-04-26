export interface FlightSearchParams {
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
}

export interface FlightEndpoint {
  iata: string;
  city: string;
  country: string;
  terminal: string;
  at: string; // ISO datetime local
}

export interface FlightResult {
  id: string;
  airline: {
    code: string;
    name: string;
    flightNumber: string;
  };
  origin: FlightEndpoint;
  destination: FlightEndpoint;
  duration: string;       // formatted: "4hr(s) 45min(s)"
  durationRaw: string;    // ISO 8601 PT4H45M
  aircraft: string;
  cabin: string;
  meal: string;
  status: string;
  distance: string;
  numberOfStops: number;
}

export interface TicketData {
  passengerName: string;    // "HEISER/EDEN"
  passengerTitle: string;   // "MR"
  reservationCode: string;
  airlineResCode: string;
  seat: string;
  eticketReceipt: string;
  flight: FlightResult;
  createdAt: string;        // ISO datetime
}
