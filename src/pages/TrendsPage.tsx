import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Upload } from 'lucide-react'
import { useRestaurantStore } from '../hooks/useRestaurantStore'
import { formatINRCompact } from '../lib/reconciliation'
import { reconcileCycle } from '../lib/reconciliation'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-muted)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '3px' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function TrendsPage() {
  const { selectedRestaurant, payoutCycles, businessMetrics } = useRestaurantStore()
  const restaurant = selectedRestaurant
  if (!restaurant) return null
  const cycles = payoutCycles[restaurant.id] ?? []
  const metrics = businessMetrics[restaurant.id] ?? []

  const payoutTrend = useMemo(() => {
    return [...cycles]
      .sort((a, b) => a.cycle_start.localeCompare(b.cycle_start))
      .map(c => {
        const rec = reconcileCycle(c, restaurant)
        return {
          week: c.cycle_label.split(' ')[0] + ' ' + c.cycle_label.split(' ')[1],
          sales: Math.round(c.gross_sales),
          payout: Math.round(c.net_payout_actual),
          orders: c.orders,
          payoutPct: c.gross_sales > 0 ? parseFloat(((c.net_payout_actual / c.gross_sales) * 100).toFixed(1)) : 0,
          discrepancy: parseFloat(Math.abs(rec.discrepancy).toFixed(0)),
          flagged: rec.flagged,
        }
      })
  }, [cycles, restaurant])

  const metricsTrend = useMemo(() => metrics.map(m => ({
    week: m.week_label,
    sales: Math.round(m.sales / 1000),
    orders: m.delivered_orders,
    aov: m.avg_order_value,
    online: m.online_hours_pct,
    cancelled: m.cancelled_orders,
    new_users: m.new_users,
    repeat: m.repeat_users,
    impressions: Math.round(m.impressions / 100),
    menu_visits: Math.round(m.menu_visits / 100),
    rating: m.rating,
  })), [metrics])

  const Section = ({ title, sub }: { title: string; sub?: string }) => (
    <div style={{ marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600 }}>{title}</h2>
      {sub && <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginTop: '2px' }}>{sub}</p>}
    </div>
  )

  const ChartCard = ({ children, title, sub }: { children: React.ReactNode; title: string; sub?: string }) => (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
    }}>
      <Section title={title} sub={sub} />
      {children}
    </div>
  )

  // Week-over-week % change
  const wowChange = (arr: typeof payoutTrend, key: keyof typeof payoutTrend[0]) => {
    if (arr.length < 2) return null
    const last = Number(arr[arr.length - 1][key])
    const prev = Number(arr[arr.length - 2][key])
    if (prev === 0) return null
    return ((last - prev) / prev) * 100
  }

  const salesChange = wowChange(payoutTrend, 'sales')
  const ordersChange = wowChange(payoutTrend, 'orders')
  const payoutPctChange = wowChange(payoutTrend, 'payoutPct')

  if (cycles.length === 0) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Trend Analysis</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>{restaurant.name}</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
          <Upload size={28} color="var(--color-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No trend data yet</div>
          <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px' }}>Upload payout and business reports to see weekly trends.</div>
          <Link to="/upload" style={{ display: 'inline-block', padding: '8px 18px', background: 'var(--color-accent)', color: '#fff', borderRadius: '7px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
            Upload Report
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Trend Analysis</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>{restaurant.name}</p>
      </div>

      {/* WoW summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Sales (vs last week)', value: formatINRCompact(payoutTrend[payoutTrend.length - 1]?.sales ?? 0), change: salesChange },
          { label: 'Orders (vs last week)', value: String(payoutTrend[payoutTrend.length - 1]?.orders ?? 0), change: ordersChange },
          { label: 'Payout % (vs last week)', value: `${payoutTrend[payoutTrend.length - 1]?.payoutPct ?? 0}%`, change: payoutPctChange },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>{s.value}</div>
            {s.change !== null && (
              <div style={{ fontSize: '12px', marginTop: '4px', color: (s.change ?? 0) > 0 ? 'var(--color-green)' : 'var(--color-accent)' }}>
                {(s.change ?? 0) > 0 ? '↑' : '↓'} {Math.abs(s.change ?? 0).toFixed(1)}% WoW
              </div>
            )}
          </div>
        ))}
      </div>

      <ChartCard title="Sales vs Payout Trend" sub="Weekly gross sales and net payout — track your payout ratio">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={payoutTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatINRCompact(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="sales" name="Sales" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="payout" name="Net Payout" stroke="var(--color-green)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Payout % of Sales" sub="How much of your gross sales you actually receive — watch for dips">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={payoutTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="payoutPct" name="Payout %" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {metricsTrend.length > 0 && (
        <>
          <ChartCard title="Customer Funnel" sub="Impressions (×100) → Menu visits (×100) → Orders funnel per week">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={metricsTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="impressions" name="Impressions ×100" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="menu_visits" name="Menu Visits ×100" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="var(--color-green)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="New vs Repeat Users" sub="Customer retention health">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metricsTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="new_users" name="New Users" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
                <Bar dataKey="repeat" name="Repeat Users" stackId="a" fill="var(--color-green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Online % & Cancelled Orders" sub="Operational health — downtime and rejections">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={metricsTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="online" name="Online %" stroke="var(--color-green)" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="cancelled" name="Cancelled" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  )
}
