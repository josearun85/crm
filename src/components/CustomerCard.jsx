import React, { useState, useRef, useEffect } from 'react';
import './CustomerCard.css';
import { updateOrder } from '../services/orderService';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { deleteCustomerWithFiles, updateCustomer } from '../services/customersService';
import SalesStageSelect from './SalesStageSelect';

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
    pan: customer.pan || '',
    about: customer.about || '',
    primary_stakeholder: customer.primary_stakeholder || '',
    secondary_stakeholder: customer.secondary_stakeholder || '',
    primary_phone: customer.primary_phone || '',
    secondary_phone: customer.secondary_phone || '',
    primary_email: customer.primary_email || '',
    secondary_email: customer.secondary_email || '',
    referral_source: customer.referral_source || ''
  });
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const [orderFeeds, setOrderFeeds] = useState({}); // { [orderId]: latestFeedDate }

  const goToGantt = (orderId) => {
    navigate(`/orders-v2/${orderId}`);
  };

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (hasUnsavedChanges && editing) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          setIsAutoSaving(true);
          await updateCustomer(customer.id, editBuffer);
          setHasUnsavedChanges(false);
          if (onOrderUpdated) {
            onOrderUpdated();
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsAutoSaving(false);
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editBuffer, editing, onOrderUpdated, hasUnsavedChanges, customer.id]);

  const handleInputChange = (field, value) => {
    setEditBuffer(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    async function fetchOrderFeeds() {
      if (!customer.orders || customer.orders.length === 0) return;
      const orderIds = customer.orders.map(o => o.id);
      // Fetch latest feed note for each order
      const { data, error } = await supabase
        .from('notes')
        .select('order_id, created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });
      if (error) return;
      // Map: orderId -> latest created_at
      const latestFeed = {};
      data.forEach(note => {
        if (!latestFeed[note.order_id] || new Date(note.created_at) > new Date(latestFeed[note.order_id])) {
          latestFeed[note.order_id] = note.created_at;
        }
      });
      setOrderFeeds(latestFeed);
    }
    fetchOrderFeeds();
  }, [customer.orders]);

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
          <form
            onSubmit={async e => {
              e.preventDefault();
              setSaving(true);
              try {
                await updateCustomer(customer.id, editBuffer);
                setEditing(false);
                if (onOrderUpdated) onOrderUpdated();
              } catch (err) {
                alert('Failed to update customer: ' + err.message);
              }
              setSaving(false);
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Name:</strong> <input value={editBuffer.name} onChange={e => handleInputChange('name', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Phone:</strong> <input value={editBuffer.phone} onChange={e => handleInputChange('phone', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Email:</strong> <input value={editBuffer.email} onChange={e => handleInputChange('email', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Address:</strong> <input value={editBuffer.address} onChange={e => handleInputChange('address', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Sales Stage:</strong> <SalesStageSelect
                    value={editBuffer.sales_stage}
                    onChange={e => handleInputChange('sales_stage', e.target.value)}
                    name="sales_stage"
                    placeholder="Sales Stage"
                  /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Primary Stakeholder:</strong> <input value={editBuffer.primary_stakeholder} onChange={e => handleInputChange('primary_stakeholder', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Primary Phone:</strong> <input value={editBuffer.primary_phone} onChange={e => handleInputChange('primary_phone', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Primary Email:</strong> <input value={editBuffer.primary_email} onChange={e => handleInputChange('primary_email', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Referral Source:</strong> <input value={editBuffer.referral_source} onChange={e => handleInputChange('referral_source', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Secondary Stakeholder:</strong> <input value={editBuffer.secondary_stakeholder} onChange={e => handleInputChange('secondary_stakeholder', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Secondary Phone:</strong> <input value={editBuffer.secondary_phone} onChange={e => handleInputChange('secondary_phone', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Secondary Email:</strong> <input value={editBuffer.secondary_email} onChange={e => handleInputChange('secondary_email', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Follow Up On:</strong> <input type="date" value={editBuffer.follow_up_on} onChange={e => handleInputChange('follow_up_on', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160 }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>GSTIN:</strong> <input value={editBuffer.gstin} onChange={e => handleInputChange('gstin', e.target.value.toUpperCase())} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160, textTransform: 'uppercase' }} /></label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>PAN:</strong> <input value={editBuffer.pan} onChange={e => handleInputChange('pan', e.target.value.toUpperCase())} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 160, textTransform: 'uppercase' }} /></label>
                </div>
              </div>
              <div style={{ flex: '100%', marginTop: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>About:</strong></label>
                  <textarea value={editBuffer.about} onChange={e => handleInputChange('about', e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: '100%', minHeight: 60, resize: 'vertical' }} placeholder="About this customer..." />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: '12px' }}>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={saving}
              >
                {isAutoSaving ? 'Auto-saving...' : 'Save'}
              </button>
              {isAutoSaving && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Auto-saving...
                </span>
              )}
              {!isAutoSaving && hasUnsavedChanges && (
                <span className="text-sm text-orange-500">
                  Unsaved changes
                </span>
              )}
              <button type="button" disabled={saving} onClick={() => { setEditing(false); setEditBuffer({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                sales_stage: customer.sales_stage || '',
                follow_up_on: customer.follow_up_on ? customer.follow_up_on.split('T')[0] : '',
                gstin: customer.gstin || '',
                pan: customer.pan || '',
                about: customer.about || '',
                primary_stakeholder: customer.primary_stakeholder || '',
                secondary_stakeholder: customer.secondary_stakeholder || '',
                primary_phone: customer.primary_phone || '',
                secondary_phone: customer.secondary_phone || '',
                primary_email: customer.primary_email || '',
                secondary_email: customer.secondary_email || '',
                referral_source: customer.referral_source || ''
              }); }} style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p><strong>Customer:</strong> {customer.name}</p>
              <p><strong>Phone:</strong> {customer.phone}</p>
              <p><strong>Email:</strong> {customer.email}</p>
              <p><strong>Address:</strong> {customer.address}</p>
              <p><strong>Sales Stage:</strong> {customer.sales_stage}</p>
              <p><strong>Primary Stakeholder:</strong> {customer.primary_stakeholder}</p>
              <p><strong>Primary Phone:</strong> {customer.primary_phone}</p>
              <p><strong>Primary Email:</strong> {customer.primary_email}</p>
              <p><strong>Referral Source:</strong> {customer.referral_source}</p>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p><strong>Secondary Stakeholder:</strong> {customer.secondary_stakeholder}</p>
              <p><strong>Secondary Phone:</strong> {customer.secondary_phone}</p>
              <p><strong>Secondary Email:</strong> {customer.secondary_email}</p>
              <p><strong>Follow Up On:</strong> {customer.follow_up_on ? customer.follow_up_on.split('T')[0] : ''}</p>
              <p><strong>GSTIN:</strong> {customer.gstin}</p>
              <p><strong>PAN:</strong> {customer.pan}</p>
            </div>
            {customer.about && (
              <div style={{ flex: '100%', marginTop: 8 }}>
                <p><strong>About:</strong> {customer.about}</p>
              </div>
            )}
            <div style={{ flexBasis: '100%', marginTop: 8 }}>
              <button onClick={() => setEditing(true)} style={{ background: '#fbc02d', color: '#333', border: 'none', borderRadius: 4, padding: '4px 12px', marginTop: 8, cursor: 'pointer' }}>Edit</button>
            </div>
          </div>
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
          const lastFeedDate = orderFeeds[order.id];

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
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>
                  <span>Created: {order.created_at ? moment(order.created_at).format('DD/MM/YYYY') : '-'}</span>
                  <span style={{ marginLeft: 12 }}>
                    Last Updated: {lastFeedDate ? moment(lastFeedDate).format('DD/MM/YYYY') : (order.updated_at ? moment(order.updated_at).format('DD/MM/YYYY') : '-')}
                  </span>
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
