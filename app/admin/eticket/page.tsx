'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { generateMockFlights } from '@/lib/eticket/mock'
import { generateReservationCode, generateEticketReceipt } from '@/lib/eticket/formatters'
import { FlightResult } from '@/lib/eticket/types'
import TicketPreview from './TicketPreview'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

const TITLES = ['MR', 'MS', 'MRS', 'DR'] as const

type Step = 'search' | 'form'

export default function EticketPage() {
  const router = useRouter()
  const ticketRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<Step>('search')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [results, setResults] = useState<FlightResult[]>([])
  const [selected, setSelected] = useState<FlightResult | null>(null)

  const [passengerName, setPassengerName] = useState('')
  const [passengerTitle, setPassengerTitle] = useState<string>('MR')
  const [reservationCode, setReservationCode] = useState('')
  const [airlineResCode, setAirlineResCode] = useState('')
  const [seat, setSeat] = useState('Check-In Required')
  const [eticketReceipt] = useState(() => generateEticketReceipt())
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null)

  useEffect(() => {
    if (selected) {
      const code = generateReservationCode()
      setReservationCode(code)
      setAirlineResCode(selected.airline.code + code.slice(0, 5))
    }
  }, [selected])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const flights = generateMockFlights({ from: from.toUpperCase(), to: to.toUpperCase(), date })
    setResults(flights)
  }

  function handleSelect(flight: FlightResult) {
    setSelected(flight)
    setStep('form')
  }

  const ticketData = selected ? {
    passengerName: passengerName || 'PASSENGER/NAME',
    passengerTitle,
    reservationCode: reservationCode || 'XXXXXX',
    airlineResCode: airlineResCode || 'XXXXXX',
    seat,
    eticketReceipt,
    flight: selected,
    createdAt: new Date().toISOString(),
  } : null

  async function handleDownloadPNG() {
    const el = document.getElementById('ticket-root')
    if (!el) return
    setExporting('png')
    try {
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `eticket-${passengerName || 'ticket'}.png`
      a.click()
    } finally {
      setExporting(null)
    }
  }

  async function handleDownloadPDF() {
    const el = document.getElementById('ticket-root')
    if (!el) return
    setExporting('pdf')
    try {
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 })
      const img = new Image()
      img.src = dataUrl
      await new Promise((res) => { img.onload = res })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const ratio = img.height / img.width
      pdf.addImage(dataUrl, 'PNG', 0, 20, pageW, pageW * ratio)
      pdf.setFontSize(7)
      pdf.setTextColor(180, 180, 180)
      pdf.text('Generated for entertainment purposes only — not a valid travel document', pageW / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' })
      pdf.save(`eticket-${passengerName || 'ticket'}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="min-h-screen font-rubik" dir="ltr" style={{
      background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1033 40%, #0f172a 100%)',
    }}>
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎫</span>
            <div>
              <h1 className="text-lg font-bold text-white">eTicket Generator</h1>
              <p className="text-[11px] text-white/40">For entertainment only</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            ← Back to Admin
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {step === 'search' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg"
          >
            <h2 className="text-white font-bold text-xl mb-4">Find a flight</h2>
            <form onSubmit={handleSearch} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">From (IATA)</label>
                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value.toUpperCase())}
                    placeholder="BKK"
                    maxLength={3}
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white uppercase placeholder:text-white/30 focus:outline-none focus:border-white/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">To (IATA)</label>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value.toUpperCase())}
                    placeholder="DEL"
                    maxLength={3}
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white uppercase placeholder:text-white/30 focus:outline-none focus:border-white/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-black rounded-lg py-2 text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Search flights
              </button>
            </form>

            {results.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-white/40 text-xs mb-2">{results.length} flights found — select one</p>
                {results.map((f) => (
                  <motion.button
                    key={f.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleSelect(f)}
                    className="w-full text-left bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-semibold">{f.airline.name} <span className="text-white/40 font-normal">{f.airline.flightNumber}</span></p>
                        <p className="text-white/60 text-xs mt-0.5">
                          {f.origin.iata} → {f.destination.iata} · {f.duration} · {f.aircraft}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {new Date(f.origin.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          {' → '}
                          {new Date(f.destination.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                      </div>
                      <span className="text-white/40 text-xs">Select →</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {step === 'form' && selected && ticketData && (
          <div className="flex gap-6 items-start">
            {/* Form */}
            <div className="w-72 shrink-0">
              <button
                onClick={() => { setStep('search'); setSelected(null) }}
                className="text-white/40 hover:text-white text-xs mb-3 transition-colors"
              >
                ← Back to results
              </button>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur">
                <h2 className="text-white font-semibold">Passenger details</h2>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Title</label>
                  <select
                    value={passengerTitle}
                    onChange={(e) => setPassengerTitle(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
                  >
                    {TITLES.map((t) => <option key={t} className="text-black">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Passenger name</label>
                  <input
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value.toUpperCase())}
                    placeholder="LASTNAME/FIRSTNAME"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white uppercase placeholder:text-white/30 focus:outline-none focus:border-white/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Reservation code</label>
                  <input
                    value={reservationCode}
                    onChange={(e) => setReservationCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white uppercase focus:outline-none focus:border-white/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Airline reservation code</label>
                  <input
                    value={airlineResCode}
                    onChange={(e) => setAirlineResCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white uppercase focus:outline-none focus:border-white/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Seat</label>
                  <input
                    value={seat}
                    onChange={(e) => setSeat(e.target.value)}
                    placeholder="Check-In Required"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
                  />
                </div>

                {/* Export buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleDownloadPNG}
                    disabled={exporting !== null}
                    className="w-full border border-white/20 text-white rounded-lg py-2 text-sm hover:border-white/50 disabled:opacity-50 transition-colors"
                  >
                    {exporting === 'png' ? 'Generating…' : 'Download PNG'}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={exporting !== null}
                    className="w-full bg-white text-black rounded-lg py-2 text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
                  >
                    {exporting === 'pdf' ? 'Generating…' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="flex-1 overflow-x-auto">
              <p className="text-white/40 text-xs mb-2">Live preview</p>
              <div ref={ticketRef} className="shadow-2xl inline-block">
                <TicketPreview ticket={ticketData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
