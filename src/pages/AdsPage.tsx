import { Link } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { useRestaurantStore } from '../hooks/useRestaurantStore'
import { formatINRCompact, formatINR } from '../lib/reconciliation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { AdPerformanceEntry } from '../types'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
      <div style={{ fontWeight: 600, marginBottom: '6px' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
          {p.name}: <strong>{p.dataKey === 'roi' ? `${p.value}×` : formatINRCompact(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

function AdMetrics({ latest, restaurant }: { latest: AdPerformanceEntry; restaurant: any }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '28px' }}>
      {[
        { label: 'ROI', value: `${latest.roi}×`, sub: 'Return on ad spend', good: latest.roi > 4 },
        { label: 'Ad Sales', value: formatINRCompact(latest.ad_sales), sub: 'Revenue from ads' },
        { label: 'Ad Spend', value: formatINRCompact(latest.ad_spend), sub: `vs budget ${formatINRCompact(restaurant.monthly_ad_budget * 8)}` },
        { label: 'Delivery %', value: `${latest.delivery_pct}%`, sub: 'Budget delivery rate', good: latest.delivery_pct > 90 },
        { label: 'Ad Orders', value: latest.ad_orders.toLocaleString('en-IN'), sub: 'Orders via ads' },
        { label: 'Menu Visits', value: latest.ad_menu_visits.toLocaleString('en-IN'), sub: 'From ad impressions' },
      ].map(s => (
        <div key={s.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'good' in s ? (s.good ? 'var(--color-green)' : 'var(--color-accent)') : 'var(--color-text)' }}>{s.value}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '3px' }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default function AdsPage() {
  const { selectedRestaurant, adPerformance } = useRestaurantStore()
  const restaurant = selectedRestaurant
  if (!restaurant) return null
  const ads = adPerformance[restaurant.id] ?? []
  const latest = ads[0]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Ad Performance</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {restaurant.name} · Budget: {formatINRCompact(restaurant.monthly_ad_budget)}/week {restaurant.ad_budget_includes_gst ? '(incl. GST)' : '(+GST)'}
        </p>
      </div>

      {/* Key metrics — only if data is available */}
      {latest && <AdMetrics latest={latest} restaurant={restaurant} />}

      {/* Budget check — always shown, based on restaurant config */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Ad Budget Verification</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Agreed Weekly Budget', value: formatINR(restaurant.monthly_ad_budget), note: restaurant.ad_budget_includes_gst ? 'Incl. GST' : 'Excl. GST' },
            { label: 'Effective Budget (incl GST)', value: formatINR(restaurant.ad_budget_includes_gst ? restaurant.monthly_ad_budget : restaurant.monthly_ad_budget * 1.18), note: 'Cap that Zomato must respect' },
            { label: 'Overage Threshold', value: '₹0', note: 'Any spend above effective budget triggers refund' },
          ].map(b => (
            <div key={b.label} style={{ padding: '14px', background: 'var(--color-surface-2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '6px' }}>{b.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{b.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '3px' }}>{b.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts — empty state if no data */}
      {ads.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
          <Upload size={28} color="var(--color-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No ad performance data yet</div>
          <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px' }}>
            Upload an Ads → Ad Performance report to see spend vs ROI charts.
          </div>
          <Link to="/upload" style={{ display: 'inline-block', padding: '8px 18px', background: 'var(--color-accent)', color: '#fff', borderRadius: '7px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
            Upload Report
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Weekly Spend vs Sales</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ads} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="period_start" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatINRCompact(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ad_spend" name="Ad Spend" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ad_sales" name="Ad Sales" fill="var(--color-green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>ROI</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ads} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="period_start" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}×`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="roi" name="ROI" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
