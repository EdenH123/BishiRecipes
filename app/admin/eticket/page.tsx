'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ALL_AIRLINES, buildFlight, calcDurationFromTimes } from '@/lib/eticket/mock'
import { generateReservationCode, generateEticketReceipt } from '@/lib/eticket/formatters'
import { FlightResult } from '@/lib/eticket/types'
import TicketPreview from './TicketPreview'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

const TITLES = ['MR', 'MS', 'MRS', 'DR'] as const

type Step = 'form' | 'preview'

export default function EticketPage() {
  const router = useRouter()
  const ticketRef = useRef<HTMLDivElement>(null)

  // Form fields
  const [passengerName, setPassengerName] = useState('')
  const [passengerTitle, setPassengerTitle] = useState<string>('MR')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [airlineSearch, setAirlineSearch] = useState('')
  const [selectedAirlineCode, setSelectedAirlineCode] = useState<string>('')
  const [depTime, setDepTime] = useState('')
  const [arrTime, setArrTime] = useState('')
  const [airlineDropdownOpen, setAirlineDropdownOpen] = useState(false)

  const [step, setStep] = useState<Step>('form')
  const [flight, setFlight] = useState<FlightResult | null>(null)

  // Fine-tune
  const [reservationCode, setReservationCode] = useState('')
  const [airlineResCode, setAirlineResCode] = useState('')
  const [seat, setSeat] = useState('Check-In Required')
  const [eticketReceipt] = useState(() => generateEticketReceipt())
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null)

  const selectedAirline = ALL_AIRLINES.find(a => a.code === selectedAirlineCode) ?? null

  const filteredAirlines = useMemo(() => {
    const q = airlineSearch.toLowerCase()
    if (!q) return ALL_AIRLINES
    return ALL_AIRLINES.filter(a =>
      a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
    )
  }, [airlineSearch])

  const duration = useMemo(() => {
    if (!depTime || !arrTime || !from || !to) return null
    return calcDurationFromTimes(depTime, arrTime, from, to)
  }, [depTime, arrTime, from, to])

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAirline) return
    const f = buildFlight(selectedAirline, from, to, date, depTime, arrTime)
    const code = generateReservationCode()
    setFlight(f)
    setReservationCode(code)
    setAirlineResCode(selectedAirline.code + code.slice(0, 5))
    setStep('preview')
  }

  const ticketData = flight ? {
    passengerName: passengerName || 'PASSENGER/NAME',
    passengerTitle,
    reservationCode: reservationCode || 'XXXXXX',
    airlineResCode: airlineResCode || 'XXXXXX',
    seat,
    eticketReceipt,
    flight,
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
          <button onClick={() => router.push('/admin')} className="text-sm text-white/50 hover:text-white transition-colors">
            ← Back to Admin
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── Step 1: Form ── */}
        {step === 'form' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
            <h2 className="text-white font-bold text-xl mb-4">Create a ticket</h2>

            <form onSubmit={handleGenerate} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur">

              {/* Passenger */}
              <div>
                <label className="block text-xs text-white/60 mb-1">Passenger name</label>
                <div className="flex gap-2">
                  <select
                    value={passengerTitle}
                    onChange={(e) => setPassengerTitle(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
                  >
                    {TITLES.map((t) => <option key={t} className="text-black">{t}</option>)}
                  </select>
                  <input
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value.toUpperCase())}
                    placeholder="LASTNAME/FIRSTNAME"
                    required
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white uppercase placeholder:text-white/30 focus:outline-none focus:border-white/50"
                  />
                </div>
              </div>

              {/* Route */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Departure (IATA)</label>
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
                  <label className="block text-xs text-white/60 mb-1">Arrival (IATA)</label>
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

              {/* Date */}
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

              {/* Airline picker */}
              <div className="relative">
                <label className="block text-xs text-white/60 mb-1">Airline</label>
                <div
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white cursor-pointer flex items-center justify-between"
                  onClick={() => setAirlineDropdownOpen(o => !o)}
                >
                  <span className={selectedAirline ? 'text-white' : 'text-white/30'}>
                    {selectedAirline ? `${selectedAirline.code} — ${selectedAirline.name}` : 'Select airline…'}
                  </span>
                  <span className="text-white/40 text-xs">{airlineDropdownOpen ? '▲' : '▼'}</span>
                </div>
                {airlineDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1033] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-white/10">
                      <input
                        autoFocus
                        value={airlineSearch}
                        onChange={(e) => setAirlineSearch(e.target.value)}
                        placeholder="Search airline…"
                        className="w-full bg-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredAirlines.map(a => (
                        <button
                          key={a.code}
                          type="button"
                          onClick={() => {
                            setSelectedAirlineCode(a.code)
                            setAirlineSearch('')
                            setAirlineDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2 ${selectedAirlineCode === a.code ? 'bg-white/10 text-white' : 'text-white/70'}`}
                        >
                          <span className="font-mono text-white/40 w-7 shrink-0">{a.code}</span>
                          <span>{a.name}</span>
                        </button>
                      ))}
                      {filteredAirlines.length === 0 && (
                        <p className="text-center text-white/30 text-xs py-4">No airlines found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Departure time</label>
                  <input
                    type="time"
                    value={depTime}
                    onChange={(e) => setDepTime(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Arrival time</label>
                  <input
                    type="time"
                    value={arrTime}
                    onChange={(e) => setArrTime(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
                  />
                </div>
              </div>

              {/* Duration preview */}
              {duration && (
                <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">Flight duration</span>
                  <span className="text-sm font-mono text-white">{duration}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedAirline}
                className="w-full bg-white text-black rounded-lg py-2 text-sm font-semibold hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Generate ticket
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Step 2: Preview + fine-tune ── */}
        {step === 'preview' && flight && ticketData && (
          <div className="flex gap-6 items-start">
            {/* Side controls */}
            <div className="w-72 shrink-0">
              <button
                onClick={() => { setStep('form'); setFlight(null) }}
                className="text-white/40 hover:text-white text-xs mb-3 transition-colors"
              >
                ← Back to form
              </button>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur">
                <h2 className="text-white font-semibold">Fine-tune</h2>

                <div>
                  <label className="block text-xs text-white/60 mb-1">Passenger name</label>
                  <div className="flex gap-2">
                    <select
                      value={passengerTitle}
                      onChange={(e) => setPassengerTitle(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
                    >
                      {TITLES.map((t) => <option key={t} className="text-black">{t}</option>)}
                    </select>
                    <input
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value.toUpperCase())}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white uppercase focus:outline-none focus:border-white/50"
                    />
                  </div>
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
