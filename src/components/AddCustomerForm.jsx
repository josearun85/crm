import { useState } from 'react'
import supabase from '../supabaseClient'

export default function AddCustomerForm({ isOpen, onClose, onCustomerAdded }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    sales_stage: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('customers').insert([form])
    setLoading(false)

    if (error) {
      alert('Error adding customer: ' + error.message)
    } else {
      onCustomerAdded()
      onClose()
      setForm({ name: '', phone: '', email: '', sales_stage: '' })
    }
  }

  if (!isOpen) return null

  return (
    <div style={modalBackdrop}>
      <div style={modalContent}>
        <h3>Add New Customer</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input name="name" placeholder="Name" onChange={handleChange} value={form.name} required />
          <input name="phone" placeholder="Phone" onChange={handleChange} value={form.phone} />
          <input name="email" placeholder="Email" onChange={handleChange} value={form.email} />
          <input name="sales_stage" placeholder="Sales Stage" onChange={handleChange} value={form.sales_stage} />
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" disabled={loading}>Add</button>
            <button type="button" onClick={onClose} style={{ marginLeft: '1rem' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const modalBackdrop = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 999
}

const modalContent = {
  background: '#fff', padding: '2rem', borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '300px'
}
