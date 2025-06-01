import { useState } from 'react'
import supabase from '../supabaseClient'
import SalesStageSelect from './SalesStageSelect'

export default function AddCustomerForm({ isOpen, onClose, onCustomerAdded }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    sales_stage: '',
    about: '',
    primary_stakeholder: '',
    secondary_stakeholder: '',
    primary_phone: '',
    secondary_phone: '',
    primary_email: '',
    secondary_email: '',
    follow_up_on: '',
    gstin: '',
    pan: '',
    referral_source: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleGstinFetch = async () => {
    if (!form.gstin) {
      alert("Please enter a GSTIN number.");
      return;
    }
    // Placeholder for API call to fetch customer details by GSTIN
    // Replace with your actual API call
    console.log("Fetching details for GSTIN:", form.gstin);
    // Example:
    // try {
    //   const response = await fetch(`/api/gstin-lookup?gstin=${form.gstin}`);
    //   const data = await response.json();
    //   if (data) {
    //     setForm(prevForm => ({
    //       ...prevForm,
    //       name: data.name || prevForm.name,
    //       address: data.address || prevForm.address,
    //       // ... populate other fields as needed
    //     }));
    //   } else {
    //     alert("No details found for this GSTIN.");
    //   }
    // } catch (error) {
    //   console.error("Error fetching GSTIN details:", error);
    //   alert("Failed to fetch GSTIN details.");
    // }
  };

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
      setForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        sales_stage: '',
        about: '',
        primary_stakeholder: '',
        secondary_stakeholder: '',
        primary_phone: '',
        secondary_phone: '',
        primary_email: '',
        secondary_email: '',
        follow_up_on: '',
        gstin: '',
        pan: '',
        referral_source: ''
      })
    }
  }

  if (!isOpen) return null

  return (
    <div style={modalBackdrop}>
      <div style={modalContent}>
        <h3>Add New Customer</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <input name="name" placeholder="Name" onChange={handleChange} value={form.name} required style={{ width: '100%', padding: '0.5rem' }} />
          <input name="phone" placeholder="Phone" onChange={handleChange} value={form.phone} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="email" placeholder="Email" onChange={handleChange} value={form.email} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="address" placeholder="Address" onChange={handleChange} value={form.address} style={{ width: '100%', padding: '0.5rem' }} />
          <SalesStageSelect value={form.sales_stage} onChange={handleChange} placeholder="Sales Stage" />
          <textarea name="about" placeholder="About" onChange={handleChange} value={form.about} style={{ width: '100%', padding: '0.5rem', minHeight: '60px' }} />
          <input name="primary_stakeholder" placeholder="Primary Stakeholder" onChange={handleChange} value={form.primary_stakeholder} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="primary_phone" placeholder="Primary Phone" onChange={handleChange} value={form.primary_phone} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="primary_email" placeholder="Primary Email" onChange={handleChange} value={form.primary_email} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="secondary_stakeholder" placeholder="Secondary Stakeholder" onChange={handleChange} value={form.secondary_stakeholder} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="secondary_phone" placeholder="Secondary Phone" onChange={handleChange} value={form.secondary_phone} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="secondary_email" placeholder="Secondary Email" onChange={handleChange} value={form.secondary_email} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="follow_up_on" type="date" placeholder="Follow Up On" onChange={handleChange} value={form.follow_up_on} style={{ width: '100%', padding: '0.5rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input name="gstin" placeholder="GSTIN" onChange={handleChange} value={form.gstin} style={{ flexGrow: 1, padding: '0.5rem' }} />
            <button type="button" onClick={handleGstinFetch} style={{ padding: '0.5rem' }}>Fetch Details</button>
          </div>
          <input name="pan" placeholder="PAN" onChange={handleChange} value={form.pan} style={{ width: '100%', padding: '0.5rem' }} />
          <input name="referral_source" placeholder="Referral Source" onChange={handleChange} value={form.referral_source} style={{ width: '100%', padding: '0.5rem' }} />
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>Add</button>
            <button type="button" onClick={onClose} style={{ marginLeft: '1rem', width: '100%', padding: '0.75rem' }}>Cancel</button>
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
  background: '#fff',
  padding: '2rem',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  minWidth: '300px',
  maxWidth: '90vw',
  width: '100%'
}
