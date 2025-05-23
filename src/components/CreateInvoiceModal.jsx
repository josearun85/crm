import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import supabase from '../supabaseClient';

export default function CreateInvoiceModal({ onCreate, onClose }) {
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      // Fetch all orders
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, name, customer_id')
        .order('created_at', { ascending: false });
      // Fetch all invoices to filter out orders with invoices
      const { data: allInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('order_id');
      if (!ordersError && !invoicesError) {
        const usedOrderIds = new Set((allInvoices || []).map(inv => inv.order_id));
        const availableOrders = (allOrders || []).filter(order => !usedOrderIds.has(order.id));
        setOrders(availableOrders);
      }
      setLoadingOrders(false);
    };
    fetchOrders();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orderId) {
      alert('Please select an order.');
      return;
    }
    // Find the selected order to get the customer_id
    const selectedOrder = orders.find(o => o.id === orderId);
    onCreate({
      order_id: orderId,
      customer_id: selectedOrder ? selectedOrder.customer_id : null,
      invoice_date: invoiceDate,
      notes,
      status: 'Draft',
      created_at: new Date().toISOString(),
    });
  };

  const orderOptions = orders.map(order => ({ value: order.id, label: order.name || order.id }));

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Invoice</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Order:
            <Select
              options={orderOptions}
              value={orderOptions.find(opt => opt.value === orderId) || null}
              onChange={opt => setOrderId(opt ? opt.value : '')}
              placeholder="Select an order"
              isClearable
              isSearchable
              required
            />
          </label>
          <label>
            Invoice Date:
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </label>
          <label>
            Notes:
            <textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          <div style={{ marginTop: 16 }}>
            <button type="submit">Create Draft</button>
            <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </form>
        {loadingOrders && <p>Loading orders...</p>}
      </div>
    </div>
  );
}
