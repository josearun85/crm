import { useState } from 'react';
import supabase from '../../supabaseClient';

export default function CustomerQuickForm({ onCreated }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSaving(true);
    const { data, error } = await supabase.from('customers').insert({ name, phone }).select().single();
    setSaving(false);
    if (!error && data) {
      onCreated(data.id);
    }
  };

  return (
    <form onSubmit={handleCreate} className="space-y-2">
      <input
        type="text"
        placeholder="Customer Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full border p-2 rounded"
      />
      <input
        type="text"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        className="w-full border p-2 rounded"
      />
      <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-500 text-white rounded">
        {saving ? 'Adding...' : 'Create Customer'}
      </button>
    </form>
  );
}
