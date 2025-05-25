import supabase from '../supabaseClient';
import { deleteOrderFiles } from './orderService';

export async function getCustomers() {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteCustomerWithFiles(customerId) {
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', customerId);

  if (orderError) throw orderError;

  for (const order of orders) {
    await deleteOrderFiles(order.id);
  }

  const { error: deleteError } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId);

  if (deleteError) throw deleteError;
}

export async function updateCustomer(customerId, updates) {
  // Convert empty strings to null for date fields
  const processedUpdates = { ...updates };
  
  // List of date fields that might be empty
  const dateFields = ['follow_up_on'];
  
  dateFields.forEach(field => {
    if (processedUpdates[field] === '') {
      processedUpdates[field] = null;
    }
  });

  const { data, error } = await supabase
    .from('customers')
    .update(processedUpdates)
    .eq('id', customerId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
  
  return data;
}