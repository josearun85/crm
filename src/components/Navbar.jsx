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
      <div className="navbar-brand">Sign Company</div>
      <div className="navbar-links">
        {session ? (
          <>
            <Link to="/customers" className={location.pathname.startsWith('/customers') ? 'active' : ''}>Customers</Link>
            <Link to="/orders/1" className={location.pathname.startsWith('/orders') ? 'active' : ''}>Orders</Link>
            <Link to="/invoices" className={location.pathname.startsWith('/invoices') ? 'active' : ''}>Invoices</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  )
}
