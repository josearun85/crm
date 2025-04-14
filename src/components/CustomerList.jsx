import { useEffect, useState } from 'react'
import supabase from '../supabaseClient'
import AddCustomerForm from './AddCustomerForm'

export default function CustomerList() {
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, name, phone, email,
        order (
          id, status
        )
      `)
    if (!error) setCustomers(data)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const summarizeOrders = (orders = []) => {
    const summary = {}
    for (const order of orders) {
      summary[order.status] = (summary[order.status] || 0) + 1
    }
    return summary
  }

  const statusIcons = {
    pending: '🟡',
    completed: '✅',
    in_progress: '🔄',
    delayed: '🔴'
  }

  const formatSummary = (summaryObj) => {
    const entries = Object.entries(summaryObj)
    if (entries.length === 0) return '—'
    return entries
      .map(([status, count]) => `${statusIcons[status] || ''} ${count} ${status}`)
      .join(' · ')
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Customers</h2>
      <button onClick={() => setShowModal(true)}>+ Add Customer</button>

      <div style={{ margin: '1rem 0' }}>
        <input
          type="text"
          placeholder="Name"
          value={newCustomer.name}
          onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
          style={{ marginRight: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="Phone"
          value={newCustomer.phone}
          onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
          style={{ marginRight: '0.5rem' }}
        />
        <input
          type="email"
          placeholder="Email"
          value={newCustomer.email}
          onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
          style={{ marginRight: '0.5rem' }}
        />
        <button onClick={async () => {
          if (!newCustomer.name) return
          const { error } = await supabase.from('customers').insert([newCustomer])
          if (!error) {
            setNewCustomer({ name: '', phone: '', email: '' })
            fetchCustomers()
          }
        }}>
          Save Customer
        </button>
      </div>

      <AddCustomerForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCustomerAdded={fetchCustomers}
      />

      <ul style={{ marginTop: '1rem', listStyle: 'none', padding: 0 }}>
        {customers.map(cust => {
          const summary = summarizeOrders(cust.order)
          return (
            <li key={cust.id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '0.75rem'
            }}>
              <div><strong>{cust.name}</strong> · {cust.phone}</div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                {formatSummary(summary)}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
