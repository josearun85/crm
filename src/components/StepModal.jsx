import React, { useState, useEffect } from 'react';
import { uploadFile, getPublicUrl, updateStep, deleteSupabaseFile } from "../services/orderService";

export default function StepModal({ step, onClose, onSave }) {
  const [status, setStatus] = useState(step.status || 'new');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const { x = 100, y = 100 } = step.popupPosition || {};
  const [signedUrls, setSignedUrls] = useState([]);
  const [editedDescription, setEditedDescription] = useState(() => step.description || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const top = typeof y === "number" ? y : 150;
  const left = typeof x === "number" ? x : window.innerWidth / 2 - 150;

  useEffect(() => {
    async function fetchSignedUrls() {
      if (!step?.files || step.files.length === 0) return;

      const urls = await Promise.all(step.files.map(async (file) => {
        try {
          const { data, error } = await window.supabase
            .storage
            .from('crm')
            .createSignedUrl(file.path, 300); // valid for 5 min

          if (error) {
            console.error("Signed URL error:", error.message);
            return null;
          }
          return { name: file.name, url: data.signedUrl };
        } catch (err) {
          console.warn("Fallback URL failed:", err);
          return null;
        }
      }));

      setSignedUrls(urls.filter(Boolean));
    }

    fetchSignedUrls();
  }, [step]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    console.log("Selected file:", e.target.files[0]);
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
        top: '10vh',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'white',
        width: '360px',
        maxWidth: '95vw',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        borderRadius: '0.5rem',
        padding: '1rem'
      }}
    >
      <div
        className="text-xl font-bold mb-4 cursor-pointer group"
        onMouseEnter={() => setIsEditingTitle(true)}
        onMouseLeave={() => setIsEditingTitle(false)}
      >
        {isEditingTitle ? (
          <input
            type="text"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            onBlur={async () => {
              if (editedDescription.trim() && editedDescription !== step.description) {
                await updateStep(step.id, { description: editedDescription.trim() });
                setEditedDescription(editedDescription.trim());
                onSave();  // trigger data refresh at parent level
              }
              setIsEditingTitle(false);
            }}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            className="w-full border px-2 py-1 rounded text-sm"
            autoFocus
          />
        ) : (
          <span className="group-hover:underline">{step.description}</span>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`w-full border rounded px-3 py-2 text-sm ${
            status === "closed"
              ? "bg-green-100 text-green-800"
              : status === "in progress"
              ? "bg-blue-100 text-blue-800"
              : status === "hold"
              ? "bg-orange-100 text-orange-800"
              : status === "delayed"
              ? "bg-red-100 text-red-800"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          <option value="new">New</option>
          <option value="in progress">In Progress</option>
          <option value="hold">On Hold</option>
          <option value="delayed">Delayed</option>
          <option value="closed">Closed</option>
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
        {file && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm">{file.name}</span>
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
            >
              Upload
            </button>
          </div>
        )}
      </div>
      {step.files && step.files.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold">Uploaded Files:</h4>
          <ul className="text-sm list-disc ml-5">
            {signedUrls.map(({ name, url }, index) => (
              <li key={index} className="flex items-center gap-2">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  {name}
                </a>
                <button
                  onClick={async () => {
                    const confirmed = window.confirm(`Delete file "${name}"?`);
                    if (confirmed) {
                      const fileToDelete = step.files.find(f => f.name === name);
                      if (fileToDelete) {
                        try {
                          await deleteSupabaseFile(fileToDelete.path);
                          const updatedFileList = step.files.filter(f => f.name !== name);
                          await updateStep(step.id, { files: updatedFileList });

                          // Refresh UI locally
                          setSignedUrls(prev => prev.filter(f => f.name !== name));
                          step.files = updatedFileList;
                        } catch (err) {
                          console.error("Error deleting file:", err);
                          alert("Failed to delete file. Please try again.");
                        }
                      }
                    }
                  }}
                  className="text-red-500 text-sm hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
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
