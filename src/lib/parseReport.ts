import * as XLSX from 'xlsx'
import type { PayoutCycle } from '../types'

// ─── Public interface ─────────────────────────────────────────────────────────

export interface ParsedReport {
  cycles: Partial<PayoutCycle>[]
  rawRows: Record<string, unknown>[]
  detectedColumns: string[]
  warnings: string[]
  meta?: {
    res_name?: string
    res_id?: string
    period?: string
    legal_entity?: string
    total_orders?: number
    delivered_orders?: number
  }
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface OrderRow {
  order_id: string
  order_date: Date | null
  order_status: string
  net_order_value: number
  restaurant_discount_promo: number
  restaurant_discount_other: number
  commissionable_value: number
  service_fee: number
  payment_mechanism_fee: number
  gst_on_platform_fee: number
  tds_194o: number
  gst_9_5: number
  other_order_deductions: number
  net_additions: number
  order_payout: number
  settlement_status: string
  settlement_date: Date | null
  utr: string
}

interface AdsEntry {
  period_start: Date | null
  period_end: Date | null
  adjusted_amount: number
}

interface ReportMeta {
  period: string
  res_id: string
  res_name: string
  legal_entity: string
  utrs: string[]
}

// ─── Key normalisation helpers ────────────────────────────────────────────────

function norm(s: string): string {
  // FIX: collapse ALL whitespace (including \n \r and multiple spaces) to single space
  return s.toLowerCase().replace(/[\n\r\s]+/g, ' ').trim()
}

function buildKeyMap(headers: unknown[]): Map<string, number> {
  const map = new Map<string, number>()
  headers.forEach((h, i) => {
    if (h != null && String(h).trim() !== '') {
      map.set(norm(String(h)), i)
    }
  })
  return map
}

/**
 * Find the first column index whose normalised header starts with any of the
 * provided search strings (most-specific match wins because we try in order).
 */
function findCol(keyMap: Map<string, number>, ...searches: string[]): number {
  for (const search of searches) {
    const s = norm(search)
    for (const [k, idx] of keyMap) {
      if (k.startsWith(s)) return idx
    }
  }
  return -1
}

// ─── Row-value extractors ─────────────────────────────────────────────────────

function cellNum(row: unknown[], idx: number): number {
  if (idx < 0) return 0
  const v = row[idx]
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const n = parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

function cellStr(row: unknown[], idx: number): string {
  if (idx < 0) return ''
  return String(row[idx] ?? '').trim()
}

function cellDate(row: unknown[], idx: number): Date | null {
  if (idx < 0) return null
  const v = row[idx]
  if (v == null || v === '') return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400000)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function makeCycleLabel(start: Date, end: Date): string {
  const yr = String(end.getFullYear()).slice(2)
  return `${start.getDate()} ${MON[start.getMonth()]} - ${end.getDate()} ${MON[end.getMonth()]} '${yr}`
}

// ─── HSummary sheet ───────────────────────────────────────────────────────────

function parseHSummary(wb: XLSX.WorkBook): ReportMeta | null {
  const sheet = wb.Sheets['HSummary']
  if (!sheet) return null

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })
  const dataRow = rows.find(r => r[5] != null && String(r[5]).trim() !== '') as unknown[] | undefined
  if (!dataRow) return null

  const utrsRaw = String(dataRow[18] ?? '').trim()
  return {
    period:       String(dataRow[4]  ?? '').trim(),
    res_id:       String(dataRow[5]  ?? '').trim(),
    legal_entity: String(dataRow[7]  ?? '').trim(),
    res_name:     String(dataRow[8]  ?? '').trim(),
    utrs: utrsRaw ? utrsRaw.split(',').map(u => u.trim()).filter(Boolean) : [],
  }
}

// ─── Addition Deductions sheet (ADS spend) ────────────────────────────────────

