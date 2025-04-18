import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error_code = hashParams.get('error_code');
    if (error_code === 'otp_expired') {
      console.warn('OTP expired error detected in URL hash');
      setError('This reset link has expired. Please request a new one.');
      return;
    }

    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    const token = hashParams.get('token');

    console.log('Reset link hash:', window.location.hash);
    console.log('Parsed access_token:', access_token);
    console.log('Parsed refresh_token:', refresh_token);
    console.log('Parsed type:', type);
    console.log('Parsed token:', token);

    if (access_token && refresh_token && type === 'recovery') {
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        console.log('Session set successfully');
      });
    } else if (token && type === 'recovery') {
      supabase.auth.exchangeCodeForSession({ token }).then(({ data, error }) => {
        if (error) {
          console.error('Exchange failed:', error.message);
          setError('Session could not be validated. Please request a new reset link.');
        } else {
          console.log('Session established via exchangeCodeForSession');
        }
      });
    }
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setStatus('Password must be at least 6 characters.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setStatus('Error: ' + error.message);
    } else {
      setStatus('✅ Password updated successfully. You can now log in.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#F8D86B',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Reset Password</h2>
        {error ? (
          <div>
            <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>
            <a
              href="/login"
              style={{
                color: '#1d4ed8',
                textDecoration: 'underline',
                fontWeight: 'bold',
                display: 'inline-block'
              }}
            >
              Go back to login
            </a>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword}>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                marginBottom: '1rem'
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#15803d',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Update Password
            </button>
            {status && <p style={{ marginTop: '1rem', color: '#333' }}>{status}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
