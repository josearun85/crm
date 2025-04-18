import { useState } from 'react'
import supabase from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('')
      // Make sure the '/customers' route is protected and only accessible to authenticated users.
      // Consider adding a session check on that page.
      navigate('/customers')
    }
    setLoading(false)
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/reset-password'
    })
    if (error) {
      setResetMsg('Error: ' + error.message)
    } else {
      setResetMsg('✅ Password reset email sent')
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      height: '100vh',
      backgroundColor: '#F8D86B',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        flex: '1 1 100%',
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <img src="/logo.png" alt="Sign Company Logo" style={{ maxWidth: '300px', height: 'auto' }} />
      </div>
      <div style={{
        flex: '1 1 100%',
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          minWidth: '300px',
          maxWidth: '90vw'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#000000' }}>Sign In</h2>
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
            <div style={{ marginBottom: '0.5rem' }}>
              <input
                type="password"
                value={password}
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
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
            <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowResetForm(!showResetForm)}
                style={{
                  fontSize: '0.9rem',
                  color: '#1d4ed8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Forgot Password?
              </button>
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
              {loading ? 'Signing in...' : 'Login'}
            </button>
            {message && <p style={{ marginTop: '1rem', color: '#333' }}>{message}</p>}
          </form>

          {showResetForm && (
            <form onSubmit={handlePasswordReset} style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem' }}>Enter your email to reset password:</p>
              <input
                type="email"
                value={resetEmail}
                placeholder="Email"
                onChange={(e) => setResetEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  marginBottom: '0.5rem'
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#1d4ed8',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Send Reset Link
              </button>
              {resetMsg && <p style={{ marginTop: '0.5rem', color: '#333' }}>{resetMsg}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
