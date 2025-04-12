import { useEffect, useState } from 'react'
import supabase from '../supabaseClient'
import AddCustomerForm from './AddCustomerForm'

export default function CustomerList() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching customers:', error.message)
      } else {
        setCustomers(data)
      }
      setLoading(false)
    }

    fetchCustomers()
  }, [])

  if (loading) return <p>Loading customers...</p>
  if (customers.length === 0) return <p>No customers found.</p>

  return (
    <div>
      <h2>Customer List</h2>
      <ul>
        {customers.map(cust => (
          <li key={cust.id}>
            <strong>{cust.name}</strong><br />
            {cust.phone} · {cust.email}
          </li>
        ))}
      </ul>
      <AddCustomerForm
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onCustomerAdded={fetchCustomers}
/>
    </div>
  )
}
