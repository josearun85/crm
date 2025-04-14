import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const customFetch = (url, options = {}) => {
  options.headers = {
    ...(options.headers || {}),
    Accept: 'application/json'
  }
  return fetch(url, options)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user)
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  }
})
supabase.auth.onTokenRefresh((event, session) => {
  console.log('Token refreshed:', session)
})
supabase.auth.onSessionChange((event, session) => {
  console.log('Session changed:', session)
})
supabase.auth.onUserUpdate((event, session) => {
  console.log('User updated:', session.user)
})

export default supabase
