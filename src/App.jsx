import React from 'react'
import { useEffect, useState } from 'react'
import supabase from './supabaseClient'

function App() {
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    supabase.from('customers').select('*').then(({ data, error }) => {
      if (!error) setCustomers(data)
    })
  }, [])

  return (
    <div>
      <h1>Customers</h1>
      <ul>
        {customers.map(c => (
          <li key={c.id}>{c.name} — {c.phone}</li>
        ))}
      </ul>
    </div>
  )
}

export default App
