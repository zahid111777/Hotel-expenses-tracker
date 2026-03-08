import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import ExpenseTracker from './components/ExpenseTracker'
import './App.css'

function AppContent() {
  const { currentUser, appReady } = useAuth()
  const [viewingUser, setViewingUser] = useState(null)

  if (!appReady) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', color: '#94a3b8' }}>
        <div style={{ width: '44px', height: '44px', border: '4px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <p>Connecting to database...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!currentUser) return <Login />

  if (currentUser.role === 'admin') {
    if (viewingUser) {
      return (
        <ExpenseTracker
          userId={viewingUser.id}
          userName={viewingUser.name}
          onBack={() => setViewingUser(null)}
          isAdminView
        />
      )
    }
    return <AdminDashboard onViewUser={setViewingUser} />
  }

  return <ExpenseTracker userId={currentUser.id} userName={currentUser.name} />
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <AppContent />
      </div>
    </AuthProvider>
  )
}
