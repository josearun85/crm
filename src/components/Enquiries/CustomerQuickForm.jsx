import { useState } from 'react';
import supabase from '../../supabaseClient';

export default function CustomerQuickForm({ onCreated, onInputChange }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [followUpOn, setFollowUpOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      setError('Name and phone are required.');
      return;
    }
    setSaving(true);
    const { data, error: insertError } = await supabase.from('customers').insert({ name, phone, follow_up_on: followUpOn || null }).select().single();
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
          onInputChange('name', e.target.value);
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
          onInputChange('phone', e.target.value);
        }}
        required
        className="w-full border p-2 rounded"
      />
      <input
        type="date"
        value={followUpOn}
        onChange={(e) => setFollowUpOn(e.target.value)}
        className="w-full border p-2 rounded"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
