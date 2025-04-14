import { useState } from 'react'
import supabase from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✅ Check your email for the login link.')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="/logo.jpeg" alt="Sign Company Logo" className="login-logo-sm" />
        <form onSubmit={handleLogin} className="login-box">
          <h2>Sign In</h2>
          <input
            type="email"
            value={email}
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send Magic Link</button>
          {message && <p>{message}</p>}
        </form>
      </div>
    </div>
  )
}
