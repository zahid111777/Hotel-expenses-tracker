import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import ExpenseTracker from './components/ExpenseTracker'
import './App.css'

function AppContent() {
  const { currentUser } = useAuth()
  const [viewingUser, setViewingUser] = useState(null)

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
