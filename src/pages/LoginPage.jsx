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
    <div className="login-page">
      <img src="/logo.jpeg" alt="Sign Company Logo" className="login-logo" />
      <form onSubmit={handleLogin} className="login-box">
        <h2>Login</h2>
        <input
          type="email"
          value={email}
          placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Magic Link</button>
        <p>{message}</p>
      </form>
    </div>
  )
}
