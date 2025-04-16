import React from 'react';
import './CustomerCard.css';
import { updateOrder } from '../services/orderService';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';

export default function CustomerCard({ customer, onOrderUpdated }) { 
  const navigate = useNavigate();
  const goToGantt = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="customer-card"> 
      <div className="customer-info">
        <h3>{customer.name}</h3>
        <p>{customer.phone}</p>
        <p>{customer.email}</p>
      </div>
      <div className="order-summary">
        {customer.orders?.map(order => {
          const isOverdue = moment(order.due_date).isBefore(moment(), 'day') && order.status !== 'CLOSED';
          const statusColorMap = {
            NEW: '#fff9c4',
            HOLD: '#ffe0b2',
            CLOSED: '#c8e6c9',
            DELAYED: '#ffcdd2',
            'IN PROGRESS': '#bbdefb'
          };
          const bgColor = isOverdue ? '#ffcdd2' : (statusColorMap[order.status] || '#f5f5f5');

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
                    Order #{order.id}
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '8px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label>
                      Due:{' '}
                      <input
                        type="date"
                        value={order.due_date}
                        onChange={(e) => {
                          updateOrder(order.id, { due_date: e.target.value });
                          if (onOrderUpdated) onOrderUpdated();
                        }}
                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </label>
                    <label>
                      Status:{' '}
                      <select
                        value={order.status}
                        onChange={(e) => {
                          updateOrder(order.id, { status: e.target.value });
                          if (onOrderUpdated) onOrderUpdated();
                        }}
                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                      >
                        <option value="NEW">New</option>
                        <option value="IN PROGRESS">In Progress</option>
                        <option value="HOLD">Hold</option>
                        <option value="CLOSED">Closed</option>
                        <option value="DELAYED">Delayed</option>
                      </select>
                    </label>
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
