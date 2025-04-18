import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const access_token = url.searchParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token');
    const type = url.searchParams.get('type');

    if (type === 'recovery' && access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        setReady(true);
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
        {ready ? (
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
        ) : (
          <p>Loading reset form...</p>
        )}
      </div>
    </div>
  );
}
