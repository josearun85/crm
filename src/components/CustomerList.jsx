import { useEffect, useState } from 'react'
import supabase from '../supabaseClient'
import CustomerCard from './CustomerCard'

export default function CustomerList() {
  const [customers, setCustomers] = useState([])
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })
  const [loading, setLoading] = useState(false)

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, name, phone, email,
        orders:order (
          id, status
        )
      `)
    if (!error) setCustomers(data)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleSave = async () => {
    if (!newCustomer.name) return
    setLoading(true)
    const { error } = await supabase.from('customers').insert([newCustomer])
    if (!error) {
      setNewCustomer({ name: '', phone: '', email: '' })
      fetchCustomers()
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Customers</h2>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Name"
          value={newCustomer.name}
          onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Phone"
          value={newCustomer.phone}
          onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={newCustomer.email}
          onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
        />
        <button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Customer'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {customers.map(customer => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </div>
  )
}