function parseAdsDate(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\s+(\w+)\s+(\d{2,4})$/)
  if (!m) return null
  const MONTH_IDX: Record<string, number> = {
    jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
    january:0, february:1, march:2, april:3, june:5, july:6, august:7,
    september:8, october:9, november:10, december:11,
  }
  const day = parseInt(m[1])
  const month = MONTH_IDX[m[2].toLowerCase().slice(0, 3)]
  let year = parseInt(m[3])
  if (year < 100) year += 2000
  if (month === undefined || isNaN(day) || isNaN(year)) return null
  return new Date(year, month, day)
}

function parseAdsPeriod(period: string): { start: Date; end: Date } | null {
  const [a, b] = period.split(' - ')
  if (!a || !b) return null
  const start = parseAdsDate(a.trim())
  const end = parseAdsDate(b.trim())
  if (!start || !end) return null
  return { start, end }
}

function parseAdsDeductions(wb: XLSX.WorkBook): AdsEntry[] {
  const sheet = wb.Sheets['Addition Deductions Details']
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })
  const entries: AdsEntry[] = []
  let inDeductionGrowth = false

  for (const row of rows) {
    const text = row.map(c => String(c ?? '')).join(' ').toLowerCase()

    // FIX: trigger on "investments in growth services" alone —
    // the actual file has this as a standalone section header row,
    // NOT combined with "deduction type" on the same row.
    if (text.includes('investments in growth services')) {
      inDeductionGrowth = true
      continue
    }

    // End the block when we hit the Hyperpure section or a new major section
    if (inDeductionGrowth && (
      text.includes('investments in hyperpure') ||
      text.includes('addition type')
    )) {
      inDeductionGrowth = false
    }

    if (inDeductionGrowth && String(row[1] ?? '').trim().toUpperCase() === 'ADS') {
      const periodStr = String(row[4] ?? '').trim()
      const adjusted = parseFloat(String(row[7] ?? '0')) || 0
      if (adjusted !== 0) {
        const p = parseAdsPeriod(periodStr)
        entries.push({
          period_start:    p?.start ?? null,
          period_end:      p?.end   ?? null,
          adjusted_amount: adjusted,
        })
      }
    }
  }

  return entries
}

// ─── Order Level sheet ────────────────────────────────────────────────────────

function parseOrderLevel(wb: XLSX.WorkBook, warnings: string[]): OrderRow[] {
  const sheet = wb.Sheets['Order Level']
  if (!sheet) { warnings.push('Order Level sheet not found.'); return [] }

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })

  if (raw.length < 8) { warnings.push('Order Level sheet appears empty.'); return [] }

  // Row index 5 = actual column headers
  // Row index 6 = sub-headers like (1),(2)… — skip
  // Row index 7+ = order data
  const headers = raw[6] as unknown[]
  const dataRows = raw.slice(8)

  const km = buildKeyMap(headers)

  const iOrderId   = findCol(km, 'order id')
  const iOrderDate = findCol(km, 'order date')
  const iStatus    = findCol(km, 'order status')
  const iNetOrder  = findCol(km, 'net order value')
  const iRdPromo   = findCol(km, 'restaurant discount [promo]')
  const iRdOther   = findCol(km, 'restaurant discount [bogo')
  const iCommVal   = findCol(km, 'commissionable value')

  // FIX: service fee column header after norm() is "service fee [ (9) * (10) ]"
  // We must NOT accidentally match "service fee & payment mechanism fees"
  // Use a long enough prefix that uniquely identifies column Z only.
  const iSvcFee    = findCol(km, 'service fee [ (9)')
  const iPayFee    = findCol(km, 'payment mechanism fee')
  const iGstPlat   = findCol(km, 'taxes on service & payment')
  const iTds       = findCol(km, 'tds 194o')
  const iGst95     = findCol(km, 'gst paid by zomato on behalf')
  const iOtherDed  = findCol(km, 'other order-level deductions')
  const iNetAdd    = findCol(km, 'net additions')
  const iPayoutG   = findCol(km, 'order level payout')
  const iSettSt    = findCol(km, 'settlement status')
  const iSettDate  = findCol(km, 'settlement date')
  const iUtr       = findCol(km, 'bank utr')

  if (iOrderId < 0 || iPayoutG < 0) {
    warnings.push('Required columns not found in Order Level sheet (Order ID or Order Level Payout). Verify the file is a Zomato Settlement Report.')
    return []
  }

  const orders: OrderRow[] = []

  for (const row of dataRows) {
    const orderId = cellStr(row, iOrderId)
    if (!orderId || !/^\d+$/.test(orderId)) continue

    orders.push({
      order_id:                  orderId,
      order_date:                cellDate(row, iOrderDate),
      order_status:              cellStr(row, iStatus).toUpperCase(),
      net_order_value:           cellNum(row, iNetOrder),
      restaurant_discount_promo: cellNum(row, iRdPromo),
      restaurant_discount_other: cellNum(row, iRdOther),
      commissionable_value:      cellNum(row, iCommVal),
      service_fee:               cellNum(row, iSvcFee),
      payment_mechanism_fee:     cellNum(row, iPayFee),
      gst_on_platform_fee:       cellNum(row, iGstPlat),
      tds_194o:                  cellNum(row, iTds),
      gst_9_5:                   cellNum(row, iGst95),
      other_order_deductions:    cellNum(row, iOtherDed),
      net_additions:             cellNum(row, iNetAdd),
      order_payout:              cellNum(row, iPayoutG),
      settlement_status:         cellStr(row, iSettSt).toLowerCase(),
      settlement_date:           cellDate(row, iSettDate),
      utr:                       cellStr(row, iUtr),
    })
  }

  return orders
}

