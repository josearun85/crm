import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import CustomersPage from './pages/CustomersPage.jsx'
import OrderPage from './pages/OrderPage.jsx'
import InvoicesPage from './pages/InvoicesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import Navbar from './components/Navbar.jsx'
import supabase from './supabaseClient'

export default function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for login/logout
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <Router>
      <Navbar session={session} />
      <Routes>
        <Route path="/" element={<Navigate to="/customers" />} />
        <Route path="/login" element={<LoginPage />} />

        {session ? (
          <>
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
          </>
        ) : (
          <>
            <Route path="/customers" element={<Navigate to="/login" />} />
            <Route path="/orders/:id" element={<Navigate to="/login" />} />
            <Route path="/invoices" element={<Navigate to="/login" />} />
          </>
        )}
      </Routes>
    </Router>
  )
}
