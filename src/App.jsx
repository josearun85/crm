import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import CustomersPage from './pages/CustomersPage.jsx'
import OrderPage from './pages/OrderPage.jsx'
import InvoicesPage from './pages/InvoicesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import Navbar from './components/Navbar.jsx'
import supabase from './supabaseClient'
import './App.css'
import './pages/CustomersPage.css' // Ensure to import the CSS file for styling

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const showNavbar = location.pathname !== '/login'

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setSession(session)
      setLoading(false)
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    <Router>
      {showNavbar && <Navbar session={session} />}
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
