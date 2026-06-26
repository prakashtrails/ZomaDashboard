import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  trend?: number
  trendInverted?: boolean
  accent?: 'red' | 'green' | 'amber' | 'default'
  icon?: ReactNode
}

const ICON_COLORS = {
  red:     '226, 55, 68',
  green:   '34, 197, 94',
  amber:   '245, 158, 11',
  default: '148, 163, 184',
}

export default function StatCard({ label, value, sub, trend, trendInverted, accent = 'default', icon }: StatCardProps) {
  const colors = {
    red:     { bg: 'var(--color-accent-soft)',  text: 'var(--color-accent)', border: 'rgba(226,55,68,0.2)' },
    green:   { bg: 'var(--color-green-soft)',   text: 'var(--color-green)',  border: 'rgba(34,197,94,0.2)' },
    amber:   { bg: 'var(--color-amber-soft)',   text: 'var(--color-amber)',  border: 'rgba(245,158,11,0.2)' },
    default: { bg: 'var(--color-surface)',      text: 'var(--color-text)',   border: 'var(--color-border)' },
  }

  const c = colors[accent]
  const ic = ICON_COLORS[accent]
  const trendGood = trendInverted ? (trend ?? 0) < 0 : (trend ?? 0) > 0
  const trendColor = trend === undefined ? undefined : trendGood ? 'var(--color-green)' : 'var(--color-accent)'

  return (
    <div
      className="stat-card"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderTop: accent !== 'default' ? `2px solid ${c.text}` : `1px solid ${c.border}`,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{
          fontSize: '11px',
          color: 'var(--color-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: '32px', height: '32px',
            background: `rgba(${ic}, 0.13)`,
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: c.text,
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{
        fontSize: '26px',
        fontWeight: 700,
        color: c.text,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        letterSpacing: '-0.5px',
        fontFamily: "'Inter', sans-serif",
      }}>
        {value}
      </div>

      {(sub !== undefined || trend !== undefined) && (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {trend !== undefined && (
            <span style={{ fontSize: '12px', color: trendColor, fontWeight: 600 }}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && (
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{sub}</span>
          )}
        </div>
      )}
    </div>
  )
}
