import React, { useState } from 'react';
import './CustomerCard.css';
import { updateOrder } from '../services/orderService';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { deleteCustomerWithFiles } from '../services/customersService';

export default function CustomerCard({ customer, onOrderUpdated }) { 
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const goToGantt = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="customer-card" style={{ background: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}> 
      <div className="customer-info" style={{ marginBottom: '1rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
          <button onClick={() => setMenuOpen(prev => !prev)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>⋮</button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: '1.5rem', right: 0, background: '#fff', border: '1px solid #ccc', padding: '0.5rem', borderRadius: '4px' }}>
              <button onClick={() => { setMenuOpen(false); setShowConfirm(true); }} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
                Delete Customer
              </button>
            </div>
          )}
        </div>
        <p><strong>Customer:</strong> {customer.name}</p>
        <p><strong>Phone:</strong> {customer.phone}</p>
        <p><strong>Email:</strong> {customer.email}</p>

        {showConfirm && (
          <div style={{ marginTop: '0.5rem' }}>
            <p>Type <strong>{customer.name}</strong> to confirm deletion:</p>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '6px' }}
            />
            <br />
            <button
              disabled={typedName !== customer.name}
              onClick={async () => {
                try {
                  await deleteCustomerWithFiles(customer.id);
                  if (onOrderUpdated) onOrderUpdated();
                  setShowConfirm(false);
                  setTypedName('');
                } catch (err) {
                  alert('Failed to delete customer: ' + err.message);
                }
              }}
              style={{
                backgroundColor: typedName === customer.name ? '#d32f2f' : '#ccc',
                color: '#fff',
                padding: '6px 10px',
                border: 'none',
                borderRadius: '4px',
                cursor: typedName === customer.name ? 'pointer' : 'not-allowed'
              }}
            >
              Confirm Delete
            </button>
          </div>
        )}
      </div>
      <div className="order-summary">
        {customer.orders?.map(order => {
          const isOverdue = moment(order.due_date).isBefore(moment(), 'day') && order.status?.toUpperCase() !== 'CLOSED';

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
      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
        <button
          onClick={async () => {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);

            const { data: order, error: orderError } = await supabase
              .from('orders')
              .insert([{ customer_id: customer.id, due_date: dueDate.toISOString().slice(0, 10) }])
              .select()
              .single();

            if (orderError) {
              console.error('Error creating order:', orderError);
              return;
            }

            if (onOrderUpdated) onOrderUpdated();
          }}
          style={{
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer'
          }}
        >
          + Add Order
        </button>
      </div>
    </div>
  );
}
