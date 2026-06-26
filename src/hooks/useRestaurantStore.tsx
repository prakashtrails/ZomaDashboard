import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Restaurant, PayoutCycle, BusinessMetrics, AdPerformanceEntry } from '../types'

// ─── Interface ────────────────────────────────────────────────────────────────

export interface RestaurantStore {
  restaurants: Restaurant[]
  selectedRestaurant: Restaurant | null
  storeLoading: boolean
  setSelectedRestaurant: (r: Restaurant) => void
  payoutCycles: Record<string, PayoutCycle[]>
  businessMetrics: Record<string, BusinessMetrics[]>
  adPerformance: Record<string, AdPerformanceEntry[]>
  addRestaurant: (fields: Omit<Restaurant, 'id' | 'consultant_id' | 'created_at'>) => Promise<Restaurant>
  updateRestaurant: (r: Restaurant) => Promise<void>
  deleteRestaurant: (id: string) => Promise<void>
  appendPayoutCycles: (restaurantId: string, cycles: Partial<PayoutCycle>[]) => Promise<void>
  appendBusinessMetrics: (restaurantId: string, metrics: BusinessMetrics[]) => Promise<void>
  appendAdPerformance: (restaurantId: string, entries: AdPerformanceEntry[]) => Promise<void>
}

const Ctx = createContext<RestaurantStore | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function RestaurantStoreProvider({ children }: { children: ReactNode }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurantState] = useState<Restaurant | null>(null)
  const [payoutCycles, setPayoutCycles] = useState<Record<string, PayoutCycle[]>>({})
  const [businessMetrics, setBusinessMetrics] = useState<Record<string, BusinessMetrics[]>>({})
  const [adPerformance, setAdPerformance] = useState<Record<string, AdPerformanceEntry[]>>({})
  const [storeLoading, setStoreLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // Get current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        loadRestaurants()
      } else {
        setStoreLoading(false)
      }
    })

    // React to auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        loadRestaurants()
      } else {
        setUserId(null)
        setRestaurants([])
        setSelectedRestaurantState(null)
        setPayoutCycles({})
        setBusinessMetrics({})
        setAdPerformance({})
        setStoreLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Data loaders ───────────────────────────────────────────────────────────

  async function loadRestaurants() {
    setStoreLoading(true)
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      const rests = data as Restaurant[]
      setRestaurants(rests)
      const first = rests[0]
      setSelectedRestaurantState(first)
      await loadDataForRestaurant(first.id)
    } else if (!error) {
      setRestaurants([])
    }
    setStoreLoading(false)
  }

  async function loadDataForRestaurant(id: string) {
    const [cyclesRes, metricsRes, adsRes] = await Promise.all([
      supabase.from('payout_cycles').select('*').eq('restaurant_id', id).order('cycle_start', { ascending: false }),
      supabase.from('business_metrics').select('*').eq('restaurant_id', id).order('week_start', { ascending: false }),
      supabase.from('ad_performance').select('*').eq('restaurant_id', id).order('period_start', { ascending: false }),
    ])

    if (cyclesRes.data)  setPayoutCycles(prev  => ({ ...prev,  [id]: cyclesRes.data  as PayoutCycle[] }))
    if (metricsRes.data) setBusinessMetrics(prev => ({ ...prev, [id]: metricsRes.data as BusinessMetrics[] }))
    if (adsRes.data)     setAdPerformance(prev   => ({ ...prev,  [id]: adsRes.data    as AdPerformanceEntry[] }))
  }

  // ── Restaurant selection ───────────────────────────────────────────────────

  const setSelectedRestaurant = (r: Restaurant) => {
    setSelectedRestaurantState(r)
    // Lazy-load if this restaurant's data isn't in state yet
    if (!payoutCycles[r.id]) {
      loadDataForRestaurant(r.id)
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addRestaurant = async (
    fields: Omit<Restaurant, 'id' | 'consultant_id' | 'created_at'>
  ): Promise<Restaurant> => {
    const uid = userId
    if (!uid) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('restaurants')
      .insert({ ...fields, consultant_id: uid })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to create restaurant')

    const newR = data as Restaurant
    setRestaurants(prev => [...prev, newR])
    setPayoutCycles(prev  => ({ ...prev,  [newR.id]: [] }))
    setBusinessMetrics(prev => ({ ...prev, [newR.id]: [] }))
    setAdPerformance(prev   => ({ ...prev,  [newR.id]: [] }))
    return newR
  }

  const updateRestaurant = async (r: Restaurant): Promise<void> => {
    const { error } = await supabase
      .from('restaurants')
      .update({
        name: r.name,
        zomato_outlet_id: r.zomato_outlet_id,
        city: r.city,
        commission_pct: r.commission_pct,
        gst_on_commission_pct: r.gst_on_commission_pct,
        discount_sharing_pct: r.discount_sharing_pct,
        monthly_ad_budget: r.monthly_ad_budget,
        ad_budget_includes_gst: r.ad_budget_includes_gst,
      })
      .eq('id', r.id)

    if (error) throw new Error(error.message)

    setRestaurants(prev => prev.map(x => x.id === r.id ? r : x))
    if (selectedRestaurant?.id === r.id) setSelectedRestaurantState(r)
  }

  const deleteRestaurant = async (id: string): Promise<void> => {
    const { error } = await supabase.from('restaurants').delete().eq('id', id)
    if (error) throw new Error(error.message)

    const updated = restaurants.filter(r => r.id !== id)
    setRestaurants(updated)
    setPayoutCycles(prev  => { const n = { ...prev  }; delete n[id]; return n })
    setBusinessMetrics(prev => { const n = { ...prev }; delete n[id]; return n })
    setAdPerformance(prev   => { const n = { ...prev  }; delete n[id]; return n })

    if (selectedRestaurant?.id === id) {
      const next = updated[0] ?? null
      setSelectedRestaurantState(next)
      if (next) loadDataForRestaurant(next.id)
    }
  }

  const appendPayoutCycles = async (
    restaurantId: string,
    cycles: Partial<PayoutCycle>[]
  ): Promise<void> => {
    const rows = cycles.map(c => ({ ...c, restaurant_id: restaurantId }))

    const { error } = await supabase
      .from('payout_cycles')
      .upsert(rows as PayoutCycle[], { onConflict: 'id' })

    if (error) throw new Error(error.message)

    // Reload fresh from DB to get server-generated timestamps etc.
    const { data } = await supabase
      .from('payout_cycles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('cycle_start', { ascending: false })

    if (data) setPayoutCycles(prev => ({ ...prev, [restaurantId]: data as PayoutCycle[] }))
  }

  const appendBusinessMetrics = async (
    restaurantId: string,
    metrics: BusinessMetrics[]
  ): Promise<void> => {
    const rows = metrics.map(m => ({ ...m, restaurant_id: restaurantId }))
    const { error } = await supabase
      .from('business_metrics')
      .upsert(rows, { onConflict: 'id' })

    if (error) throw new Error(error.message)

    const { data } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('week_start', { ascending: false })

    if (data) setBusinessMetrics(prev => ({ ...prev, [restaurantId]: data as BusinessMetrics[] }))
  }

  const appendAdPerformance = async (
    restaurantId: string,
    entries: AdPerformanceEntry[]
  ): Promise<void> => {
    const rows = entries.map(e => ({ ...e, restaurant_id: restaurantId }))
    const { error } = await supabase
      .from('ad_performance')
      .upsert(rows, { onConflict: 'id' })

    if (error) throw new Error(error.message)

    const { data } = await supabase
      .from('ad_performance')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('period_start', { ascending: false })

    if (data) setAdPerformance(prev => ({ ...prev, [restaurantId]: data as AdPerformanceEntry[] }))
  }

  // ── Context value ──────────────────────────────────────────────────────────

  return (
    <Ctx.Provider value={{
      restaurants,
      selectedRestaurant,
      storeLoading,
      setSelectedRestaurant,
      payoutCycles,
      businessMetrics,
      adPerformance,
      addRestaurant,
      updateRestaurant,
      deleteRestaurant,
      appendPayoutCycles,
      appendBusinessMetrics,
      appendAdPerformance,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useRestaurantStore(): RestaurantStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useRestaurantStore must be used inside RestaurantStoreProvider')
  return ctx
}
