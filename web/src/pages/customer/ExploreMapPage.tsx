import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePublicCatalog } from '../../lib/usePublicCatalog'

export function ExploreMapPage() {
  const { salons } = usePublicCatalog()
  return (
    <>
      <header className="may5-header-mobile">
        <div className="may5-header-row">
          <Link to="/customer/explore" style={{ color: '#fff' }}>
            <ArrowLeft />
          </Link>
          <h1>Map</h1>
          <span />
        </div>
      </header>
      <div
        className="may5-page-pad"
        style={{
          minHeight: '70vh',
          background: `linear-gradient(180deg, #e8dcc8 0%, #d4c4aa 100%)`,
          position: 'relative',
        }}
      >
        {salons.map((s, i) => (
          <div
            key={s.id}
            title={s.name}
            style={{
              position: 'absolute',
              left: `${20 + i * 25}%`,
              top: `${30 + i * 12}%`,
              width: 24,
              height: 24,
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              background: i === 1 ? '#402310' : '#c67139',
              border: '2px solid #fff',
            }}
          />
        ))}
        <p style={{ position: 'absolute', bottom: 100, left: 16, right: 16, color: 'var(--may5-deep)' }}>
          MapLibre map from APK — web preview uses pin layout matching mobile map view.
        </p>
      </div>
    </>
  )
}
