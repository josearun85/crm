import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import CustomersPage from './pages/CustomersPage.jsx'
import OrderPage from './pages/OrderPage.jsx'
import EnquiriesPage from './pages/EnquiriesPage.jsx'
import OrderDetailPage from './pages/orders/OrderDetailPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ResetPassword from './pages/ResetPassword.jsx';
import Navbar from './components/Navbar.jsx'
import InventoryPage from "./pages/InventoryPage";
import VendorsPage from "./pages/VendorsPage";
import FeedPage from './pages/FeedPage.jsx';
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
    <div className="min-h-screen bg-[#fffbe6] flex flex-col">
      {showNavbar && <Navbar session={session} />}
      <div className="flex-1 flex flex-col items-center justify-start pt-[60px]"> {/* Added pt-[60px] for navbar height */}
        <div className="w-full max-w-[1000px] mx-auto px-4 py-6">
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
                <Route path="/orders-v2/:orderId" element={<OrderDetailPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/feeds" element={<FeedPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
              </>
            )}
          </Routes>
        </div>
      </div>
    </div>
  )
}
