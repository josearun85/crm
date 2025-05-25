import React, { useState } from 'react';
import './CustomerCard.css';
import { updateOrder } from '../services/orderService';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { deleteCustomerWithFiles } from '../services/customersService';
import { updateCustomerDetails } from '../pages/orders/services/orderDetailsService';

export default function CustomerCard({ customer, onOrderUpdated }) { 
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    sales_stage: customer.sales_stage || '',
    follow_up_on: customer.follow_up_on ? customer.follow_up_on.split('T')[0] : '',
    gstin: customer.gstin || '',
    pan: customer.pan || ''
  });
  const [saving, setSaving] = useState(false);

  const goToGantt = (orderId) => {
    navigate(`/orders-v2/${orderId}`);
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
        {editing ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <label><strong>Name:</strong> <input value={editBuffer.name} onChange={e => setEditBuffer(buf => ({ ...buf, name: e.target.value }))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} /></label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label><strong>Phone:</strong> <input value={editBuffer.phone} onChange={e => setEditBuffer(buf => ({ ...buf, phone: e.target.value }))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} /></label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label><strong>Email:</strong> <input value={editBuffer.email} onChange={e => setEditBuffer(buf => ({ ...buf, email: e.target.value }))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} /></label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label><strong>Address:</strong> <input value={editBuffer.address} onChange={e => setEditBuffer(buf => ({ ...buf, address: e.target.value }))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 240 }} /></label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label><strong>Sales Stage:</strong> <input value={editBuffer.sales_stage} onChange={e => setEditBuffer(buf => ({ ...buf, sales_stage: e.target.value }))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} /></label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label><strong>Follow Up On:</strong> <input type="date" value={editBuffer.follow_up_on} onChange={e => setEditBuffer(buf => ({ ...buf, follow_up_on: e.target.value }))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} /></label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label><strong>GSTIN:</strong> <input value={editBuffer.gstin} onChange={e => setEditBuffer(buf => ({ ...buf, gstin: e.target.value }))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', textTransform: 'uppercase' }} /></label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label><strong>PAN:</strong> <input value={editBuffer.pan} onChange={e => setEditBuffer(buf => ({ ...buf, pan: e.target.value }))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', textTransform: 'uppercase' }} /></label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={saving} onClick={async () => {
                setSaving(true);
                try {
                  await updateCustomerDetails(customer.id, editBuffer);
                  setEditing(false);
                  if (onOrderUpdated) onOrderUpdated();
                } catch (err) {
                  alert('Failed to update customer: ' + err.message);
                }
                setSaving(false);
              }} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', marginRight: 8, cursor: 'pointer' }}>Save</button>
              <button disabled={saving} onClick={() => { setEditing(false); setEditBuffer({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                sales_stage: customer.sales_stage || '',
                follow_up_on: customer.follow_up_on ? customer.follow_up_on.split('T')[0] : '',
                gstin: customer.gstin || '',
                pan: customer.pan || ''
              }); }} style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p><strong>Customer:</strong> {customer.name}</p>
            <p><strong>Phone:</strong> {customer.phone}</p>
            <p><strong>Email:</strong> {customer.email}</p>
            <p><strong>Address:</strong> {customer.address}</p>
            <p><strong>Sales Stage:</strong> {customer.sales_stage}</p>
            <p><strong>Follow Up On:</strong> {customer.follow_up_on ? customer.follow_up_on.split('T')[0] : ''}</p>
            <p><strong>GSTIN:</strong> {customer.gstin}</p>
            <p><strong>PAN:</strong> {customer.pan}</p>
            <button onClick={() => setEditing(true)} style={{ background: '#fbc02d', color: '#333', border: 'none', borderRadius: 4, padding: '4px 12px', marginTop: 8, cursor: 'pointer' }}>Edit</button>
          </>
        )}

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
          const normalizedStatus = order.status?.toUpperCase();
          const isOverdue = moment(order.due_date).isBefore(moment(), 'day') && normalizedStatus !== 'CLOSED';

          const statusColorMap = {
            NEW: '#fff9c4',
            "IN PROGRESS": '#fff9c4',
            HOLD: '#ffe0b2',
            CLOSED: '#c8e6c9',
            DELAYED: '#ffcdd2',
          };
          const bgColor = isOverdue ? '#ffcdd2' : (statusColorMap[normalizedStatus] || '#f5f5f5');

          return (
            <div key={`order-${order.id}`} style={{ paddingLeft: '2rem', marginBottom: '10px' }}>
              <div
                style={{
                  backgroundColor: bgColor,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  borderRadius: '6px',
                  padding: '12px',
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
                      value={normalizedStatus}
                      onChange={(e) => {
                        updateOrder(order.id, { status: e.target.value.toLowerCase() });
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
            </div>
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

            const stepNames = [
              'Site Visit',
              'Design approval',
              'Cost estimate',
              'Advance payment',
              'Letter cutting order',
              'Template specification',
              'Letter fixing preparation',
              'Letter placement'
            ];

            const today = new Date();
            const steps = stepNames.map((name, index) => {
              const start = new Date(today);
              start.setDate(start.getDate() + index * 2);
              const end = new Date(start);
              end.setDate(end.getDate() + 1);
              return {
                order_id: order.id,
                description: name,
                start_date: start.toISOString().slice(0, 10),
                end_date: end.toISOString().slice(0, 10),
                status: 'OPEN',
                delayed: false,
                files: [],
                comments: []
              };
            });

            const { error: stepError } = await supabase.from('order_steps').insert(steps);
            if (stepError) {
              console.error('Error inserting default steps:', stepError);
              return;
            }

            navigate(`/orders/${order.id}`);
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
