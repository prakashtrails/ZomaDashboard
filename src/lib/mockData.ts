import type { Restaurant, PayoutCycle, BusinessMetrics, AdPerformanceEntry } from '../types'

export const mockRestaurants: Restaurant[] = [
  {
    id: 'r1',
    consultant_id: 'c1',
    name: 'Rustic – C Scheme',
    zomato_outlet_id: '101259',
    city: 'Jaipur',
    commission_pct: 20,
    gst_on_commission_pct: 18,
    discount_sharing_pct: 50,
    monthly_ad_budget: 20000,
    ad_budget_includes_gst: false,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'r2',
    consultant_id: 'c1',
    name: 'Rustic – Malviya Nagar',
    zomato_outlet_id: '18858316',
    city: 'Jaipur',
    commission_pct: 22,
    gst_on_commission_pct: 18,
    discount_sharing_pct: 50,
    monthly_ad_budget: 15000,
    ad_budget_includes_gst: false,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'r3',
    consultant_id: 'c1',
    name: 'Rustic – Vaishali Nagar',
    zomato_outlet_id: '20942025',
    city: 'Jaipur',
    commission_pct: 20,
    gst_on_commission_pct: 18,
    discount_sharing_pct: 0,
    monthly_ad_budget: 10000,
    ad_budget_includes_gst: true,
    created_at: '2025-01-01T00:00:00Z',
  },
]

const makeWeeklyPayouts = (restaurantId: string): PayoutCycle[] => {
  const weeks = [
    { label: '25 May - 31 May\'26', start: '2026-05-25', end: '2026-05-31', pDate: '2026-06-03', orders: 140, sales: 110000 },
    { label: '18 May - 24 May\'26', start: '2026-05-18', end: '2026-05-24', pDate: '2026-05-27', orders: 184, sales: 142000 },
    { label: '11 May - 17 May\'26', start: '2026-05-11', end: '2026-05-17', pDate: '2026-05-20', orders: 162, sales: 128000 },
    { label: '04 May - 10 May\'26', start: '2026-05-04', end: '2026-05-10', pDate: '2026-05-13', orders: 155, sales: 122000 },
    { label: '27 Apr - 03 May\'26', start: '2026-04-27', end: '2026-05-03', pDate: '2026-05-06', orders: 148, sales: 118000 },
    { label: '20 Apr - 26 Apr\'26', start: '2026-04-20', end: '2026-04-26', pDate: '2026-04-29', orders: 170, sales: 135000 },
    { label: '13 Apr - 19 Apr\'26', start: '2026-04-13', end: '2026-04-19', pDate: '2026-04-22', orders: 158, sales: 125000 },
    { label: '01 Jun - 07 Jun\'26', start: '2026-06-01', end: '2026-06-07', pDate: '2026-06-10', orders: 174, sales: 138000 },
  ]

  return weeks.map((w, i) => {
    const zDiscount = w.sales * 0.08
    const rDiscount = w.sales * 0.04
    const commVal = w.sales - zDiscount - rDiscount
    const commission = commVal * 0.20
    const gst = commission * 0.18
    const adSpendAgreed = 20000
    // Simulate small overages on 2 cycles
    const adSpendActual = i === 2 ? 26000 : i === 5 ? 22500 : adSpendAgreed
    const adOverage = Math.max(0, adSpendActual - adSpendAgreed)
    const expectedPayout = commVal - commission - gst + adOverage
    // Simulate a discrepancy on 1 cycle
    const actualPayout = i === 3 ? expectedPayout - 1240 : expectedPayout - Math.random() * 50

    return {
      id: `cyc-${restaurantId}-${i}`,
      restaurant_id: restaurantId,
      cycle_label: w.label,
      cycle_start: w.start,
      cycle_end: w.end,
      payout_date: w.pDate,
      orders: w.orders,
      gross_sales: w.sales,
      zomato_discount: zDiscount,
      restaurant_discount: rDiscount,
      commissionable_value: commVal,
      commission_charged: commission,
      gst_on_commission: gst,
      other_deductions: 0,
      ad_spend_actual: adSpendActual,
      ad_spend_agreed: adSpendAgreed,
      ad_spend_overage: adOverage,
      net_payout_expected: expectedPayout,
      net_payout_actual: parseFloat(actualPayout.toFixed(2)),
      discrepancy: parseFloat((expectedPayout - actualPayout).toFixed(2)),
      utr_number: `CITIN266${70000000 + i * 1000000 + Math.floor(Math.random() * 999999)}`,
      status: 'PAID',
      uploaded_at: new Date().toISOString(),
    }
  })
}

