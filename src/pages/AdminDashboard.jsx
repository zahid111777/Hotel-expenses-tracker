import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import './AdminDashboard.css'

const emptyForm = { name: '', username: '', password: '' }

export default function AdminDashboard({ onViewUser }) {
  const { currentUser, logout, getAllUsers, createUser, deleteUser, getUserExpenseCount } = useAuth()
  const [users, setUsers] = useState([])
  const [expenseCounts, setExpenseCounts] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  const refreshUsers = async () => {
    const data = await getAllUsers()
    setUsers(data)
  }

  // Load users from Firestore on mount
  useEffect(() => {
    refreshUsers()
  }, [])

  // Load expense counts from Firestore for all users
  useEffect(() => {
    const loadCounts = async () => {
      const counts = {}
      await Promise.all(
        users.map(async (u) => {
          counts[u.id] = await getUserExpenseCount(u.id)
        })
      )
      setExpenseCounts(counts)
    }
    loadCounts()
  }, [users])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    if (form.password.length < 4) {
      setFormError('Password must be at least 4 characters')
      return
    }
    const result = await createUser(form)
    if (!result.success) {
      setFormError(result.error)
      return
    }
    setForm(emptyForm)
    setShowForm(false)
    setSuccessMsg(`User "${result.user.name}" created successfully!`)
    await refreshUsers()
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleDelete = async () => {
    await deleteUser(confirmDeleteId)
    setConfirmDeleteId(null)
    await refreshUsers()
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <span className="admin-hotel-icon">🏨</span>
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-sub">Welcome, {currentUser.name}</p>
          </div>
        </div>
        <div className="admin-header-actions">
          <button
            className="btn-new-user"
            onClick={() => { setShowForm(true); setFormError('') }}
          >
            + New User
          </button>
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && <div className="success-banner">✅ {successMsg}</div>}

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-label">Total Users</p>
            <p className="stat-value">{users.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📋</span>
          <div>
            <p className="stat-label">Total Records</p>
            <p className="stat-value">
              {Object.values(expenseCounts).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <h2>Users</h2>
        </div>
        {users.length === 0 ? (
          <div className="admin-empty">
            <p>👤 No users yet. Create the first user to get started.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Name</th>
                <th>Username</th>
                <th>Records</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id}>
                  <td className="td-sr">{i + 1}</td>
                  <td className="td-name">{user.name}</td>
                  <td className="td-username">@{user.username}</td>
                  <td className="td-count">
                    <span className="record-badge">
                      {expenseCounts[user.id] ?? '...'} records
                    </span>
                  </td>
                  <td className="td-date">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="td-actions">
                    <button className="btn-view" onClick={() => onViewUser(user)}>
                      📊 View Records
                    </button>
                    <button
                      className="btn-del"
                      onClick={() => setConfirmDeleteId(user.id)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Create New User</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="user-form">
              <div className="user-field">
                <label>Full Name <span className="req">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="user-input"
                />
              </div>
              <div className="user-field">
                <label>Username <span className="req">*</span></label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value.trim().toLowerCase() })
                  }
                  placeholder="e.g. rahul123"
                  required
                  className="user-input"
                />
              </div>
              <div className="user-field">
                <label>Password <span className="req">*</span></label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 4 characters"
                  required
                  className="user-input"
                />
              </div>
              {formError && <div className="form-error">⚠️ {formError}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-create">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3>Delete this user?</h3>
            <p>All their expense records will also be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </button>
              <button className="btn-del-confirm" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
