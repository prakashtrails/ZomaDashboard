export interface Restaurant {
  id: string
  consultant_id: string
  name: string
  zomato_outlet_id: string
  city: string
  commission_pct: number       // e.g. 20 for 20%
  gst_on_commission_pct: number // e.g. 18
  discount_sharing_pct: number  // % of discount borne by restaurant
  monthly_ad_budget: number     // agreed ad budget in ₹ (excl GST)
  ad_budget_includes_gst: boolean
  created_at: string
}

export interface PayoutCycle {
  id: string
  restaurant_id: string
  cycle_label: string           // "01 Jun - 07 Jun'26"
  cycle_start: string
  cycle_end: string
  payout_date: string
  orders: number
  gross_sales: number
  zomato_discount: number
  restaurant_discount: number
  commissionable_value: number
  commission_charged: number
  gst_on_commission: number
  other_deductions: number
  ad_spend_actual: number
  ad_spend_agreed: number
  ad_spend_overage: number      // ad_spend_actual - ad_spend_agreed (if >0, refund due)
  net_payout_expected: number
  net_payout_actual: number
  discrepancy: number           // net_payout_expected - net_payout_actual
  utr_number: string
  status: 'PAID' | 'PENDING' | 'PROCESSING'
  raw_file_name?: string
  uploaded_at: string
}

export interface PayoutRow {
  // Raw columns from Zomato payout CSV — will refine once we see real file
  order_id?: string
  order_date?: string
  item_total?: number
  zomato_discount?: number
  restaurant_discount?: number
  commissionable_value?: number
  commission?: number
  gst_on_commission?: number
  packaging?: number
  other?: number
  payout?: number
  [key: string]: unknown
}

export interface AdPerformanceEntry {
  id: string
  restaurant_id: string
  period_start: string
  period_end: string
  roi: number
  ad_sales: number
  ad_spend: number
  delivery_pct: number
  ad_orders: number
  ad_menu_visits: number
  uploaded_at: string
}

export interface BusinessMetrics {
  id: string
  restaurant_id: string
  week_label: string
  week_start: string
  week_end: string
  sales: number
  delivered_orders: number
  avg_order_value: number
  cancelled_orders: number
  online_hours_pct: number
  new_users: number
  repeat_users: number
  lapsed_users: number
  impressions: number
  menu_visits: number
  cart_adds: number
  rating: number
  uploaded_at: string
}

export interface ReconciliationResult {
  cycleId: string
  cycleLabel: string
  expectedPayout: number
  actualPayout: number
  discrepancy: number
  discrepancyPct: number
  adOverage: number
  flagged: boolean
  details: ReconciliationDetail[]
}

export interface ReconciliationDetail {
  label: string
  expected: number
  actual: number
  diff: number
  ok: boolean
}

export interface MonthlyTrend {
  month: string          // "Apr 2026"
  sales: number
  payout: number
  payout_pct: number     // payout / sales * 100
  orders: number
  avg_order_value: number
  discrepancy: number
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'consultant'
}