export const mockPayoutCycles: Record<string, PayoutCycle[]> = {
  r1: makeWeeklyPayouts('r1'),
  r2: makeWeeklyPayouts('r2').map(c => ({ ...c, orders: Math.round(c.orders * 0.7), gross_sales: c.gross_sales * 0.7 })),
  r3: makeWeeklyPayouts('r3').map(c => ({ ...c, orders: Math.round(c.orders * 0.5), gross_sales: c.gross_sales * 0.5 })),
}

export const mockBusinessMetrics: Record<string, BusinessMetrics[]> = {
  r1: [
    { id: 'bm1', restaurant_id: 'r1', week_label: 'Week 16', week_start: '2026-04-13', week_end: '2026-04-19', sales: 1178427, delivered_orders: 1504, avg_order_value: 784, cancelled_orders: 42, online_hours_pct: 94, new_users: 312, repeat_users: 1192, lapsed_users: 89, impressions: 14200, menu_visits: 8400, cart_adds: 3100, rating: 4.2, uploaded_at: new Date().toISOString() },
    { id: 'bm2', restaurant_id: 'r1', week_label: 'Week 17', week_start: '2026-04-20', week_end: '2026-04-26', sales: 1231407, delivered_orders: 1556, avg_order_value: 791, cancelled_orders: 38, online_hours_pct: 96, new_users: 328, repeat_users: 1228, lapsed_users: 72, impressions: 15100, menu_visits: 8900, cart_adds: 3300, rating: 4.3, uploaded_at: new Date().toISOString() },
    { id: 'bm3', restaurant_id: 'r1', week_label: 'Week 18', week_start: '2026-04-27', week_end: '2026-05-03', sales: 1092080, delivered_orders: 1391, avg_order_value: 785, cancelled_orders: 55, online_hours_pct: 91, new_users: 289, repeat_users: 1102, lapsed_users: 104, impressions: 13800, menu_visits: 7900, cart_adds: 2800, rating: 4.1, uploaded_at: new Date().toISOString() },
    { id: 'bm4', restaurant_id: 'r1', week_label: 'Week 19', week_start: '2026-05-04', week_end: '2026-05-10', sales: 1220351, delivered_orders: 1567, avg_order_value: 779, cancelled_orders: 44, online_hours_pct: 95, new_users: 318, repeat_users: 1249, lapsed_users: 81, impressions: 14600, menu_visits: 8600, cart_adds: 3200, rating: 4.2, uploaded_at: new Date().toISOString() },
    { id: 'bm5', restaurant_id: 'r1', week_label: 'Week 20', week_start: '2026-05-11', week_end: '2026-05-17', sales: 1092977, delivered_orders: 1390, avg_order_value: 786, cancelled_orders: 61, online_hours_pct: 89, new_users: 275, repeat_users: 1115, lapsed_users: 118, impressions: 13200, menu_visits: 7600, cart_adds: 2700, rating: 4.0, uploaded_at: new Date().toISOString() },
    { id: 'bm6', restaurant_id: 'r1', week_label: 'Week 21', week_start: '2026-05-18', week_end: '2026-05-24', sales: 1179802, delivered_orders: 1497, avg_order_value: 788, cancelled_orders: 40, online_hours_pct: 97, new_users: 305, repeat_users: 1192, lapsed_users: 76, impressions: 14800, menu_visits: 8700, cart_adds: 3150, rating: 4.3, uploaded_at: new Date().toISOString() },
    { id: 'bm7', restaurant_id: 'r1', week_label: 'Week 22', week_start: '2026-05-25', week_end: '2026-05-31', sales: 979149, delivered_orders: 1310, avg_order_value: 747, cancelled_orders: 48, online_hours_pct: 92, new_users: 268, repeat_users: 1042, lapsed_users: 95, impressions: 12900, menu_visits: 7200, cart_adds: 2550, rating: 4.1, uploaded_at: new Date().toISOString() },
    { id: 'bm8', restaurant_id: 'r1', week_label: 'Week 23', week_start: '2026-06-01', week_end: '2026-06-07', sales: 1052447, delivered_orders: 1403, avg_order_value: 750, cancelled_orders: 36, online_hours_pct: 98, new_users: 291, repeat_users: 1112, lapsed_users: 68, impressions: 13500, menu_visits: 7950, cart_adds: 2900, rating: 4.2, uploaded_at: new Date().toISOString() },
  ],
}

export const mockAdPerformance: AdPerformanceEntry[] = [
  { id: 'ad1', restaurant_id: 'r1', period_start: '2026-04-14', period_end: '2026-06-12', roi: 6.05, ad_sales: 2775234, ad_spend: 458688, delivery_pct: 96.24, ad_orders: 3861, ad_menu_visits: 49341, uploaded_at: new Date().toISOString() },
]
