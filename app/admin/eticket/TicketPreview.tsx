import { TicketData } from "@/lib/eticket/types";
import { formatDate, formatDayOfWeek, formatTime, generateBarcodeBars } from "@/lib/eticket/formatters";
import { getAirlineColor } from "@/lib/eticket/airlines";

interface Props {
  ticket: TicketData;
}

function Barcode({ seed }: { seed: string }) {
  const bars = generateBarcodeBars(seed)
  return (
    <svg width="200" height="40" viewBox="0 0 200 40" className="block">
      {bars.map((w, i) => {
        const x = bars.slice(0, i).reduce((a, b) => a + b + 1, 2)
        return <rect key={i} x={x} y={2} width={w} height={36} fill="#000" />
      })}
    </svg>
  )
}

function PlaneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2C4.3 5.1 3.8 5.3 3.5 5.7l-.5.5c-.4.4-.3 1 .1 1.3L8 10l-4 4H2l-1 1 3 1 1 3 1-1v-2l4-4 3.2 4.8c.4.5 1 .6 1.4.1l.5-.5c.4-.3.6-.8.5-1.3z" />
    </svg>
  )
}

export default function TicketPreview({ ticket }: Props) {
  if (ticket.template === 'boarding-pass') return <BoardingPass ticket={ticket} />
  if (ticket.template === 'modern') return <ModernTicket ticket={ticket} />
  return <ClassicTicket ticket={ticket} />
}

