import { Star } from 'lucide-react'
import { useRestaurantStore } from '../hooks/useRestaurantStore'

export default function ReviewsPage() {
  const { selectedRestaurant: restaurant } = useRestaurantStore()
  if (!restaurant) return null

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Reviews</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>{restaurant.name}</p>
      </div>

      <div style={{
        background: 'var(--color-surface)',
        border: '1px dashed var(--color-border)',
        borderRadius: '12px',
        padding: '64px 24px',
        textAlign: 'center',
      }}>
        <Star size={32} color="var(--color-muted)" style={{ margin: '0 auto 14px' }} />
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Reviews coming soon</div>
        <div style={{ fontSize: '13px', color: 'var(--color-muted)', maxWidth: '360px', margin: '0 auto' }}>
          Review import from Zomato is not yet supported. Once added, ratings and customer feedback will appear here.
        </div>
      </div>
    </div>
  )
}
