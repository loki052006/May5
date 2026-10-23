import { Link } from 'react-router-dom'

export function StubPage({
  title,
  apkRoute,
  backTo,
}: {
  title: string
  apkRoute: string
  backTo: string
}) {
  return (
    <div className="may5-stub">
      <h2>{title}</h2>
      <p className="may5-stub">APK route: {apkRoute}</p>
      <p>Shell screen — design tokens applied; full module in next phase.</p>
      <Link to={backTo} className="may5-btn may5-btn-secondary">
        Back
      </Link>
    </div>
  )
}
