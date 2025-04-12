import { useEffect, useState } from 'react'
import supabase from '../supabaseClient'
import AddCustomerForm from './AddCustomerForm'

export default function CustomerList() {
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)

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
