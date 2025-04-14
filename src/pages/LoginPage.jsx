import { useState } from 'react'
import supabase from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✅ Check your email for the login link.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f6d251', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Sign Company Logo" style={{ maxWidth: '300px', height: 'auto' }} />
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', minWidth: '300px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Sign In</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="email"
                value={email}
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '1rem'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#b91c1c',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                width: '100%',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
            {message && <p style={{ marginTop: '1rem', color: '#333' }}>{message}</p>}
          </form>
        </div>
      </div>
    </div>
  )
}
