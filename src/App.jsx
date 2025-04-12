import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import CustomersPage from './pages/CustomersPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import InvoicesPage from './pages/InvoicesPage.jsx'
import Navbar from './components/Navbar.jsx'

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/customers" />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
      </Routes>
    </Router>
  )
}
