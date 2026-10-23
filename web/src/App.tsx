import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { AppRoutes } from './routes'
import './styles/may5.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="may5-app">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
