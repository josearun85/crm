import { useState } from 'react';
import supabase from '../../supabaseClient';

export default function CustomerQuickForm({ onCreated, onInputChange }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    // Only include phone if not blank
    const customerData = phone && phone.trim() !== '' ? { name, phone } : { name };
    const { data, error: insertError } = await supabase.from('customers').insert(customerData).select().single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      onCreated(data.id);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Customer Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          onInputChange && onInputChange('name', e.target.value);
        }}
        required
        className="w-full border p-2 rounded"
      />
      <input
        type="text"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          onInputChange && onInputChange('phone', e.target.value);
        }}
        className="w-full border p-2 rounded"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
