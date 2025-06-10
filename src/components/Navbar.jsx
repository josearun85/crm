import { Link, useLocation, useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import './Navbar.css'

export default function Navbar({ session }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => { 
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src="/logo.jpeg" alt="Logo" className="navbar-logo" />
        <Link to="/enquiries" className={location.pathname.startsWith('/enquiries') ? 'active' : ''}>Enquiries</Link>
        <Link to="/customers" className={location.pathname.startsWith('/customers') ? 'active' : ''}>Customers</Link>
        {/* <Link to="/orders-v2" className={location.pathname.startsWith('/orders-v2') ? 'active' : ''}>Orders</Link> */}
        <Link to="/invoices" className={location.pathname.startsWith('/invoices') ? 'active' : ''}>Invoices</Link>
        <Link to="/inventory" className={location.pathname.startsWith('/inventory') ? 'active' : ''}>Inventory</Link>
        <Link to="/vendors" className={location.pathname.startsWith('/vendors') ? 'active' : ''}>Vendors</Link>
        <Link to="/feeds" className={location.pathname.startsWith('/feeds') ? 'active' : ''}>Feeds</Link>
      </div>
      <div className="navbar-right">
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
