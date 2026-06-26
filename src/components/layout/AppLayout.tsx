import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Receipt, TrendingUp, Megaphone,
  Star, ChevronDown, LogOut, Menu, X, Building2, Upload, Pencil, Plus, Store
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRestaurantStore } from '../../hooks/useRestaurantStore'
import RestaurantModal from '../restaurants/RestaurantModal'
import type { Restaurant } from '../../types'

const NAV_ITEMS = [
  { path: '/',         icon: LayoutDashboard, label: 'Overview' },
  { path: '/payouts',  icon: Receipt,         label: 'Payouts' },
  { path: '/trends',   icon: TrendingUp,      label: 'Trend Analysis' },
  { path: '/ads',      icon: Megaphone,       label: 'Ad Performance' },
  { path: '/reviews',  icon: Star,            label: 'Reviews' },
]

const UPLOAD_NAV = { path: '/upload', icon: Upload, label: 'Upload Reports' }

type ModalState = { mode: 'add' } | { mode: 'edit'; restaurant: Restaurant }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const {
    restaurants, selectedRestaurant, storeLoading,
    setSelectedRestaurant, addRestaurant, updateRestaurant, deleteRestaurant,
  } = useRestaurantStore()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [restaurantOpen, setRestaurantOpen] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  // ── Store loading screen ───────────────────────────────────────────────────
  if (storeLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px',
          background: 'linear-gradient(135deg, #e23744, #b91c2c)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '16px', color: '#fff',
          boxShadow: '0 2px 10px rgba(226,55,68,0.4)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>Z</div>
        <div style={{ color: 'var(--color-muted)', fontSize: '13px' }}>Loading your restaurants…</div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    )
  }

  // ── No restaurants yet — prompt to add the first one ──────────────────────
  if (restaurants.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px', padding: '24px' }}>
          <div style={{
            width: '56px', height: '56px', margin: '0 auto 20px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-card)',
          }}>
            <Store size={24} color="var(--color-muted)" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Add your first restaurant</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
            Set up an outlet profile to start uploading payout reports and tracking reconciliation.
          </p>
          <button
            onClick={() => setModal({ mode: 'add' })}
            style={{
              padding: '10px 24px',
              background: 'var(--color-accent)',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(226,55,68,0.35)',
            }}
          >
            + Add restaurant
          </button>
          <button
            onClick={signOut}
            style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '12px', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
        {modal && (
          <RestaurantModal
            restaurant={null}
            onSave={async (fields) => {
              const newR = await addRestaurant(fields)
              setSelectedRestaurant(newR)
              setModal(null)
            }}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    )
  }

  // ── Async modal save ───────────────────────────────────────────────────────
  const handleModalSave = async (fields: Omit<Restaurant, 'id' | 'consultant_id' | 'created_at'>) => {
    setModalError(null)
    try {
      if (modal?.mode === 'add') {
        const newR = await addRestaurant(fields)
        setSelectedRestaurant(newR)
      } else if (modal?.mode === 'edit') {
        await updateRestaurant({ ...modal.restaurant, ...fields })
      }
      setModal(null)
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleModalDelete = async () => {
    if (modal?.mode !== 'edit') return
    try {
      await deleteRestaurant(modal.restaurant.id)
      setModal(null)
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  // ── Nav link ───────────────────────────────────────────────────────────────
  const NavLink = ({ item, active }: { item: typeof NAV_ITEMS[0]; active: boolean }) => (
    <Link
      to={item.path}
      onClick={() => setMobileOpen(false)}
      className="nav-item"
      data-active={active ? 'true' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 12px 9px 10px',
        marginBottom: '1px',
        borderRadius: '8px',
        borderLeft: `2px solid ${active ? 'var(--color-accent)' : 'transparent'}`,
        background: active ? 'var(--color-accent-soft)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-muted-2)',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
      }}
    >
      <item.icon size={15} strokeWidth={active ? 2.2 : 1.8} />
      {item.label}
    </Link>
  )

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div style={{
      width: '232px', minWidth: '232px',
      background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, #e23744 0%, #b91c2c 100%)',
            borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '-0.5px',
            boxShadow: '0 2px 10px rgba(226,55,68,0.4), 0 0 20px rgba(226,55,68,0.12)',
            flexShrink: 0,
          }}>Z</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.2px' }}>ZomaDash</div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '3px' }}>Partner Analytics</div>
          </div>
        </div>
      </div>

      {/* Restaurant selector */}
      <div style={{ padding: '12px 10px 8px' }}>
        <button
          onClick={() => setRestaurantOpen(o => !o)}
          style={{
            width: '100%', padding: '9px 10px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px', color: 'var(--color-text)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
          }}
        >
          <Building2 size={13} color="var(--color-muted)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedRestaurant?.name ?? 'Select outlet'}
          </span>
          <ChevronDown size={13} color="var(--color-muted)" style={{ transform: restaurantOpen ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
        </button>

        {restaurantOpen && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px', marginTop: '4px', overflow: 'hidden',
            boxShadow: 'var(--shadow-popover)',
          }}>
            {restaurants.map(r => (
              <div key={r.id} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <button
                  onClick={() => { setSelectedRestaurant(r); setRestaurantOpen(false) }}
                  style={{
                    flex: 1, padding: '9px 12px',
                    background: selectedRestaurant?.id === r.id ? 'var(--color-accent-soft)' : 'transparent',
                    border: 'none',
                    color: selectedRestaurant?.id === r.id ? 'var(--color-accent)' : 'var(--color-text)',
                    cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: '12.5px' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '1px' }}>ID: {r.zomato_outlet_id}</div>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setModalError(null); setModal({ mode: 'edit', restaurant: r }); setRestaurantOpen(false) }}
                  title="Edit"
                  style={{ padding: '0 10px', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center' }}
                >
                  <Pencil size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => { setModalError(null); setModal({ mode: 'add' }); setRestaurantOpen(false) }}
              style={{
                width: '100%', padding: '9px 12px',
                background: 'transparent', border: 'none',
                color: 'var(--color-accent)', cursor: 'pointer', textAlign: 'left',
                fontSize: '12.5px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Plus size={12} /> Add restaurant
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: '4px 10px', flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 12px 6px' }}>
          Analytics
        </div>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.path} item={item} active={location.pathname === item.path} />
        ))}
        <div style={{ margin: '10px 0', borderTop: '1px solid var(--color-border)' }} />
        <NavLink item={UPLOAD_NAV} active={location.pathname === UPLOAD_NAV.path} />
      </nav>

      {/* User */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: 'var(--color-surface-2)' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #e23744, #b91c2c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
            boxShadow: '0 0 0 2px var(--color-surface-2), 0 0 0 3.5px rgba(226,55,68,0.25)',
          }}>
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.email || 'Consultant'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '1px' }}>Consultant</div>
          </div>
          <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px', borderRadius: '4px' }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  )

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ display: 'flex' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: 'var(--shadow-sm)',
      }} className="mobile-header">
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span style={{ fontWeight: 700, letterSpacing: '-0.2px' }}>ZomaDash</span>
      </div>

      <main style={{
        flex: 1, minWidth: 0,
        background: 'var(--color-bg)',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 65% -5%, rgba(96,165,250,0.05) 0%, transparent 100%)',
        overflowY: 'auto',
      }}>
        {children}
      </main>

      {modal && (
        <RestaurantModal
          restaurant={modal.mode === 'edit' ? modal.restaurant : null}
          onSave={handleModalSave}
          onDelete={modal.mode === 'edit' && restaurants.length > 1 ? handleModalDelete : undefined}
          onClose={() => setModal(null)}
          error={modalError ?? undefined}
        />
      )}

      <style>{`
        .desktop-sidebar { display: flex; }
        .mobile-header { display: none; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none; }
          .mobile-header { display: flex; }
          main { padding-top: 56px; }
        }
      `}</style>
    </div>
  )
}
