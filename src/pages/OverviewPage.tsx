import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, TrendingUp, Receipt, ShoppingBag, Upload } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import StatCard from '../components/dashboard/StatCard'
import { reconcileCycle } from '../lib/reconciliation'
import { formatINRCompact, formatINR } from '../lib/reconciliation'
import { useRestaurantStore } from '../hooks/useRestaurantStore'

export default function OverviewPage() {
  const { selectedRestaurant, payoutCycles, businessMetrics } = useRestaurantStore()
  const restaurant = selectedRestaurant
  if (!restaurant) return null
  const cycles = payoutCycles[restaurant.id] ?? []
  const metrics = businessMetrics[restaurant.id] ?? []

  const reconciliations = useMemo(() =>
    cycles.map(c => reconcileCycle(c, restaurant)),
    [cycles, restaurant]
  )

  const totalSales = cycles.reduce((s, c) => s + c.gross_sales, 0)
  const totalPayout = cycles.reduce((s, c) => s + c.net_payout_actual, 0)
  const totalOrders = cycles.reduce((s, c) => s + c.orders, 0)
  const totalDiscrepancy = reconciliations.reduce((s, r) => s + r.discrepancy, 0)
  const flaggedCount = reconciliations.filter(r => r.flagged).length
  const payoutPct = totalSales > 0 ? (totalPayout / totalSales) * 100 : 0

  // Trend chart data from business metrics
  const chartData = metrics.map(m => ({
    week: m.week_label,
    sales: Math.round(m.sales / 1000),
    orders: m.delivered_orders,
    aov: m.avg_order_value,
  }))

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
        <div style={{ fontWeight: 600, marginBottom: '6px' }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
            {p.name}: {p.dataKey === 'sales' ? `₹${p.value}K` : p.value}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px', letterSpacing: '-0.4px' }}>
          {restaurant.name}
        </h1>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            `ID: ${restaurant.zomato_outlet_id}`,
            `Commission: ${restaurant.commission_pct}% + GST`,
            `Ad Budget: ${formatINRCompact(restaurant.monthly_ad_budget)}/wk`,
          ].map(chip => (
            <span key={chip} style={{
              fontSize: '11px', padding: '3px 10px',
              borderRadius: '99px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted-2)',
              fontWeight: 500,
            }}>{chip}</span>
          ))}
        </div>
      </div>

      {/* Flagged alert */}
      {flaggedCount > 0 && (
        <div style={{
          background: 'rgba(226,55,68,0.07)',
          border: '1px solid rgba(226,55,68,0.22)',
          borderLeft: '3px solid var(--color-accent)',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(226,55,68,0.08)',
        }}>
          <div style={{
            width: '34px', height: '34px', flexShrink: 0,
            background: 'rgba(226,55,68,0.12)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={17} color="var(--color-accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-accent)', fontSize: '13.5px' }}>
              {flaggedCount} payout cycle{flaggedCount > 1 ? 's' : ''} flagged
            </div>
            <div style={{ color: 'var(--color-muted-2)', fontSize: '13px', marginTop: '2px' }}>
              Discrepancy detected vs expected payout — review the Payouts section.
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <StatCard
          label="Total Sales"
          value={formatINRCompact(totalSales)}
          sub={`${cycles.length} cycles`}
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Net Payout"
          value={formatINRCompact(totalPayout)}
          sub={`${payoutPct.toFixed(1)}% of sales`}
          icon={<Receipt size={16} />}
        />
        <StatCard
          label="Total Orders"
          value={totalOrders.toLocaleString('en-IN')}
          sub={totalOrders > 0 ? `Avg ₹${Math.round(totalSales / totalOrders)}/order` : 'No data yet'}
          icon={<ShoppingBag size={16} />}
        />
        <StatCard
          label="Payout Discrepancy"
          value={formatINRCompact(Math.abs(totalDiscrepancy))}
          sub={totalDiscrepancy < -10 ? 'Zomato owes you' : totalDiscrepancy > 10 ? 'You overpaid' : 'All clear'}
          accent={Math.abs(totalDiscrepancy) > 100 ? 'red' : Math.abs(totalDiscrepancy) > 10 ? 'amber' : 'green'}
          icon={<AlertTriangle size={16} />}
        />
      </div>

      {/* Empty state */}
      {cycles.length === 0 && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          <Upload size={32} color="var(--color-muted)" style={{ margin: '0 auto 14px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No data yet for {restaurant.name}</div>
          <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '18px' }}>
            Upload a Zomato payout report to populate this dashboard.
          </div>
          <Link
            to="/upload"
            style={{
              display: 'inline-block',
              padding: '9px 20px',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Upload Report
          </Link>
        </div>
      )}

      {/* Sales trend chart */}
      {chartData.length > 0 && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Weekly Sales & Orders</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginTop: '2px' }}>
              Trend across last {chartData.length} weeks
            </p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}K`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-muted-2)' }} />
              <Line yAxisId="left" type="monotone" dataKey="sales" name="Sales (₹K)" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent cycles table */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Recent Payout Cycles</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)' }}>
                {['Cycle', 'Orders', 'Sales', 'Payout', 'Discrepancy', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycles.slice(0, 6).map((cycle, i) => {
                const rec = reconciliations[i]
                const flagged = rec?.flagged
                return (
                  <tr key={cycle.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{cycle.cycle_label}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{cycle.orders}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatINRCompact(cycle.gross_sales)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatINRCompact(cycle.net_payout_actual)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {rec && (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: flagged ? 'var(--color-accent)' : 'var(--color-green)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>
                          {flagged ? `–${formatINR(Math.abs(rec.discrepancy))}` : '✓ OK'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: cycle.status === 'PAID' ? 'var(--color-green-soft)' : 'var(--color-amber-soft)',
                        color: cycle.status === 'PAID' ? 'var(--color-green)' : 'var(--color-amber)',
                      }}>
                        {cycle.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
