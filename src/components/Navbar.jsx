import { Link, useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'

export default function Navbar({ session }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav style={{ padding: '1rem', borderBottom: '1px solid #ddd', marginBottom: '1rem' }}>
      {session ? (
        <>
          <Link to="/customers">Customers</Link> |{' '}
          <Link to="/orders">Orders</Link> |{' '}
          <Link to="/invoices">Invoices</Link> |{' '}
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </nav>
  )
}
