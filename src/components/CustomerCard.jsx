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
        {customer.orders && customer.orders.length > 0 ? (
          <>
            <p><strong>{customer.orders.length}</strong> order(s)</p>
            {customer.orders.map(order => {
              const statusColorMap = {
                NEW: '#fff9c4',
                HOLD: '#ffe0b2',
                CLOSED: '#c8e6c9',
                DELAYED: '#ffcdd2',
              };
              const bgColor = statusColorMap[order.status] || '#f5f5f5';
              return (
                <div key={`order-${order.id}`} style={{ background: bgColor, padding: '0.5rem', margin: '0.5rem 0', cursor: 'pointer' }} onClick={() => goToGantt(order.id)}>
                  <strong>Order #{order.id}</strong> – {order.status} (Due: {order.due_date})
                  <div style={{ fontSize: '0.9em', marginTop: '0.25rem' }}>
                    Current Step: <em>(fetching...)</em> {/* Backend support needed */}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <p>No orders yet</p>
        )}
      </div>
    </div>
  );
}
