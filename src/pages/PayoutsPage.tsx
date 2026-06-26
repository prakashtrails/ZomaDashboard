import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Upload } from 'lucide-react'
import { reconcileCycle, formatINR, formatINRCompact } from '../lib/reconciliation'
import { useRestaurantStore } from '../hooks/useRestaurantStore'
import type { Restaurant, PayoutCycle } from '../types'
import type { ReconciliationResult } from '../types'

export default function PayoutsPage() {
  const { selectedRestaurant, payoutCycles } = useRestaurantStore()
  const restaurant = selectedRestaurant
  if (!restaurant) return null
  const cycles = payoutCycles[restaurant.id] ?? []
  const [expanded, setExpanded] = useState<string | null>(null)

  const results = useMemo(() =>
    cycles.map(c => ({ cycle: c, rec: reconcileCycle(c, restaurant) })),
    [cycles, restaurant]
  )

  const flagged = results.filter(r => r.rec.flagged)
  const totalDiscrepancy = results.reduce((s, r) => s + r.rec.discrepancy, 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
          Payouts & Reconciliation
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {restaurant.name} · Commission {restaurant.commission_pct}% + {restaurant.gst_on_commission_pct}% GST
        </p>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px',
        marginBottom: '28px',
      }}>
        {[
          { label: 'Cycles Analysed', value: results.length.toString(), ok: true },
          { label: 'Flagged Cycles', value: flagged.length.toString(), ok: flagged.length === 0 },
          { label: 'Total Discrepancy', value: formatINRCompact(Math.abs(totalDiscrepancy)), ok: Math.abs(totalDiscrepancy) < 10 },
          { label: 'Ad Budget', value: formatINRCompact(restaurant.monthly_ad_budget), ok: true },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--color-surface)',
            border: `1px solid ${!s.ok ? 'rgba(226,55,68,0.28)' : 'var(--color-border)'}`,
            borderTop: !s.ok ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: !s.ok ? 'var(--color-accent)' : 'var(--color-text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Cycles list / empty state */}
      {cycles.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <Upload size={28} color="var(--color-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No payout cycles yet</div>
          <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px' }}>
            Upload a Zomato Finance → Payouts report to see reconciliation here.
          </div>
          <Link to="/upload" style={{ display: 'inline-block', padding: '8px 18px', background: 'var(--color-accent)', color: '#fff', borderRadius: '7px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
            Upload Report
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {results.map(({ cycle, rec }) => (
            <CycleRow
              key={cycle.id}
              cycle={cycle}
              rec={rec}
              expanded={expanded === cycle.id}
              onToggle={() => setExpanded(expanded === cycle.id ? null : cycle.id)}
              restaurant={restaurant}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CycleRow({ cycle, rec, expanded, onToggle, restaurant }: {
  cycle: PayoutCycle
  rec: ReconciliationResult
  expanded: boolean
  onToggle: () => void
  restaurant: Restaurant
}) {
  const flagged = rec.flagged
  const adOverage = cycle.ad_spend_actual > cycle.ad_spend_agreed

  return (
    <div
      className="cycle-row"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${flagged ? 'rgba(226,55,68,0.28)' : 'var(--color-border)'}`,
        borderLeft: flagged ? '3px solid var(--color-accent)' : '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
      {/* Row header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--color-text)',
          textAlign: 'left',
        }}
      >
        {flagged
          ? <AlertTriangle size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
          : <CheckCircle size={16} color="var(--color-green)" style={{ flexShrink: 0 }} />
        }

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{cycle.cycle_label}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{cycle.orders} orders · UTR: {cycle.utr_number.slice(0, 16)}…</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted-2)' }}>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{formatINRCompact(cycle.gross_sales)}</span> sales
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted-2)' }}>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{formatINRCompact(cycle.net_payout_actual)}</span> paid
          </div>
          <div>
            {flagged ? (
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)' }}>
                –{formatINR(Math.abs(rec.discrepancy))} short
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--color-green)' }}>✓ Matched</span>
            )}
          </div>
          {adOverage && (
            <span style={{
              fontSize: '11px', fontWeight: 600,
              background: 'var(--color-amber-soft)',
              color: 'var(--color-amber)',
              padding: '2px 8px', borderRadius: '4px', display: 'inline-block',
            }}>
              Ad overage: {formatINRCompact(cycle.ad_spend_actual - cycle.ad_spend_agreed)} refund
            </span>
          )}
        </div>

        {expanded ? <ChevronDown size={16} color="var(--color-muted)" /> : <ChevronRight size={16} color="var(--color-muted)" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          padding: '20px',
          background: 'var(--color-surface-2)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
            {/* Math breakdown */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Payout Calculation
              </div>
              {[
                { label: 'Gross Sales', value: cycle.gross_sales, indent: 0 },
                { label: '– Zomato Discount', value: -cycle.zomato_discount, indent: 1 },
                { label: '– Restaurant Discount', value: -cycle.restaurant_discount, indent: 1 },
                { label: '= Commissionable Value', value: cycle.commissionable_value, indent: 0, bold: true },
                { label: `– Commission (${restaurant.commission_pct}%)`, value: -cycle.commission_charged, indent: 1 },
                { label: `– GST on Commission (${restaurant.gst_on_commission_pct}%)`, value: -cycle.gst_on_commission, indent: 1 },
                ...(cycle.ad_spend_overage > 0 ? [{ label: '+ Ad Overage Refund', value: cycle.ad_spend_overage, indent: 1 }] : []),
                { label: '= Expected Payout', value: rec.expectedPayout, indent: 0, bold: true, accent: true },
                { label: 'Actual Payout Received', value: cycle.net_payout_actual, indent: 0, bold: true },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '5px 0',
                  paddingLeft: `${row.indent * 16}px`,
                  borderBottom: row.bold ? '1px solid var(--color-border)' : 'none',
                }}>
                  <span style={{ fontSize: '12px', color: row.bold ? 'var(--color-text)' : 'var(--color-muted-2)', fontWeight: row.bold ? 600 : 400 }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: row.bold ? 700 : 400,
                    color: row.accent ? 'var(--color-accent)' : row.value < 0 ? 'var(--color-accent)' : 'var(--color-text)',
                  }}>
                    {formatINR(row.value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Discrepancy check */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Line-by-Line Check
              </div>
              {rec.details.map((d, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '12px',
                }}>
                  <span style={{ color: 'var(--color-muted-2)' }}>{d.label}</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-muted)' }}>Exp: {formatINR(d.expected)}</span>
                  <span style={{ fontFamily: 'monospace' }}>Act: {formatINR(d.actual)}</span>
                  <span style={{
                    fontWeight: 700,
                    color: d.ok ? 'var(--color-green)' : 'var(--color-accent)',
                  }}>
                    {d.ok ? '✓' : `–${formatINR(Math.abs(d.diff))}`}
                  </span>
                </div>
              ))}

              {/* Ad spend */}
              <div style={{ marginTop: '16px', padding: '12px', background: adOverage ? 'var(--color-amber-soft)' : 'var(--color-surface)', borderRadius: '8px', border: `1px solid ${adOverage ? 'rgba(245,158,11,0.3)' : 'var(--color-border)'}` }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px' }}>AD SPEND CHECK</div>
                <div style={{ fontSize: '12px' }}>
                  Agreed: <strong>{formatINR(cycle.ad_spend_agreed)}</strong> · Actual: <strong>{formatINR(cycle.ad_spend_actual)}</strong>
                </div>
                {adOverage && (
                  <div style={{ fontSize: '12px', color: 'var(--color-amber)', marginTop: '4px', fontWeight: 600 }}>
                    ⚠ Overage of {formatINR(cycle.ad_spend_actual - cycle.ad_spend_agreed)} — verify refund on Recovery invoice
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Discrepancy callout */}
          {rec.flagged && (
            <div style={{
              background: 'rgba(226,55,68,0.08)',
              border: '1px solid rgba(226,55,68,0.25)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
            }}>
              <strong style={{ color: 'var(--color-accent)' }}>
                Discrepancy of {formatINR(Math.abs(rec.discrepancy))} ({Math.abs(rec.discrepancyPct).toFixed(2)}%)
              </strong>
              {' '}— expected {formatINR(rec.expectedPayout)} but received {formatINR(rec.actualPayout)}.
              Raise with Zomato POC quoting UTR: <span style={{ fontFamily: 'monospace' }}>{cycle.utr_number}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
