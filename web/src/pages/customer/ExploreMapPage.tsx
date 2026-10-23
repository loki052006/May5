import { Navigate } from 'react-router-dom'

export function ExploreMapPage() {
  return <Navigate to="/customer/explore?view=map" replace />
}
