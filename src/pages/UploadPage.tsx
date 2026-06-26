import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { parsePayoutReport } from '../lib/parseReport'
import { useRestaurantStore } from '../hooks/useRestaurantStore'

type UploadStatus = 'idle' | 'parsing' | 'success' | 'error'

interface UploadResult {
  fileName: string
  status: UploadStatus
  message: string
  cyclesFound?: number
  warnings?: string[]
  detectedColumns?: string[]
  meta?: {
    res_name?: string
    res_id?: string
    period?: string
    total_orders?: number
    delivered_orders?: number
  }
}

export default function UploadPage() {
  const { selectedRestaurant, appendPayoutCycles } = useRestaurantStore()
  const restaurant = selectedRestaurant
  const [dragging, setDragging] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])
  const [uploadType, setUploadType] = useState<'payout' | 'ads' | 'business'>('payout')
  const fileRef = useRef<HTMLInputElement>(null)

  if (!restaurant) return null

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const result: UploadResult = {
        fileName: file.name,
        status: 'parsing',
        message: 'Parsing file...',
      }
      setResults(prev => [...prev, result])

      try {
        if (uploadType === 'payout') {
          const parsed = await parsePayoutReport(file, restaurant.id, restaurant.monthly_ad_budget)
          if (parsed.cycles.length > 0) await appendPayoutCycles(restaurant.id, parsed.cycles)
          const periodNote = parsed.meta?.period ? ` · ${parsed.meta.period}` : ''
          const ordersNote = parsed.meta?.total_orders ? ` (${parsed.meta.delivered_orders}/${parsed.meta.total_orders} orders delivered)` : ''
          setResults(prev => prev.map(r =>
            r.fileName === file.name ? {
              ...r,
              status: 'success',
              message: parsed.cycles.length > 0
                ? `Saved ${parsed.cycles.length} settlement cycle(s)${ordersNote}${periodNote}`
                : 'File parsed but no valid cycles found — check the file format.',
              cyclesFound: parsed.cycles.length,
              warnings: parsed.warnings,
              detectedColumns: parsed.detectedColumns,
              meta: parsed.meta,
            } : r
          ))
        } else {
          // Ads and business report parsers — similar structure, extend later
          setResults(prev => prev.map(r =>
            r.fileName === file.name ? {
              ...r,
              status: 'success',
              message: 'File accepted. Parser for this report type coming soon.',
            } : r
          ))
        }
      } catch (err: any) {
        setResults(prev => prev.map(r =>
          r.fileName === file.name ? {
            ...r,
            status: 'error',
            message: err.message ?? 'Failed to parse file.',
          } : r
        ))
      }
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Upload Reports</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {restaurant.name} · Upload exported Zomato reports to update your dashboard
        </p>
      </div>

      {/* Report type selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {([
          { key: 'payout', label: 'Payout Report', desc: 'Finance → Payouts → Get report' },
          { key: 'ads', label: 'Ad Performance', desc: 'Ads → Ad performance → Download' },
          { key: 'business', label: 'Business Report', desc: 'Reporting → Business reports → Generate' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setUploadType(t.key)}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid',
              borderColor: uploadType === t.key ? 'var(--color-accent)' : 'var(--color-border)',
              background: uploadType === t.key ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              textAlign: 'left',
              flex: 1,
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: uploadType === t.key ? 600 : 400, color: uploadType === t.key ? 'var(--color-accent)' : 'var(--color-text)' }}>
              {t.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '3px' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--color-accent-soft)' : 'var(--color-surface)',
          transition: 'all 0.2s',
          marginBottom: '24px',
        }}
      >
        <Upload size={32} color={dragging ? 'var(--color-accent)' : 'var(--color-muted)'} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
          Drop your report file here or click to browse
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
          Excel (.xlsx) files exported from Zomato Partner Dashboard
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Instructions */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '24px',
        fontSize: '13px',
      }}>
        <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--color-muted-2)' }}>
          How to export from Zomato Partner Dashboard:
        </p>
        {uploadType === 'payout' && (
          <ol style={{ paddingLeft: '18px', color: 'var(--color-muted)', lineHeight: 2 }}>
            <li>Go to <strong>Finance → Payouts</strong></li>
            <li>Select the outlet from the dropdown (top right)</li>
            <li>Under "Past cycles", set your date range and click <strong>Get report</strong></li>
            <li>Download the Excel or CSV file and upload it here</li>
          </ol>
        )}
        {uploadType === 'ads' && (
          <ol style={{ paddingLeft: '18px', color: 'var(--color-muted)', lineHeight: 2 }}>
            <li>Go to <strong>Ads → Ad performance</strong></li>
            <li>Set your date range and outlet filter</li>
            <li>Click <strong>Download report</strong> (top right)</li>
            <li>Upload the downloaded file here</li>
          </ol>
        )}
        {uploadType === 'business' && (
          <ol style={{ paddingLeft: '18px', color: 'var(--color-muted)', lineHeight: 2 }}>
            <li>Go to <strong>Reporting → Business reports</strong></li>
            <li>Select outlet and date range</li>
            <li>Click <strong>Generate report</strong> and download</li>
            <li>Upload the file here</li>
          </ol>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Upload Results</h2>
            <button onClick={() => setResults([])} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '12px' }}>
              Clear all
            </button>
          </div>

          {results.map((r, i) => (
            <div key={i} style={{
              background: 'var(--color-surface)',
              border: `1px solid ${r.status === 'error' ? 'rgba(226,55,68,0.3)' : r.status === 'success' ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
              borderRadius: '10px',
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {r.status === 'parsing' && <FileText size={16} color="var(--color-muted)" />}
                {r.status === 'success' && <CheckCircle size={16} color="var(--color-green)" />}
                {r.status === 'error' && <AlertTriangle size={16} color="var(--color-accent)" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.fileName}</div>
                  <div style={{ fontSize: '12px', color: r.status === 'error' ? 'var(--color-accent)' : 'var(--color-muted)', marginTop: '2px' }}>
                    {r.message}
                  </div>
                </div>
              </div>

              {r.meta?.res_name && (
                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-muted)' }}>
                  <strong>Restaurant:</strong> {r.meta.res_name}
                  {r.meta.res_id && <span style={{ marginLeft: '8px' }}>· ID: {r.meta.res_id}</span>}
                  {r.meta.period && <span style={{ marginLeft: '8px' }}>· {r.meta.period}</span>}
                </div>
              )}

              {r.warnings && r.warnings.map((w, wi) => (
                <div key={wi} style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-amber)', display: 'flex', gap: '6px' }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
                  {w}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
