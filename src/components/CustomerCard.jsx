import React from 'react';
import './CustomerCard.css';

export default function CustomerCard({ customer }) { 
  return (
    <div className="customer-card"> 
      <div className="customer-info">
        <h3>{customer.name}</h3>
        <p>{customer.phone}</p>
        <p>{customer.email}</p>
      </div>
      <div className="order-summary">
        {customer.orders?.map(order => {
          const statusColorMap = {
            NEW: '#fff9c4',
            HOLD: '#ffe0b2',
            CLOSED: '#c8e6c9',
            DELAYED: '#ffcdd2',
          };
          const bgColor = statusColorMap[order.status] || '#f5f5f5';

          return (
            <tr key={`order-${order.id}`}>
              <td colSpan="6" style={{ paddingLeft: '2rem' }}>
                <div
                  style={{
                    backgroundColor: bgColor,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '10px'
                  }}
                >
                  <div
                    style={{ fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                    onClick={() => goToGantt(order.id)}
                  >
                    Order #{order.id} – {order.status}
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px', color: '#333' }}>
                    Due: {order.due_date}<br />
                    Current Step: <em>(fetching...)</em>
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </div>
    </div>
  );
}
