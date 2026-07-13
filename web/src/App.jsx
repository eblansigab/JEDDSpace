import { AuthProvider } from './services/authContext'
import { PermissionProvider } from './contexts/PermissionContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <AppRoutes />
      </PermissionProvider>
    </AuthProvider>
  )
}

export default App