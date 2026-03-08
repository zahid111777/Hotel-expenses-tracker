# 🏨 Hotel Expense Tracker

A React-based daily meal expense tracker for hotels with an admin/user role system.

---

## 📋 Features

- **Admin Dashboard** — create & manage users, view any user's records
- **Per-User Records** — each user's data is stored separately
- **Daily Expense Entry** — log Breakfast, Lunch, Dinner costs per day
- **Auto Day Name** — day of the week is calculated automatically from the date
- **Monthly Filter** — filter records by month
- **Delete by Month** — delete all records of a past month at once
- **Edit / Delete** — edit or delete individual records
- **Summary Cards** — live totals for each meal and grand total
- **Persistent Storage** — all data saved in browser localStorage (no server needed)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

### Installation & Run

```bash
# 1. Navigate to the project folder
cd expense_tracker

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open your browser and go to:

```
http://localhost:5173
```

---

## 🔐 Login Credentials

### Admin
| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

> ⚠️ The admin credentials are not shown on the login page. Keep them confidential.

### Users
Users are created by the admin from the Admin Dashboard. The admin sets their username and password.

---

## 🏗️ Project Structure

```
expense_tracker/
├── public/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx      # Auth logic (login, logout, user management)
│   ├── pages/
│   │   ├── Login.jsx            # Login page
│   │   ├── Login.css
│   │   ├── AdminDashboard.jsx   # Admin panel (manage users)
│   │   └── AdminDashboard.css
│   ├── components/
│   │   ├── ExpenseTracker.jsx   # Expense table & form
│   │   └── ExpenseTracker.css
│   ├── App.jsx                  # Route controller
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## 🔄 How It Works

### Admin Flow
1. Log in with admin credentials
2. View all users and their record counts
3. Click **"+ New User"** to create a user (name, username, password)
4. Click **"📊 View Records"** to browse any user's expense data
5. Delete a user (also deletes all their records)

### User Flow
1. Log in with credentials given by the admin
2. Add daily expenses using **"+ Add Today's Expense"**
3. Edit any record using the ✏️ button
4. Delete a single record using the 🗑️ button
5. Filter records by month using the dropdown
6. Delete all records of a **past month** using **"🗑️ Delete This Month"**

---

## 🏭 Build for Production

```bash
npm run build
```

The production-ready files will be generated in the `dist/` folder.

To preview the production build locally:

```bash
npm run preview
```

---

## 🗄️ Data Storage

All data is stored in the browser's **localStorage**:

| Key | Description |
|-----|-------------|
| `hotel_auth_users` | List of all users |
| `hotel_auth_session` | Currently logged-in user session |
| `hotel_expenses_<userId>` | Expense records per user |

> Data persists across page refreshes but is browser-specific. Clearing browser data will erase all records.
