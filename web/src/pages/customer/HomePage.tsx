import { Link } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { salons, serviceCategories, specialOffers, staff } from '../../lib/mockData'

export function CustomerHomePage() {
  const { user } = useAuth()
  const name = user?.fullName ?? 'Guest'

  return (
    <>
      <header className="may5-header-mobile">
        <div className="may5-header-row">
          <Menu size={22} />
          <h1>Home</h1>
          <span aria-hidden="true" />
        </div>
        <p style={{ margin: '12px 0 0', fontSize: '1.25rem', fontWeight: 600 }}>
          Hello, {name.split(' ')[0]} {name.split(' ')[1] ?? ''}
        </p>
        <p style={{ margin: 4, opacity: 0.9, fontSize: '0.875rem' }}>
          {user?.locationLabel ?? 'Bengaluru, 28°C'}
        </p>
      </header>

      <div className="may5-page-pad">
        <div className="may5-search">
          <Search size={18} color="#82796A" />
          <input placeholder="Search..." readOnly onFocus={() => { window.location.href = '/customer/explore' }} />
        </div>

        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>My Master</h2>
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, marginTop: 12 }}>
            {staff.map((s) => (
              <div key={s.id} style={{ minWidth: 120, textAlign: 'center' }}>
                <img
                  src={s.avatarUrl}
                  alt=""
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
                />
                <p style={{ margin: '8px 0 4px', fontWeight: 600, fontSize: '0.85rem' }}>{s.fullName}</p>
                <Link to={`/salon/${s.salonId}`} className="may5-btn may5-btn-secondary" style={{ minHeight: 32, padding: '0 12px', fontSize: '0.7rem' }}>
                  BOOK NOW
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '1.1rem' }}>Top Services</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {serviceCategories.map((c) => (
              <Link
                key={c.id}
                to="/customer/explore"
                className="may5-card"
                style={{ padding: 16, textAlign: 'center' }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✂</div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Special Offers</h2>
            <Link to="/customer/explore" style={{ color: 'var(--may5-terracotta)', fontWeight: 600 }}>
              See All
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', marginTop: 12 }}>
            {specialOffers.map((o) => (
              <div key={o.id} className="may5-card" style={{ minWidth: 200, overflow: 'hidden' }}>
                <img src={o.image} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                <p style={{ padding: '8px 12px', margin: 0, fontWeight: 600 }}>{o.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '1.1rem' }}>Near you</h2>
          {salons.slice(0, 2).map((salon) => (
            <Link key={salon.id} to={`/salon/${salon.id}`} className="may5-card" style={{ display: 'block', marginTop: 12, overflow: 'hidden' }}>
              <img src={salon.coverImage} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
              <div style={{ padding: 12 }}>
                {salon.promo && <span className="may5-tag">{salon.promo}</span>}
                <h3 style={{ margin: '8px 0 4px' }}>{salon.name}</h3>
                <p style={{ margin: 0, color: 'var(--may5-muted)', fontSize: '0.85rem' }}>
                  {salon.address} · ★ {salon.rating}
                </p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </>
  )
}