// ─── Build payout cycles from order rows ──────────────────────────────────────

function buildCycles(
  orders: OrderRow[],
  adsEntries: AdsEntry[],
  restaurantId: string,
  weeklyAdBudget: number,
  meta: ReportMeta | null,
  fileName: string,
): Partial<PayoutCycle>[] {
  const byUTR = new Map<string, OrderRow[]>()
  for (const o of orders) {
    const key = o.utr || '_PENDING_'
    if (!byUTR.has(key)) byUTR.set(key, [])
    byUTR.get(key)!.push(o)
  }

  const cycles: Partial<PayoutCycle>[] = []

  for (const [utr, batch] of byUTR) {
    const delivered = batch.filter(o => o.order_status === 'DELIVERED')

    const dates = batch.map(o => o.order_date).filter((d): d is Date => d != null)
    const cycleStart = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null
    const cycleEnd   = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

    const payoutDate = batch.find(o => o.settlement_status === 'settled' && o.settlement_date)?.settlement_date ?? null

    const grossSales     = round2(delivered.reduce((s, o) => s + o.net_order_value, 0))
    const restDiscount   = round2(delivered.reduce((s, o) => s + o.restaurant_discount_promo + o.restaurant_discount_other, 0))
    const commissionable = round2(delivered.reduce((s, o) => s + o.commissionable_value, 0))
    const serviceFee     = round2(batch.reduce((s, o) => s + o.service_fee, 0))
    const paymentFee     = round2(batch.reduce((s, o) => s + o.payment_mechanism_fee, 0))
    const gstOnPlatform  = round2(batch.reduce((s, o) => s + o.gst_on_platform_fee, 0))
    const tdsTotal       = round2(batch.reduce((s, o) => s + o.tds_194o, 0))
    const gst95Total     = round2(batch.reduce((s, o) => s + o.gst_9_5, 0))
    const otherDedTotal  = round2(batch.reduce((s, o) => s + o.other_order_deductions, 0))
    const netPayout      = round2(batch.reduce((s, o) => s + o.order_payout, 0))

    let adSpend = 0
    if (cycleStart && cycleEnd) {
      for (const ads of adsEntries) {
        if (ads.period_start && ads.period_end &&
            ads.period_start <= cycleEnd && ads.period_end >= cycleStart) {
          adSpend += ads.adjusted_amount
        }
      }
    }
    adSpend = round2(adSpend)
    const adOverage = round2(Math.max(0, adSpend - weeklyAdBudget))

    const isPending = utr === '_PENDING_'

    cycles.push({
      id:                   `cyc-${restaurantId}-${isPending ? 'pending' : utr}`,
      restaurant_id:        restaurantId,
      cycle_label:          cycleStart && cycleEnd
                              ? makeCycleLabel(cycleStart, cycleEnd)
                              : meta?.period ?? 'Uploaded Report',
      cycle_start:          cycleStart ? toISODate(cycleStart) : '',
      cycle_end:            cycleEnd   ? toISODate(cycleEnd)   : '',
      payout_date:          payoutDate ? toISODate(payoutDate) : '',
      orders:               delivered.length,
      gross_sales:          grossSales,
      zomato_discount:      0,
      restaurant_discount:  restDiscount,
      commissionable_value: commissionable,
      commission_charged:   serviceFee,
      gst_on_commission:    gstOnPlatform,
      other_deductions:     round2(paymentFee + tdsTotal + gst95Total + otherDedTotal),
      ad_spend_actual:      adSpend,
      ad_spend_agreed:      weeklyAdBudget,
      ad_spend_overage:     adOverage,
      net_payout_expected:  0,
      net_payout_actual:    netPayout,
      discrepancy:          0,
      utr_number:           isPending ? '' : utr,
      status:               isPending ? 'PENDING' : 'PAID',
      raw_file_name:        fileName,
      uploaded_at:          new Date().toISOString(),
    })
  }

  cycles.sort((a, b) => (b.cycle_start ?? '').localeCompare(a.cycle_start ?? ''))

  return cycles
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function parsePayoutReport(
  file: File,
  restaurantId: string,
  weeklyAdBudget = 0,
): Promise<ParsedReport> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext !== 'xlsx' && ext !== 'xls') {
    throw new Error(
      'Please upload an Excel (.xlsx) file. Zomato Settlement Reports are exported as Excel files from Finance → Payouts → Get Report.'
    )
  }

  const wb = XLSX.read(
    new Uint8Array(await file.arrayBuffer()),
    { type: 'array', cellDates: true },
  )

  if (!wb.SheetNames.includes('Order Level')) {
    throw new Error(
      `This doesn't look like a Zomato Settlement Report — expected a sheet named "Order Level" but found: ${wb.SheetNames.join(', ')}.`
    )
  }

  const warnings: string[] = []
  const meta       = parseHSummary(wb)
  const orders     = parseOrderLevel(wb, warnings)
  const adsEntries = parseAdsDeductions(wb)

  const totalOrders    = orders.length
  const deliveredCount = orders.filter(o => o.order_status === 'DELIVERED').length
  const pendingCount   = orders.filter(o => o.settlement_status !== 'settled').length

  if (totalOrders === 0) {
    warnings.push('No order data found. Verify the file is a complete Zomato Settlement Report.')
    return {
      cycles: [], rawRows: [], detectedColumns: [], warnings,
      meta: meta ? { res_name: meta.res_name, res_id: meta.res_id, period: meta.period, legal_entity: meta.legal_entity } : undefined,
    }
  }

  if (pendingCount > 0) {
    warnings.push(`${pendingCount} order(s) are still unsettled — their payout is pending.`)
  }
  if (adsEntries.length === 0) {
    warnings.push('No ADS deductions found. Ad spend will show as ₹0 for all cycles.')
  }

  const cycles = buildCycles(orders, adsEntries, restaurantId, weeklyAdBudget, meta, file.name)

  return {
    cycles,
    rawRows: [],
    detectedColumns: [
      'Order ID', 'Order Date', 'Order Status', 'Net Order Value',
      'Commissionable Value', 'Service Fee', 'GST on Platform Fee',
      'Order Payout', 'Bank UTR',
    ],
    warnings,
    meta: {
      res_name:         meta?.res_name,
      res_id:           meta?.res_id,
      period:           meta?.period,
      legal_entity:     meta?.legal_entity,
      total_orders:     totalOrders,
      delivered_orders: deliveredCount,
    },
  }
}
