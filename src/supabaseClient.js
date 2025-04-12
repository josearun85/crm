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

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
})

export default supabase
