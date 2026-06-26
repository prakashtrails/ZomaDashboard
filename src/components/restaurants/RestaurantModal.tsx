import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { Restaurant } from '../../types'

interface Props {
  restaurant: Restaurant | null
  onSave: (fields: Omit<Restaurant, 'id' | 'consultant_id' | 'created_at'>) => void | Promise<void>
  onDelete?: () => void | Promise<void>
  onClose: () => void
  error?: string
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '7px',
  color: 'var(--color-text)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '5px',
}

export default function RestaurantModal({ restaurant, onSave, onDelete, onClose, error }: Props) {
  const [name, setName] = useState(restaurant?.name ?? 'My Restaurant')
  const [outletId, setOutletId] = useState(restaurant?.zomato_outlet_id ?? '10000001')
  const [city, setCity] = useState(restaurant?.city ?? 'Bengaluru')
  const [commission, setCommission] = useState(String(restaurant?.commission_pct ?? 20))
  const [gst, setGst] = useState(String(restaurant?.gst_on_commission_pct ?? 18))
  const [discountSharing, setDiscountSharing] = useState(String(restaurant?.discount_sharing_pct ?? 50))
  const [adBudget, setAdBudget] = useState(String(restaurant?.monthly_ad_budget ?? 5000))
  const [adBudgetGst, setAdBudgetGst] = useState(restaurant?.ad_budget_includes_gst ?? false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const valid = name.trim().length > 0 && outletId.trim().length > 0

  const handleSave = () => {
    if (!valid) return
    onSave({
      name: name.trim(),
      zomato_outlet_id: outletId.trim(),
      city: city.trim(),
      commission_pct: parseFloat(commission) || 20,
      gst_on_commission_pct: parseFloat(gst) || 18,
      discount_sharing_pct: parseFloat(discountSharing) || 0,
      monthly_ad_budget: parseFloat(adBudget) || 0,
      ad_budget_includes_gst: adBudgetGst,
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '24px', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>
            {restaurant ? 'Edit Restaurant' : 'Add Restaurant'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span style={label}>Restaurant Name *</span>
            <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rustic – Vaishali Nagar" autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <span style={label}>Zomato Outlet ID *</span>
              <input style={input} value={outletId} onChange={e => setOutletId(e.target.value)} placeholder="e.g. 20942025" />
            </div>
            <div>
              <span style={label}>City</span>
              <input style={input} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Jaipur" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <span style={label}>Commission %</span>
              <input style={input} type="number" min="0" max="100" step="0.5" value={commission} onChange={e => setCommission(e.target.value)} />
            </div>
            <div>
              <span style={label}>GST on Commission %</span>
              <input style={input} type="number" min="0" max="100" step="0.5" value={gst} onChange={e => setGst(e.target.value)} />
            </div>
            <div>
              <span style={label}>Discount Sharing %</span>
              <input style={input} type="number" min="0" max="100" step="5" value={discountSharing} onChange={e => setDiscountSharing(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <span style={label}>Weekly Ad Budget (₹)</span>
              <input style={input} type="number" min="0" step="500" value={adBudget} onChange={e => setAdBudget(e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-muted-2)', paddingBottom: '9px', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={adBudgetGst} onChange={e => setAdBudgetGst(e.target.checked)} />
              Incl. GST
            </label>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(226,55,68,0.08)', border: '1px solid rgba(226,55,68,0.28)', borderRadius: '7px', fontSize: '12.5px', color: 'var(--color-accent)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '26px' }}>
          {onDelete ? (
            !confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} /> Delete restaurant
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-accent)' }}>Delete all data?</span>
                <button onClick={onDelete} style={{ padding: '5px 12px', background: 'var(--color-accent)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  Confirm
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '12px' }}>
                  Cancel
                </button>
              </div>
            )
          ) : <div />}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 18px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '7px', color: 'var(--color-text)', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!valid}
              style={{ padding: '8px 18px', background: 'var(--color-accent)', border: 'none', borderRadius: '7px', color: '#fff', cursor: valid ? 'pointer' : 'default', fontSize: '13px', fontWeight: 600, opacity: valid ? 1 : 0.45 }}
            >
              {restaurant ? 'Save Changes' : 'Add Restaurant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
