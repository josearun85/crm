import { useEffect, useState } from 'react';
import supabase from '../../supabaseClient';
import CustomerQuickForm from './CustomerQuickForm';
import { addFeedNote } from "../../pages/orders/services/orderDetailsService";

export default function CreateEnquiryModal({ show, onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [channel, setChannel] = useState('');
  const [description, setDescription] = useState('');
  const [useNewCustomer, setUseNewCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  useEffect(() => {
    if (!show) return;
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('id, name');
      if (!error) setCustomers(data);
    };
    fetchCustomers();
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Only require customer name if adding new customer
    if (useNewCustomer && !newCustomer.name) {
      setErrorMsg('Customer name is required.');
      return;
    }
    setLoading(true);
    let finalCustomerId = selectedCustomer;

    if (useNewCustomer) {
      // Only include phone if not blank
      const customerData = newCustomer.phone && newCustomer.phone.trim() !== ''
        ? { name: newCustomer.name, phone: newCustomer.phone }
        : { name: newCustomer.name };
      const { data: newData, error: insertError } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (insertError || !newData) {
        setLoading(false);
        setErrorMsg(insertError?.message || 'Failed to create customer');
        return;
      }

      finalCustomerId = newData.id;
      setCustomers(prev => [...prev, { id: newData.id, name: newData.name }]);
    }

    const { data: enquiryData, error } = await supabase.from('enquiries').insert({
      customer_id: finalCustomerId,
      date: new Date().toISOString().split('T')[0], // Default to today
      channel: channel || null,
      description: description || null,
      follow_up_on: null, // Remove follow up date
    }).select().single();

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      // Add feed note for enquiry creation
      const user = await supabase.auth.getUser();
      try {
        const feedRes = await addFeedNote({
          type: 'feed',
          content: 'Enquiry created',
          enquiry_id: enquiryData.id,
          created_by: user?.data?.user?.id,
          created_by_name: user?.data?.user?.user_metadata?.full_name || '',
          created_by_email: user?.data?.user?.email || ''
        });
        if (feedRes.error) {
          setErrorMsg('Feed note creation failed: ' + feedRes.error.message);
          console.error('Feed note creation failed:', feedRes.error);
          return;
        }
      } catch (err) {
        setErrorMsg('Feed note creation threw an error: ' + err.message);
        console.error('Feed note creation threw an error:', err);
        return;
      }
      setErrorMsg('');
      onClose();
      onCreated();
      window.scrollTo(0, 0);
    }
  };

  const handleCustomerCreated = (newCustomerId) => {
    setSelectedCustomer(newCustomerId);
    setUseNewCustomer(false);
    window.scrollTo(0, 0);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create New Enquiry</h2>
        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!useNewCustomer ? (
            <>
              <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} required className="w-full border p-2 rounded">
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="button" className="text-sm text-blue-600 underline" onClick={() => setUseNewCustomer(true)}>
                + Add New Customer
              </button>
            </>
          ) : (
            <CustomerQuickForm onInputChange={(field, value) => setNewCustomer(prev => ({ ...prev, [field]: value }))} />
          )}

          <input
            type="text"
            placeholder="Channel (e.g. phone, whatsapp)"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <div className="flex justify-between">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
              {loading ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
