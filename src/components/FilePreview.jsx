<div style={{ marginBottom: '1rem' }}>
  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Attachments</label>
  <div style={{
    display: 'flex',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    gap: '1rem',
    padding: '0.5rem 0'
  }}>
    {uploadedFiles.map(file => (
      <div key={file.id} style={{
        minWidth: '100px',
        maxWidth: '120px',
        height: 'auto',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #ccc',
        backgroundColor: '#f8f8f8',
        flexShrink: 0
      }}>
        {/* preview content */}
        <button
          onClick={() => handleDelete(file)}
          style={{
            marginTop: '0.25rem',
            color: 'red',
            fontSize: '0.85rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Delete
        </button>
      </div>
    ))}
  </div>
</div>