// ══════════════════════════════════════
// Classic Template (original, enhanced)
// ══════════════════════════════════════
function ClassicTicket({ ticket }: Props) {
  const { flight } = ticket
  const colors = getAirlineColor(flight.airline.code)
  const depDate = formatDate(flight.origin.at)
  const depDay = formatDayOfWeek(flight.origin.at)
  const depTime = formatTime(flight.origin.at)
  const arrTime = formatTime(flight.destination.at)
  const passengerFull = `${ticket.passengerName} ${ticket.passengerTitle}.`
  const paymentDate = formatDate(ticket.createdAt)

  return (
    <div id="ticket-root" style={{ fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif" }} className="bg-white text-black w-[794px] text-[13px] leading-snug">
      {/* Airline-colored header */}
      <div className="flex items-center gap-2 px-6 py-3 border-b-2 border-black" style={{ background: colors.bg, color: colors.text }}>
        <span className="font-bold text-[15px]">{flight.airline.name.toUpperCase()}</span>
        <span className="opacity-60 text-[10px]">|</span>
        <span className="font-bold text-[13px]">{depDate} TRIP TO {flight.destination.city.toUpperCase()}</span>
      </div>

      <div className="px-6 py-4 border-b border-[#e5e5e5]">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Prepared For</p>
        <p className="font-bold text-[18px] mt-0.5">{passengerFull.toUpperCase()}</p>
      </div>

      <div className="px-6 py-3 border-b border-[#e5e5e5] space-y-0.5">
        <p className="text-[11px] uppercase tracking-wide">Reservation Code: <span className="font-semibold">{ticket.reservationCode}</span></p>
        <p className="text-[11px] uppercase tracking-wide">Airline Reservation Code: <span className="font-semibold">{ticket.airlineResCode}</span></p>
      </div>

      <div className="px-6 py-3 flex items-center gap-3 border-b border-[#e5e5e5]">
        <PlaneIcon />
        <div>
          <span className="font-bold text-[13px]">DEPARTURE: {depDay}</span>
          <span className="text-[10px] text-gray-400 ml-3">Please verify flight prior to departure</span>
        </div>
      </div>

      <div className="border-b border-[#e5e5e5]">
        <div className="grid grid-cols-[180px_1fr_140px_160px] divide-x divide-[#e5e5e5]">
          <div className="px-4 py-4 space-y-1">
            <p className="font-bold text-[15px]">{flight.airline.name.toUpperCase()}</p>
            <p className="font-semibold text-[13px]">{flight.airline.flightNumber}</p>
            <p className="text-[11px] text-gray-500">Duration:</p>
            <p className="text-[11px]">{flight.duration}</p>
            <p className="text-[11px] text-gray-500 mt-1">Cabin:</p>
            <p className="text-[11px]">{flight.cabin}</p>
            <p className="text-[11px] text-gray-500 mt-1">Status:</p>
            <p className="text-[11px]">{flight.status}</p>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div>
                <p className="font-bold text-[20px] leading-none">{flight.origin.iata}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{flight.origin.city.toUpperCase()}, {flight.origin.country}</p>
              </div>
              <span className="text-gray-400 text-[14px] mx-2">&#9658;</span>
              <div>
                <p className="font-bold text-[20px] leading-none">{flight.destination.iata}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{flight.destination.city.toUpperCase()}, {flight.destination.country}</p>
              </div>
            </div>
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
          <div className="px-4 py-4" />
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

      {/* Barcode */}
      <div className="px-6 py-3 border-b border-[#e5e5e5] flex items-center justify-between">
        <Barcode seed={ticket.eticketReceipt} />
        <p className="text-[9px] text-gray-400 font-mono">{ticket.eticketReceipt}</p>
      </div>

      <div className="px-6 py-4 border-b-2 border-black">
        <p className="font-bold text-[12px] mb-2">NOTES</p>
        <div className="text-[11px] space-y-1 uppercase">
          <p>PLEASE KEEP THIS E-TICKET AND OTHER TRAVEL DOCUMENTS</p>
          <p>PLEASE VERIFY THE TRAVEL DETAILS ABOVE BEFORE DEPARTURE</p>
          {ticket.passportNumber && <p>PASSPORT NO: {ticket.passportNumber}</p>}
          <p>*YOUR PASSPORT MUST BE VALID AT LEAST 6 MONTHS BEFORE DEPARTURE</p>
          <p>VISA AND/OR VACCINATION MAY BE REQUIRED</p>
          <br />
          <p>PAYMENT STATUS {paymentDate}: PAID</p>
          <br />
          <p className="font-semibold">HAVE A NICE TRIP</p>
        </div>
      </div>

      <div className="px-6 py-2 text-center">
        <p className="text-[9px] text-gray-300 uppercase tracking-widest">Generated for entertainment purposes only — not a valid travel document</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// Modern Template
// ══════════════════════════════════════
function ModernTicket({ ticket }: Props) {
  const { flight } = ticket
  const colors = getAirlineColor(flight.airline.code)
  const depDate = formatDate(flight.origin.at)
  const depTime = formatTime(flight.origin.at)
  const arrTime = formatTime(flight.destination.at)

  return (
    <div id="ticket-root" style={{ fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif" }} className="bg-white text-black w-[794px]">
      {/* Header with airline color */}
      <div className="px-8 py-6 rounded-t-xl" style={{ background: colors.bg, color: colors.text }}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[22px] font-bold">{flight.airline.name}</p>
            <p className="text-[13px] opacity-70 mt-1">{flight.airline.flightNumber} · {depDate}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] opacity-60">Booking Reference</p>
            <p className="text-[20px] font-mono font-bold tracking-wider">{ticket.reservationCode}</p>
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
        <div className="text-center">
          <p className="text-[32px] font-bold leading-none">{flight.origin.iata}</p>
          <p className="text-[11px] text-gray-500 mt-1">{flight.origin.city}</p>
          <p className="text-[20px] font-bold mt-2">{depTime}</p>
          <p className="text-[10px] text-gray-400">Terminal {flight.origin.terminal}</p>
        </div>
        <div className="flex-1 flex flex-col items-center px-6">
          <p className="text-[10px] text-gray-400 mb-1">{flight.duration}</p>
          <div className="w-full h-[1px] bg-gray-200 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-2">✈️</div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{flight.distance}</p>
        </div>
        <div className="text-center">
          <p className="text-[32px] font-bold leading-none">{flight.destination.iata}</p>
          <p className="text-[11px] text-gray-500 mt-1">{flight.destination.city}</p>
          <p className="text-[20px] font-bold mt-2">{arrTime}</p>
          <p className="text-[10px] text-gray-400">Terminal {flight.destination.terminal}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="px-8 py-4 grid grid-cols-4 gap-4 border-b border-gray-100">
        <div><p className="text-[9px] text-gray-400 uppercase">Passenger</p><p className="text-[13px] font-semibold mt-0.5">{ticket.passengerName} {ticket.passengerTitle}.</p></div>
        <div><p className="text-[9px] text-gray-400 uppercase">Seat</p><p className="text-[13px] font-semibold mt-0.5">{ticket.seat}</p></div>
        <div><p className="text-[9px] text-gray-400 uppercase">Gate</p><p className="text-[13px] font-semibold mt-0.5">{ticket.gate || '—'}</p></div>
        <div><p className="text-[9px] text-gray-400 uppercase">Aircraft</p><p className="text-[13px] font-semibold mt-0.5">{flight.aircraft}</p></div>
      </div>

      {/* Barcode + receipt */}
      <div className="px-8 py-4 flex items-center justify-between">
        <Barcode seed={ticket.eticketReceipt} />
        <div className="text-right">
          <p className="text-[9px] text-gray-400">eTicket</p>
          <p className="text-[11px] font-mono">{ticket.eticketReceipt}</p>
        </div>
      </div>

      <div className="px-8 py-2 text-center border-t border-gray-100">
        <p className="text-[8px] text-gray-300 uppercase tracking-widest">Generated for entertainment purposes only</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// Boarding Pass Template
// ══════════════════════════════════════
function BoardingPass({ ticket }: Props) {
  const { flight } = ticket
  const colors = getAirlineColor(flight.airline.code)
  const depTime = formatTime(flight.origin.at)
  const arrTime = formatTime(flight.destination.at)
  const depDate = formatDate(flight.origin.at)

  return (
    <div id="ticket-root" style={{ fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif" }} className="bg-white text-black w-[794px]">
      <div className="flex">
        {/* Main section */}
        <div className="flex-1 border-r-2 border-dashed border-gray-300">
          <div className="px-6 py-3" style={{ background: colors.bg, color: colors.text }}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-[16px]">{flight.airline.name.toUpperCase()}</p>
              <p className="text-[12px] opacity-80">BOARDING PASS</p>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] text-gray-400">PASSENGER NAME</p>
                <p className="text-[16px] font-bold">{ticket.passengerName} {ticket.passengerTitle}.</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-400">DATE</p>
                <p className="text-[13px] font-semibold">{depDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-[28px] font-bold leading-none">{flight.origin.iata}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{flight.origin.city}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[20px]">✈</p>
                <p className="text-[9px] text-gray-400">{flight.airline.flightNumber}</p>
              </div>
              <div className="text-center">
                <p className="text-[28px] font-bold leading-none">{flight.destination.iata}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{flight.destination.city}</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div><p className="text-[8px] text-gray-400">DEPARTS</p><p className="text-[15px] font-bold">{depTime}</p></div>
              <div><p className="text-[8px] text-gray-400">ARRIVES</p><p className="text-[15px] font-bold">{arrTime}</p></div>
              <div><p className="text-[8px] text-gray-400">TERMINAL</p><p className="text-[15px] font-bold">{flight.origin.terminal}</p></div>
              <div><p className="text-[8px] text-gray-400">GATE</p><p className="text-[15px] font-bold">{ticket.gate || '—'}</p></div>
              <div><p className="text-[8px] text-gray-400">SEAT</p><p className="text-[15px] font-bold">{ticket.seat}</p></div>
            </div>
          </div>

          <div className="px-6 pb-3">
            <Barcode seed={ticket.eticketReceipt} />
          </div>
        </div>

        {/* Stub (right side) */}
        <div className="w-[200px]">
          <div className="px-4 py-3" style={{ background: colors.bg, color: colors.text }}>
            <p className="font-bold text-[11px]">{flight.airline.name.toUpperCase()}</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div><p className="text-[8px] text-gray-400">NAME</p><p className="text-[10px] font-bold">{ticket.passengerName}</p></div>
            <div className="flex gap-3">
              <div><p className="text-[8px] text-gray-400">FROM</p><p className="text-[14px] font-bold">{flight.origin.iata}</p></div>
              <div><p className="text-[8px] text-gray-400">TO</p><p className="text-[14px] font-bold">{flight.destination.iata}</p></div>
            </div>
            <div className="flex gap-3">
              <div><p className="text-[8px] text-gray-400">FLIGHT</p><p className="text-[10px] font-bold">{flight.airline.flightNumber}</p></div>
              <div><p className="text-[8px] text-gray-400">SEAT</p><p className="text-[10px] font-bold">{ticket.seat}</p></div>
            </div>
            <div><p className="text-[8px] text-gray-400">DATE</p><p className="text-[10px] font-bold">{depDate}</p></div>
            <div><p className="text-[8px] text-gray-400">GATE</p><p className="text-[10px] font-bold">{ticket.gate || '—'}</p></div>
            <div><p className="text-[8px] text-gray-400">BOARDING</p><p className="text-[10px] font-bold">{depTime}</p></div>
          </div>
        </div>
      </div>
      <div className="text-center py-1 border-t border-gray-100">
        <p className="text-[7px] text-gray-300 uppercase tracking-widest">Entertainment only — not a valid document</p>
      </div>
    </div>
  )
}
