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
        <img src="/logo.png" alt="Logo" className="navbar-logo" />
        <Link to="/enquiries" className={location.pathname.startsWith('/enquiries') ? 'active' : ''}>Enquiries</Link>
        <Link to="/customers" className={location.pathname.startsWith('/customers') ? 'active' : ''}>Customers</Link>
        <Link to="/orders-v2" className={location.pathname.startsWith('/orders-v2') ? 'active' : ''}>Orders</Link>
      </div>
      <div className="navbar-right">
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
