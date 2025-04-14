import React, { useState } from 'react';
import { uploadFile, getPublicUrl, updateStep } from "../services/orderService";

export default function StepModal({ step, onClose, onSave }) {
  const [status, setStatus] = useState(step.status || 'OPEN');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const { x = 100, y = 100 } = step.popupPosition || {};
  
  const top = typeof y === "number" ? y : 150;
  const left = typeof x === "number" ? x : window.innerWidth / 2 - 150;
  console.log("StepModal position:", { top, left, step });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSave = async () => {
    const updates = {
      status,
      comments: [...(step.comments || []), { text: comment, time: new Date().toISOString() }]
    };

    if (file) {
      const uploadedPath = await uploadFile(file);
      updates.files = [...(step.files || []), { name: file.name, path: uploadedPath }];
    }

    await updateStep(step.id, updates);

    onSave();  // Refresh parent data
    onClose();
  };

  return (
    <div
      className="fixed z-[999] rounded-lg shadow-xl border border-gray-300 p-4"
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        backgroundColor: 'white',
        width: '320px',
        maxWidth: '90vw',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        borderRadius: '0.5rem'
      }}
    >
      <h3 className="text-xl font-bold mb-4">{step.description}</h3>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="OPEN">OPEN</option>
          <option value="CLOSED">CLOSED</option>
          <option value="HOLD">HOLD</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm resize-none"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Upload File</label>
        <input type="file" onChange={handleFileChange} />
      </div>
      {step.files && step.files.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold">Uploaded Files:</h4>
          <ul className="text-sm list-disc ml-5">
            {step.files.map((file, index) => {
              const url = getPublicUrl(file.path);
              return (
                <li key={index}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {file.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
