import { createContext, useContext, useState, useEffect } from 'react'
import { db, withTimeout } from '../firebase'
import {
  collection, query, where, getDocs,
  addDoc, setDoc, deleteDoc, doc,
} from 'firebase/firestore'

const SESSION_KEY = 'hotel_auth_session'

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
  const [appReady, setAppReady] = useState(true)

  // Seed default admin to Firestore in the background (non-blocking)
  useEffect(() => {
    const seedAdmin = async () => {
      try {
        const snap = await withTimeout(getDocs(
          query(collection(db, 'users'), where('username', '==', 'admin'))
        ))
        if (snap.empty) {
          await withTimeout(setDoc(doc(db, 'users', 'admin'), {
            username: 'admin',
            password: 'admin123',
            name: 'Administrator',
            role: 'admin',
            createdAt: new Date().toISOString(),
          }))
        }
      } catch {
        // seed failed silently - login will handle it
      }
    }
    seedAdmin()
  }, [])

  const login = async (username, password) => {
    try {
      // If logging in as admin and not found, seed first
      if (username === 'admin') {
        const adminSnap = await withTimeout(getDocs(
          query(collection(db, 'users'), where('username', '==', 'admin'))
        ))
        if (adminSnap.empty) {
          await withTimeout(setDoc(doc(db, 'users', 'admin'), {
            username: 'admin',
            password: 'admin123',
            name: 'Administrator',
            role: 'admin',
            createdAt: new Date().toISOString(),
          }))
        }
      }
      const q = query(collection(db, 'users'), where('username', '==', username))
      const snap = await withTimeout(getDocs(q))
      if (snap.empty) return { success: false, error: 'Invalid username or password' }
      const userDoc = snap.docs[0]
      const userData = userDoc.data()
      if (userData.password !== password) return { success: false, error: 'Invalid username or password' }
      const session = { id: userDoc.id, username: userData.username, name: userData.name, role: userData.role }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setCurrentUser(session)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Connection error. Please try again.' }
    }
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
  }

  const getAllUsers = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'user'))
    const snap = await withTimeout(getDocs(q))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  const createUser = async ({ username, password, name }) => {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username))
      const snap = await withTimeout(getDocs(q))
      if (!snap.empty) return { success: false, error: 'Username already exists' }
      const newUser = {
        username,
        password,
        name,
        role: 'user',
        createdAt: new Date().toISOString(),
      }
      const docRef = await withTimeout(addDoc(collection(db, 'users'), newUser))
      return { success: true, user: { id: docRef.id, ...newUser } }
    } catch {
      return { success: false, error: 'Failed to create user. Please try again.' }
    }
  }

  const deleteUser = async (userId) => {
    await withTimeout(deleteDoc(doc(db, 'users', userId)))
    const q = query(collection(db, 'expenses'), where('userId', '==', userId))
    const snap = await withTimeout(getDocs(q))
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'expenses', d.id))))
  }

  const getUserExpenseCount = async (userId) => {
    try {
      const q = query(collection(db, 'expenses'), where('userId', '==', userId))
      const snap = await withTimeout(getDocs(q))
      return snap.size
    } catch {
      return 0
    }
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, appReady, login, logout, getAllUsers, createUser, deleteUser, getUserExpenseCount }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
