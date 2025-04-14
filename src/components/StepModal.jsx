import React, { useState } from 'react';
import supabase from '../supabaseClient';

export default function StepModal({ step, onClose, onSave }) {
  const [status, setStatus] = useState(step.status || 'OPEN');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSave = async () => {
    const updates = {
      status,
      comments: [...(step.comments || []), { text: comment, time: new Date().toISOString() }]
    };

    if (file) {
      updates.files = [...(step.files || []), { name: file.name }];
      // Optionally upload to Supabase storage or just store metadata
    }

    const { error } = await supabase
      .from('order_steps')
      .update(updates)
      .eq('id', step.id);

    if (error) {
      console.error('Error updating step:', error);
    } else {
      onSave();  // Refresh parent data
      onClose();
    }
  };

  return (
    <div className="step-modal">
      <h3>{step.description}</h3>
      <label>Status:
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="OPEN">OPEN</option>
          <option value="CLOSED">CLOSED</option>
          <option value="HOLD">HOLD</option>
        </select>
      </label>
      <label>Comment:
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <label>Upload File:
        <input type="file" onChange={handleFileChange} />
      </label>
      {step.files && step.files.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h4>Uploaded Files:</h4>
          <ul>
            {step.files.map((file, index) => {
              const { data } = supabase.storage.from('crm').getPublicUrl(file.path);
              return (
                <li key={index}>
                  <a href={data.publicUrl} target="_blank" rel="noopener noreferrer">
                    {file.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div style={{ marginTop: '1rem' }}>
        <button onClick={handleSave}>Save</button>
        <button onClick={onClose} style={{ marginLeft: '1rem' }}>Cancel</button>
      </div>
    </div>
  );
}
