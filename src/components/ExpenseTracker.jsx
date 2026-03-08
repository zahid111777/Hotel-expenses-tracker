import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, query, where,
  onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import './ExpenseTracker.css'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getDayName(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return DAY_NAMES[date.getDay()]
}

function getTodayStr() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

const emptyForm = {
  date: getTodayStr(),
  breakfast: '',
  breakfastDesc: '',
  lunch: '',
  lunchDesc: '',
  dinner: '',
  dinnerDesc: '',
}

export default function ExpenseTracker({ userId, userName, onBack, isAdminView }) {
  const { logout } = useAuth()

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [firestoreError, setFirestoreError] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmDeleteMonth, setConfirmDeleteMonth] = useState(null)

  useEffect(() => {
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', userId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => a.date.localeCompare(b.date))
      setExpenses(data)
      setLoading(false)
    }, () => {
      setFirestoreError(true)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [userId])

  const getTotal = (b, l, d) => {
    const bf = parseFloat(b) || 0
    const lf = parseFloat(l) || 0
    const df = parseFloat(d) || 0
    return bf + lf + df
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddNew = () => {
    setForm({ ...emptyForm, date: getTodayStr() })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (expense) => {
    setForm({
      date: expense.date,
      breakfast: expense.breakfast,
      breakfastDesc: expense.breakfastDesc || '',
      lunch: expense.lunch,
      lunchDesc: expense.lunchDesc || '',
      dinner: expense.dinner,
      dinnerDesc: expense.dinnerDesc || '',
    })
    setEditingId(expense.id)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.date) return

    const data = {
      userId,
      date: form.date,
      breakfast: form.breakfast,
      breakfastDesc: form.breakfastDesc,
      lunch: form.lunch,
      lunchDesc: form.lunchDesc,
      dinner: form.dinner,
      dinnerDesc: form.dinnerDesc,
    }

    if (editingId !== null) {
      await updateDoc(doc(db, 'expenses', editingId), data)
    } else {
      await addDoc(collection(db, 'expenses'), data)
    }

    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDeleteConfirm = (id) => {
    setConfirmDeleteId(id)
  }

  const handleDeleteCancel = () => {
    setConfirmDeleteId(null)
  }

  const handleDelete = async () => {
    await deleteDoc(doc(db, 'expenses', confirmDeleteId))
    setConfirmDeleteId(null)
  }

  const handleDeleteMonth = async () => {
    const toDelete = expenses.filter((exp) => exp.date.startsWith(confirmDeleteMonth))
    await Promise.all(toDelete.map((exp) => deleteDoc(doc(db, 'expenses', exp.id))))
    setConfirmDeleteMonth(null)
    setFilterMonth('')
  }

  // Filter expenses by selected month
  const filteredExpenses = filterMonth
    ? expenses.filter((exp) => exp.date.startsWith(filterMonth))
    : expenses

  const grandTotal = filteredExpenses.reduce(
    (acc, exp) => acc + getTotal(exp.breakfast, exp.lunch, exp.dinner),
    0
  )

  const breakfastTotal = filteredExpenses.reduce((acc, exp) => acc + (parseFloat(exp.breakfast) || 0), 0)
  const lunchTotal = filteredExpenses.reduce((acc, exp) => acc + (parseFloat(exp.lunch) || 0), 0)
  const dinnerTotal = filteredExpenses.reduce((acc, exp) => acc + (parseFloat(exp.dinner) || 0), 0)

  // Get unique months for filter dropdown
  const months = [...new Set(expenses.map((exp) => exp.date.substring(0, 7)))].sort().reverse()

  // A month is "past" if it's not the current month
  const currentMonthStr = getTodayStr().substring(0, 7)
  const isFilteredMonthPast = filterMonth && filterMonth < currentMonthStr

  const handleDownloadPDF = () => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text('Hotel Expense Receipt', 14, 22)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Name: ${userName}`, 14, 32)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 38)

    if (filterMonth) {
      const [y, mo] = filterMonth.split('-')
      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
      doc.text(`Period: ${label}`, 14, 44)
    } else {
      doc.text('Period: All Records', 14, 44)
    }

    const tableRows = filteredExpenses.map((exp, i) => [
      i + 1,
      formatDate(exp.date),
      getDayName(exp.date),
      exp.breakfast
        ? `Rs.${parseFloat(exp.breakfast).toFixed(2)}${exp.breakfastDesc ? '\n' + exp.breakfastDesc : ''}`
        : '-',
      exp.lunch
        ? `Rs.${parseFloat(exp.lunch).toFixed(2)}${exp.lunchDesc ? '\n' + exp.lunchDesc : ''}`
        : '-',
      exp.dinner
        ? `Rs.${parseFloat(exp.dinner).toFixed(2)}${exp.dinnerDesc ? '\n' + exp.dinnerDesc : ''}`
        : '-',
      `Rs.${getTotal(exp.breakfast, exp.lunch, exp.dinner).toFixed(2)}`,
    ])

    autoTable(doc, {
      head: [['Sr.', 'Date', 'Day', 'Breakfast', 'Lunch', 'Dinner', 'Total']],
      body: tableRows,
      foot: [[
        { content: `Total (${filteredExpenses.length} days)`, colSpan: 3, styles: { halign: 'right' } },
        `Rs.${breakfastTotal.toFixed(2)}`,
        `Rs.${lunchTotal.toFixed(2)}`,
        `Rs.${dinnerTotal.toFixed(2)}`,
        `Rs.${grandTotal.toFixed(2)}`,
      ]],
      startY: 50,
      showFoot: 'lastPage',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })

    const filename = `receipt-${userName.replace(/\s+/g, '-')}-${filterMonth || 'all'}.pdf`
    doc.save(filename)
  }

  if (loading) {
    return (
      <div className="tracker-loading">
        <div className="tracker-spinner"></div>
        <p>Loading expenses...</p>
      </div>
    )
  }

  if (firestoreError) {
    return (
      <div className="tracker-loading">
        <div style={{ fontSize: '2.5rem' }}>⚠️</div>
        <p style={{ color: '#f87171' }}>Failed to connect to database.</p>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Check your internet connection and try refreshing.</p>
      </div>
    )
  }

  return (
    <div className="tracker-container">
      {/* Header */}
      <div className="tracker-header">
        <div className="header-left">
          {onBack && (
            <button className="btn-back" onClick={onBack}>← Back</button>
          )}
          <div className="hotel-icon">🏨</div>
          <div>
            <h1 className="tracker-title">Hotel Expense Tracker</h1>
            <p className="tracker-subtitle">{userName}'s Records</p>
          </div>
        </div>
        <div className="tracker-header-actions">
          <button className="btn-add" onClick={handleAddNew}>
            + Add Today's Expense
          </button>
          {filteredExpenses.length > 0 && (
            <button className="btn-download-pdf" onClick={handleDownloadPDF}>
              📄 Download PDF
            </button>
          )}
          {!isAdminView && (
            <button className="btn-logout-tracker" onClick={logout}>Logout</button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card breakfast-card">
          <div className="card-icon">☕</div>
          <div className="card-info">
            <span className="card-label">Breakfast</span>
            <span className="card-value">₨{breakfastTotal.toFixed(2)}</span>
          </div>
        </div>
        <div className="summary-card lunch-card">
          <div className="card-icon">🍱</div>
          <div className="card-info">
            <span className="card-label">Lunch</span>
            <span className="card-value">₨{lunchTotal.toFixed(2)}</span>
          </div>
        </div>
        <div className="summary-card dinner-card">
          <div className="card-icon">🍽️</div>
          <div className="card-info">
            <span className="card-label">Dinner</span>
            <span className="card-value">₨{dinnerTotal.toFixed(2)}</span>
          </div>
        </div>
        <div className="summary-card total-card">
          <div className="card-icon">💰</div>
          <div className="card-info">
            <span className="card-label">Grand Total</span>
            <span className="card-value">₨{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div className="filter-row">
        <label className="filter-label">Filter by Month:</label>
        <select
          className="filter-select"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        >
          <option value="">All Records</option>
          {months.map((m) => {
            const [y, mo] = m.split('-')
            const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })
            return (
              <option key={m} value={m}>
                {label}
              </option>
            )
          })}
        </select>
        <span className="record-count">{filteredExpenses.length} record(s)</span>
        {isFilteredMonthPast && filteredExpenses.length > 0 && (
          <button
            className="btn-delete-month"
            onClick={() => setConfirmDeleteMonth(filterMonth)}
          >
            🗑️ Delete This Month
          </button>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId !== null ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button className="modal-close" onClick={handleCancel}>✕</button>
            </div>
            <form onSubmit={handleSave} className="expense-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Date <span className="required">*</span></label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Day</label>
                  <input
                    type="text"
                    value={getDayName(form.date)}
                    readOnly
                    className="form-input readonly"
                    placeholder="Auto-filled"
                  />
                </div>
              </div>

              <div className="form-row three-col">
                <div className="form-group">
                  <label>☕ Breakfast (Rs.)</label>
                  <input
                    type="number"
                    name="breakfast"
                    value={form.breakfast}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="form-input"
                  />
                  <input
                    type="text"
                    name="breakfastDesc"
                    value={form.breakfastDesc}
                    onChange={handleFormChange}
                    placeholder="e.g. egg, tea"
                    className="form-input form-input-desc"
                  />
                </div>
                <div className="form-group">
                  <label>🍱 Lunch (Rs.)</label>
                  <input
                    type="number"
                    name="lunch"
                    value={form.lunch}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="form-input"
                  />
                  <input
                    type="text"
                    name="lunchDesc"
                    value={form.lunchDesc}
                    onChange={handleFormChange}
                    placeholder="e.g. rice, dal"
                    className="form-input form-input-desc"
                  />
                </div>
                <div className="form-group">
                  <label>🍽️ Dinner (Rs.)</label>
                  <input
                    type="number"
                    name="dinner"
                    value={form.dinner}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="form-input"
                  />
                  <input
                    type="text"
                    name="dinnerDesc"
                    value={form.dinnerDesc}
                    onChange={handleFormChange}
                    placeholder="e.g. roti, sabzi"
                    className="form-input form-input-desc"
                  />
                </div>
              </div>

              <div className="form-total">
                <span>Total:</span>
                <span className="form-total-value">
                  ₨{getTotal(form.breakfast, form.lunch, form.dinner).toFixed(2)}
                </span>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingId !== null ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Single Record Modal */}
      {confirmDeleteId !== null && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3>Delete this record?</h3>
            <p>This action cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-cancel" onClick={handleDeleteCancel}>Cancel</button>
              <button className="btn-delete-confirm" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Month Modal */}
      {confirmDeleteMonth && (() => {
        const [y, mo] = confirmDeleteMonth.split('-')
        const monthLabel = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('default', {
          month: 'long', year: 'numeric',
        })
        return (
          <div className="modal-overlay" onClick={() => setConfirmDeleteMonth(null)}>
            <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">🗓️</div>
              <h3>Delete all records for</h3>
              <p className="confirm-month-name">{monthLabel}</p>
              <p className="confirm-month-count">
                {filteredExpenses.length} record(s) will be permanently deleted.
              </p>
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setConfirmDeleteMonth(null)}>Cancel</button>
                <button className="btn-delete-confirm" onClick={handleDeleteMonth}>Delete All</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Expense Table */}
      <div className="table-wrapper">
        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No expense records found.</p>
            <button className="btn-add" onClick={handleAddNew}>Add First Record</button>
          </div>
        ) : (
          <table className="expense-table">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Date</th>
                <th>Day Name</th>
                <th>☕ Breakfast</th>
                <th>🍱 Lunch</th>
                <th>🍽️ Dinner</th>
                <th>💰 Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp, index) => (
                <tr key={exp.id} className={editingId === exp.id ? 'row-editing' : ''}>
                  <td className="td-serial">{index + 1}</td>
                  <td className="td-date">{formatDate(exp.date)}</td>
                  <td className="td-day">
                    <span className={`day-badge day-${getDayName(exp.date).toLowerCase()}`}>
                      {getDayName(exp.date)}
                    </span>
                  </td>
                  <td className="td-amount">
                    {exp.breakfast ? `₨${parseFloat(exp.breakfast).toFixed(2)}` : <span className="nil">—</span>}
                    {exp.breakfastDesc && <div className="meal-desc">{exp.breakfastDesc}</div>}
                  </td>
                  <td className="td-amount">
                    {exp.lunch ? `₨${parseFloat(exp.lunch).toFixed(2)}` : <span className="nil">—</span>}
                    {exp.lunchDesc && <div className="meal-desc">{exp.lunchDesc}</div>}
                  </td>
                  <td className="td-amount">
                    {exp.dinner ? `₨${parseFloat(exp.dinner).toFixed(2)}` : <span className="nil">—</span>}
                    {exp.dinnerDesc && <div className="meal-desc">{exp.dinnerDesc}</div>}
                  </td>
                  <td className="td-total">
                    ₨{getTotal(exp.breakfast, exp.lunch, exp.dinner).toFixed(2)}
                  </td>
                  <td className="td-actions">
                    <button className="btn-edit" onClick={() => handleEdit(exp)} title="Edit">
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteConfirm(exp.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tfoot-row">
                <td colSpan="3" className="tfoot-label">Total ({filteredExpenses.length} days)</td>
                <td className="tfoot-amount">₨{breakfastTotal.toFixed(2)}</td>
                <td className="tfoot-amount">₨{lunchTotal.toFixed(2)}</td>
                <td className="tfoot-amount">₨{dinnerTotal.toFixed(2)}</td>
                <td className="tfoot-grand">₨{grandTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
