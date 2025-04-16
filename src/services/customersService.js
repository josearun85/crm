import supabase from '../supabaseClient';

export async function getCustomers() {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}