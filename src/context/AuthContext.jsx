import { createContext, useContext, useState } from 'react'
import { db } from '../firebase'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'

const USERS_KEY = 'hotel_auth_users'
const SESSION_KEY = 'hotel_auth_session'

const DEFAULT_ADMIN = {
  id: 'admin',
  username: 'admin',
  password: 'admin123',
  name: 'Administrator',
  role: 'admin',
  createdAt: new Date().toISOString(),
}

function loadUsers() {
  try {
    const stored = localStorage.getItem(USERS_KEY)
    const users = stored ? JSON.parse(stored) : []
    if (!users.find((u) => u.id === 'admin')) {
      users.unshift(DEFAULT_ADMIN)
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
    }
    return users
  } catch {
    return [DEFAULT_ADMIN]
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY)
      return s ? JSON.parse(s) : null
    } catch {
      return null
    }
  })

  const login = (username, password) => {
    const users = loadUsers()
    const user = users.find(
      (u) => u.username === username && u.password === password
    )
    if (!user) return { success: false, error: 'Invalid username or password' }
    const session = { id: user.id, username: user.username, name: user.name, role: user.role }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setCurrentUser(session)
    return { success: true }
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
  }

  const getAllUsers = () => loadUsers().filter((u) => u.role !== 'admin')

  const createUser = ({ username, password, name }) => {
    const users = loadUsers()
    if (users.find((u) => u.username === username)) {
      return { success: false, error: 'Username already exists' }
    }
    const newUser = {
      id: `user_${Date.now()}`,
      username,
      password,
      name,
      role: 'user',
      createdAt: new Date().toISOString(),
    }
    users.push(newUser)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return { success: true, user: newUser }
  }

  const deleteUser = async (userId) => {
    const users = loadUsers().filter((u) => u.id !== userId)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    // Also delete all Firestore expenses for this user
    const q = query(collection(db, 'expenses'), where('userId', '==', userId))
    const snap = await getDocs(q)
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'expenses', d.id))))
  }

  const getUserExpenseCount = async (userId) => {
    try {
      const q = query(collection(db, 'expenses'), where('userId', '==', userId))
      const snap = await getDocs(q)
      return snap.size
    } catch {
      return 0
    }
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        getAllUsers,
        createUser,
        deleteUser,
        getUserExpenseCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
