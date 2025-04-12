import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
      <Link to="/customers">Customers</Link> |{' '}
      <Link to="/orders">Orders</Link> |{' '}
      <Link to="/invoices">Invoices</Link>
    </nav>
  )
}
