import { TicketData } from "@/lib/eticket/types";
import { formatDate, formatDayOfWeek, formatTime } from "@/lib/eticket/formatters";

interface Props {
  ticket: TicketData;
}

export default function TicketPreview({ ticket }: Props) {
  const { flight } = ticket;
  const depDate = formatDate(flight.origin.at);
  const depDay = formatDayOfWeek(flight.origin.at);
  const depTime = formatTime(flight.origin.at);
  const arrTime = formatTime(flight.destination.at);
  const passengerFull = `${ticket.passengerName} ${ticket.passengerTitle}.`;
  const paymentDate = formatDate(ticket.createdAt);

  return (
    <div
      id="ticket-root"
      style={{ fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif" }}
      className="bg-white text-black w-[794px] text-[13px] leading-snug"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center gap-2 px-6 py-3 border-b-2 border-black">
        <span className="font-bold text-[13px]">{depDate}</span>
        <span className="text-[10px]">&#9658;</span>
        <span className="font-bold text-[13px]">
          {depDate} TRIP TO {flight.destination.city.toUpperCase()}
        </span>
      </div>

      {/* ── Prepared for ── */}
      <div className="px-6 py-4 border-b border-[#e5e5e5]">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Prepared For</p>
        <p className="font-bold text-[18px] mt-0.5">{passengerFull.toUpperCase()}</p>
      </div>

      {/* ── Reservation codes ── */}
      <div className="px-6 py-3 border-b border-[#e5e5e5] space-y-0.5">
        <p className="text-[11px] uppercase tracking-wide">
          Reservation Code: <span className="font-semibold">{ticket.reservationCode}</span>
        </p>
        <p className="text-[11px] uppercase tracking-wide">
          Airline Reservation Code: <span className="font-semibold">{ticket.airlineResCode}</span>
        </p>
      </div>

      {/* ── Departure header ── */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-[#e5e5e5] bg-white">
        <PlaneIcon />
        <div>
          <span className="font-bold text-[13px]">DEPARTURE: {depDay}</span>
          <span className="text-[10px] text-gray-400 ml-3">Please verify flight prior to departure</span>
        </div>
      </div>

      {/* ── Flight row ── */}
      <div className="border-b border-[#e5e5e5]">
        <div className="grid grid-cols-[180px_1fr_140px_160px] divide-x divide-[#e5e5e5]">
          {/* Col 1: Airline info */}
          <div className="px-4 py-4 space-y-1">
            <p className="font-bold text-[15px]">{flight.airline.name.toUpperCase()}</p>
            <p className="font-semibold text-[13px]">{flight.airline.flightNumber.replace(" ", " ")}</p>
            <p className="text-[11px] text-gray-500">Duration:</p>
            <p className="text-[11px]">{flight.duration}</p>
            <p className="text-[11px] text-gray-500 mt-1">Cabin:</p>
            <p className="text-[11px]">{flight.cabin}</p>
            <p className="text-[11px] text-gray-500 mt-1">Status:</p>
            <p className="text-[11px]">{flight.status}</p>
          </div>

          {/* Col 2: Route */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div>
                <p className="font-bold text-[20px] leading-none">{flight.origin.iata}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {flight.origin.city.toUpperCase()}, {flight.origin.country}
                </p>
              </div>
              <span className="text-gray-400 text-[14px] mx-2">&#9658;</span>
              <div>
                <p className="font-bold text-[20px] leading-none">{flight.destination.iata}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {flight.destination.city.toUpperCase()}, {flight.destination.country}
                </p>
              </div>
            </div>

            {/* Times + terminals */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-[10px] text-gray-500">Departing At:</p>
                <p className="font-bold text-[22px] leading-none">{depTime}</p>
                <p className="text-[10px] text-gray-500 mt-1">Terminal:</p>
                <p className="text-[11px]">{flight.origin.terminal}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Arriving At:</p>
                <p className="font-bold text-[22px] leading-none">{arrTime}</p>
                <p className="text-[10px] text-gray-500 mt-1">Terminal:</p>
                <p className="text-[11px]">{flight.destination.terminal}</p>
              </div>
            </div>
          </div>

          {/* Col 3: empty spacer matching reference */}
          <div className="px-4 py-4" />

          {/* Col 4: Aircraft + meals */}
          <div className="px-4 py-4 space-y-1">
            <p className="text-[10px] text-gray-500">Aircraft:</p>
            <p className="text-[11px]">{flight.aircraft}</p>
            <p className="text-[10px] text-gray-500 mt-2">Distance (in miles):</p>
            <p className="text-[11px]">{flight.distance}</p>
            <p className="text-[10px] text-gray-500 mt-2">Meals:</p>
            <p className="text-[11px]">{flight.meal}</p>
          </div>
        </div>
      </div>

      {/* ── Passenger / seats / eTicket receipt row ── */}
      <div className="grid grid-cols-3 divide-x divide-[#e5e5e5] border-b border-[#e5e5e5]">
        <div className="px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Passenger Name:</p>
          <p className="text-[12px] mt-0.5">&#187; {passengerFull.toUpperCase()}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Seats:</p>
          <p className="text-[12px] mt-0.5">{ticket.seat}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">eTicket Receipt(s):</p>
          <p className="text-[12px] mt-0.5">{ticket.eticketReceipt}</p>
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="px-6 py-4 border-b-2 border-black">
        <p className="font-bold text-[12px] mb-2">NOTES</p>
        <div className="text-[11px] space-y-1 uppercase">
          <p>PLEASE KEEP THIS E-TICKET AND OTHER TRAVEL DOCUMENTS</p>
          <p>PLEASE VERIFY THE TRAVEL DETAILS ABOVE BEFORE DEPARTURE</p>
          <p>*YOUR PASSPORT MUST BE VALID AT LEAST 6 MONTHS BEFORE DEPARTURE</p>
          <p>VISA AND/OR VACCINATION MAY BE REQUIRED</p>
          <p>ASSISTANCE AFTER OFFICE HOURS CALL +97239723333</p>
          <br />
          <p>PAYMENT STATUS {paymentDate}: PAID</p>
          <br />
          <p className="font-semibold">HAVE A NICE TRIP</p>
        </div>
      </div>

      {/* ── Entertainment disclaimer ── */}
      <div className="px-6 py-2 text-center">
        <p className="text-[9px] text-gray-300 uppercase tracking-widest">
          Generated for entertainment purposes only — not a valid travel document
        </p>
      </div>
    </div>
  );
}

function PlaneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2C4.3 5.1 3.8 5.3 3.5 5.7l-.5.5c-.4.4-.3 1 .1 1.3L8 10l-4 4H2l-1 1 3 1 1 3 1-1v-2l4-4 3.2 4.8c.4.5 1 .6 1.4.1l.5-.5c.4-.3.6-.8.5-1.3z" />
    </svg>
  );
}
