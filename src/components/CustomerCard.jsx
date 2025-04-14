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
            {customer.orders.map(order => (
              <tr key={`order-${order.id}`} className="order-row">
                <td colSpan="6" style={{ paddingLeft: '2rem' }}>
                  <div><strong>Order #{order.id}</strong> – {order.status} (Due: {order.due_date})</div>
                </td>
              </tr>
            ))}
          </>
        ) : (
          <p>No orders yet</p>
        )}
      </div>
    </div>
  );
}
