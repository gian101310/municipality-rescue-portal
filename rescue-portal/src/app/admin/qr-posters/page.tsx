'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { QrCode, Download, Printer, MapPin, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettings } from '@/lib/settings-context'
import { toast } from 'sonner'
import QRCode from 'qrcode'

function generateQRMatrix(data: string): boolean[][] {
  // This is a simplified visual representation — in production use a real QR lib
  const size = 25
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // Generate deterministic pattern from data
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0
  }

  // Finder patterns (3 corners)
  const addFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isBorder = y === 0 || y === 6 || x === 0 || x === 6
        const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4
        matrix[oy + y][ox + x] = isBorder || isInner
      }
    }
  }
  addFinder(0, 0)
  addFinder(size - 7, 0)
  addFinder(0, size - 7)

  // Timing patterns
  for (let i = 7; i < size - 7; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }

  // Data modules — seeded from hash
  let seed = Math.abs(hash)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) continue
      if ((x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8)) continue
      if (x === 6 || y === 6) continue
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      matrix[y][x] = seed % 3 !== 0
    }
  }

  return matrix
}

function QRCodeSVG({ data, size = 200 }: { data: string; size?: number }) {
  const matrix = generateQRMatrix(data)
  const cellSize = size / matrix.length

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white" />
      {matrix.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize + 0.5}
              height={cellSize + 0.5}
              fill="black"
            />
          ) : null
        )
      )}
    </svg>
  )
}

export default function QRPostersPage() {
  const { settings } = useSettings()
  const [barangayList, setBarangayList] = useState<string[]>([])
  const [selectedBarangay, setSelectedBarangay] = useState('')
  const [posterTitle, setPosterTitle] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [posterStyle, setPosterStyle] = useState<'standard' | 'emergency'>('standard')
  const [qrImage, setQrImage] = useState('')
  const [municipalityName, setMunicipalityName] = useState(settings.municipalityName)
  const posterRef = useRef<HTMLDivElement>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.rescue-portal.ph'
  const emergencyUrl = `${baseUrl}/scan`

  useEffect(() => { void (async () => {
    const response = await fetch('/api/admin/qr-context')
    const payload = await response.json().catch(() => ({}))
    if (response.ok) {
      setMunicipalityName(payload.organization?.name ?? municipalityName)
      const url = `${baseUrl}/scan?municipality=${encodeURIComponent(payload.organizationId)}`
      setQrImage(await QRCode.toDataURL(url, { width: 600, margin: 2 }))
      const names = (payload.barangays ?? []).map((b: { name: string }) => b.name)
      setBarangayList(names)
      if (names.length > 0) setSelectedBarangay(names[0])
    }
  })() }, [])

  const title = posterTitle || `${settings.municipalityName} Emergency Rescue`

  function handlePrint() {
    window.print()
    toast.success('Print dialog opened')
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">QR Code Posters</h1>
          <p className="text-slate-400 text-sm">Generate printable QR posters for barangay halls and public spaces</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Poster Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Barangay</Label>
              <Select value={selectedBarangay} onValueChange={(v) => setSelectedBarangay(v ?? selectedBarangay)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {barangayList.length > 0 ? barangayList.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  )) : (
                    <SelectItem value="none" disabled>No barangays found — add them in Settings</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Poster Title (optional)</Label>
              <Input
                value={posterTitle}
                onChange={(e) => setPosterTitle(e.target.value)}
                placeholder={`${settings.municipalityName} Emergency Rescue`}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Custom Message (optional)</Label>
              <Input
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Scan to report emergencies"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Style</Label>
              <Select value={posterStyle} onValueChange={(v) => setPosterStyle((v as 'standard' | 'emergency') ?? 'standard')}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (Blue)</SelectItem>
                  <SelectItem value="emergency">Emergency (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-1">QR Link Preview:</p>
              <p className="text-xs text-blue-400 break-all font-mono">{emergencyUrl}</p>
            </div>
          </CardContent>
        </Card>

        {/* Poster Preview */}
        <div className="lg:col-span-2">
          <div
            ref={posterRef}
            className="bg-white rounded-xl shadow-2xl overflow-hidden print:shadow-none"
            id="poster-printable"
          >
            {/* Header */}
            <div className={`${posterStyle === 'emergency' ? 'bg-red-600' : 'bg-blue-700'} px-8 py-6 text-center`}>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-white" />
                <span className="text-white font-black text-2xl tracking-tight">Emergency Rescue Portal</span>
              </div>
              <p className="text-white/90 text-sm font-medium">{municipalityName}</p>
            </div>

            {/* Body */}
            <div className="px-8 py-8 text-center">
              <h2 className="text-2xl font-black text-slate-900 mb-1">{title}</h2>
              <div className="flex items-center justify-center gap-1.5 text-slate-600 mb-6">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{municipalityName}</span>
              </div>

              {/* QR Code */}
              <div className="inline-block p-4 bg-white border-4 border-slate-900 rounded-xl mb-4">
                {qrImage ? <img src={qrImage} alt={`QR code for ${municipalityName}`} width={200} height={200} /> : <QRCodeSVG data={emergencyUrl} size={200} />}
              </div>

              <p className="text-lg font-bold text-slate-800 mb-1">
                {customMessage || 'Scan to Report an Emergency'}
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Point your phone camera at the QR code to open the emergency reporting form
              </p>

              {/* Hotline */}
              <div className={`${posterStyle === 'emergency' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} rounded-lg p-4 border`}>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Emergency Hotline</p>
                <p className={`text-3xl font-black ${posterStyle === 'emergency' ? 'text-red-600' : 'text-blue-700'}`}>
                  {settings.hotline}
                </p>
                {settings.secondaryHotline && (
                  <p className="text-sm text-slate-600 mt-1">Secondary: {settings.secondaryHotline}</p>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-6">
                For life-threatening emergencies, call 911 (National Emergency Hotline)
              </p>
            </div>

            {/* Footer */}
            <div className="bg-slate-100 px-8 py-3 text-center">
              <p className="text-xs text-slate-500">
                Powered by Emergency Rescue Portal — Municipal Emergency Response System
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body > *:not(#poster-printable) { display: none !important; }
          #poster-printable {
            position: fixed;
            top: 0; left: 0;
            width: 100vw;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
