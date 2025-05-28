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
  // Convert empty strings to null for date fields, and set today's date if empty
  const processedUpdates = { ...updates };
  const dateFields = ['follow_up_on'];
  dateFields.forEach(field => {
    if (
      processedUpdates[field] === '' ||
      processedUpdates[field] === null ||
      processedUpdates[field] === undefined
    ) {
      // Set to today's date if not set
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      processedUpdates[field] = `${yyyy}-${mm}-${dd}`;
    }
  });

  // Ensure the date is always in YYYY-MM-DD format (even if user enters an invalid value)
  if (processedUpdates.follow_up_on) {
    const d = new Date(processedUpdates.follow_up_on);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      processedUpdates.follow_up_on = `${yyyy}-${mm}-${dd}`;
    }
  }

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