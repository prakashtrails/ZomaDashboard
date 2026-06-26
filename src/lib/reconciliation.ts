import type { PayoutCycle, Restaurant, ReconciliationResult, ReconciliationDetail } from '../types'

/**
 * Core reconciliation math (from transcript):
 *
 * Selling Price (e.g. ₹500)
 *  - Zomato discount (e.g. ₹100) → platform's cut, restaurant not liable
 *  - Restaurant discount (if any, funded by restaurant)
 * = Commissionable Value (₹400)
 *  - Commission % (e.g. 20%) = ₹80
 *  - GST on commission (18% of ₹80) = ₹14.4
 * = Net Payout to restaurant (₹400 - ₹80 - ₹14.4 = ₹305.6)
 *
 * Ad spend: if actual > agreed budget, overage should be refunded by Zomato.
 */

export function computeExpectedPayout(
  commissionableValue: number,
  commissionPct: number,
  gstPct: number,
  restaurantDiscount: number,
  adSpendAgreed: number,
  adSpendActual: number,
  adBudgetIncludesGst: boolean,
  gstRate = 18
): {
  commissionAmount: number
  gstOnCommission: number
  adOverage: number
  adOverageGst: number
  expectedPayout: number
} {
  const commissionAmount = (commissionableValue * commissionPct) / 100
  const gstOnCommission = (commissionAmount * gstPct) / 100

  // Ad spend overage refund due from Zomato
  // effectiveBudget calc preserved for future GST validation
  // const effectiveBudget = adBudgetIncludesGst
    ? adSpendAgreed
    : adSpendAgreed * (1 + gstRate / 100)

  const adOverageRaw = Math.max(0, adSpendActual - adSpendAgreed)
  const adOverageGst = adBudgetIncludesGst ? 0 : (adOverageRaw * gstRate) / 100
  const adOverage = adOverageRaw + adOverageGst

  const expectedPayout =
    commissionableValue -
    restaurantDiscount -
    commissionAmount -
    gstOnCommission +
    adOverage // overage refunded back, increasing net payout

  return {
    commissionAmount,
    gstOnCommission,
    adOverage,
    adOverageGst,
    expectedPayout,
  }
}

export function reconcileCycle(
  cycle: PayoutCycle,
  restaurant: Restaurant
): ReconciliationResult {
  const { commissionAmount, gstOnCommission, adOverage, expectedPayout } =
    computeExpectedPayout(
      cycle.commissionable_value,
      restaurant.commission_pct,
      restaurant.gst_on_commission_pct,
      cycle.restaurant_discount,
      cycle.ad_spend_agreed,
      cycle.ad_spend_actual,
      restaurant.ad_budget_includes_gst
    )

  const discrepancy = expectedPayout - cycle.net_payout_actual
  const discrepancyPct =
    expectedPayout !== 0 ? (discrepancy / expectedPayout) * 100 : 0

  const details: ReconciliationDetail[] = [
    {
      label: 'Commissionable Value',
      expected: cycle.commissionable_value,
      actual: cycle.commissionable_value, // this is what Zomato reports
      diff: 0,
      ok: true,
    },
    {
      label: 'Commission Charged',
      expected: commissionAmount,
      actual: cycle.commission_charged,
      diff: cycle.commission_charged - commissionAmount,
      ok: Math.abs(cycle.commission_charged - commissionAmount) < 1,
    },
    {
      label: 'GST on Commission',
      expected: gstOnCommission,
      actual: cycle.gst_on_commission,
      diff: cycle.gst_on_commission - gstOnCommission,
      ok: Math.abs(cycle.gst_on_commission - gstOnCommission) < 1,
    },
    {
      label: 'Ad Spend Overage Refund',
      expected: adOverage,
      actual: cycle.ad_spend_overage,
      diff: cycle.ad_spend_overage - adOverage,
      ok: Math.abs(cycle.ad_spend_overage - adOverage) < 1,
    },
    {
      label: 'Net Payout',
      expected: expectedPayout,
      actual: cycle.net_payout_actual,
      diff: cycle.net_payout_actual - expectedPayout,
      ok: Math.abs(discrepancy) < 10, // tolerance ₹10
    },
  ]

  return {
    cycleId: cycle.id,
    cycleLabel: cycle.cycle_label,
    expectedPayout,
    actualPayout: cycle.net_payout_actual,
    discrepancy,
    discrepancyPct,
    adOverage,
    flagged: Math.abs(discrepancy) >= 10,
    details,
  }
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatINRCompact(amount: number): string {
  if (Math.abs(amount) >= 100000)
    return `₹${(amount / 100000).toFixed(2)}L`
  if (Math.abs(amount) >= 1000)
    return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toFixed(0)}`
}
