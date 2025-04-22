import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import CustomersPage from './pages/CustomersPage.jsx'
import OrderPage from './pages/OrderPage.jsx'
import EnquiriesPage from './pages/EnquiriesPage.jsx'
import OrderDetailPage from './pages/OrderDetailPage.jsx';
// import InvoicesPage from './pages/InvoicesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ResetPassword from './pages/ResetPassword.jsx';
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
    <>
      {showNavbar && <Navbar session={session} />}
      <Routes key={session ? 'auth' : 'guest'}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {!session ? (
          <Route path="*" element={<Navigate to="/login" />} />
        ) : (
          <>
            <Route path="/" element={<Navigate to="/customers" />} />
            <Route path="/enquiries" element={<EnquiriesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route path="/orders-v2/:id" element={<OrderDetailPage />} />
          </>
        )}
      </Routes>
    </>
  )
}
