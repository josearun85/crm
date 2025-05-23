import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { FaTrash, FaEdit, FaCheckCircle, FaTimesCircle, FaFilePdf, FaSync } from 'react-icons/fa';
import { calculateOrderGrandTotal } from '../services/orderService';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const PAGE_SIZE = 10;

export default function InvoiceList({ invoices, onDelete, onReorder }) {
  const [orderMap, setOrderMap] = useState({});
  const [customerMap, setCustomerMap] = useState({});
  const [signageItemsMap, setSignageItemsMap] = useState({});
  const [boqMap, setBoqMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      // Get all unique order_ids from invoices
      const orderIds = [...new Set(invoices.map(inv => inv.order_id).filter(Boolean))];
      // Fetch all orders in one go
      let orderMapTemp = {};
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, name, customer_id, discount, gst_billable_percent, gst_billable_amount')
          .in('id', orderIds);
        orderMapTemp = (orders || []).reduce((acc, order) => {
          acc[order.id] = order;
          return acc;
        }, {});
      }
      // Get all unique customer_ids from orders
      const customerIds = [...new Set(Object.values(orderMapTemp).map(o => o.customer_id).filter(Boolean))];
      // Fetch all customers in one go
      let customerMapTemp = {};
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, gstin')
          .in('id', customerIds);
        customerMapTemp = (customers || []).reduce((acc, c) => {
          acc[c.id] = c;
          return acc;
        }, {});
      }
      // Fetch all signage_items for these orders
      let signageItemsMapTemp = {};
      if (orderIds.length > 0) {
        const { data: signageItems } = await supabase
          .from('signage_items')
          .select('id, order_id, gst_percent, quantity, cost')
          .in('order_id', orderIds);
        signageItemsMapTemp = {};
        (signageItems || []).forEach(item => {
          if (!signageItemsMapTemp[item.order_id]) signageItemsMapTemp[item.order_id] = [];
          signageItemsMapTemp[item.order_id].push(item);
        });
      }
      // Fetch all BOQs for these signage_items
      const signageItemIds = Object.values(signageItemsMapTemp).flat().map(item => item.id);
      let boqMapTemp = {};
      if (signageItemIds.length > 0) {
        const { data: boqs } = await supabase
          .from('boq_items') // <-- fixed table name
          .select('id, signage_item_id, quantity, cost_per_unit')
          .in('signage_item_id', signageItemIds);
        boqMapTemp = {};
        (boqs || []).forEach(boq => {
          if (!boqMapTemp[boq.signage_item_id]) boqMapTemp[boq.signage_item_id] = [];
          boqMapTemp[boq.signage_item_id].push(boq);
        });
      }
      setOrderMap(orderMapTemp);
      setCustomerMap(customerMapTemp);
      setSignageItemsMap(signageItemsMapTemp);
      setBoqMap(boqMapTemp);
      setLoading(false);
    }
    if (invoices.length > 0) fetchDetails();
  }, [invoices]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft invoice?')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      alert('Error deleting invoice: ' + error.message);
      return;
    }
    onDelete(id);
  };

  // Calculate total using shared utility (matches SignageItemsTab logic)
  const getTotal = (inv) => {
    if (inv.invoice_json_snapshot && inv.invoice_json_snapshot.total) return inv.invoice_json_snapshot.total;
    const orderId = inv.order_id;
    const signageItems = signageItemsMap[orderId] || [];
    const boqs = boqMap;
    // Fetch discount, gstBillablePercent, gstBillableAmount from order (if available)
    const order = orderMap[orderId] || {};
    const discount = order.discount || 0;
    const gstBillablePercent = order.gst_billable_percent;
    const gstBillableAmount = order.gst_billable_amount;
    const result = calculateOrderGrandTotal({ signageItems, boqs, discount, gstBillablePercent, gstBillableAmount });
    return result.grandTotal ? result.grandTotal.toFixed(2) : '-';
  };

  // Find the last confirmed invoice number
  const lastLegalNumber = invoices
    .filter(inv => inv.status !== 'Draft' && inv.invoice_number && /^\d+$/.test(inv.invoice_number))
    .map(inv => parseInt(inv.invoice_number, 10))
    .reduce((max, n) => Math.max(max, n), 0);

  // Split invoices by status
  const draftInvoices = invoices.filter(inv => inv.status === 'Draft');
  const pendingInvoices = invoices.filter(inv => inv.status === 'Confirmed' && inv.payment_status !== 'Paid');
  const pastInvoices = invoices.filter(inv => inv.status !== 'Draft' && (inv.status !== 'Confirmed' || inv.payment_status === 'Paid'));
  const paginatedPending = pendingInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedPast = pastInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPendingPages = Math.ceil(pendingInvoices.length / PAGE_SIZE);
  const totalPastPages = Math.ceil(pastInvoices.length / PAGE_SIZE);

  // Sort draft invoices by sort_order (or fallback to created_at/id)
  const sortedDraftInvoices = [...draftInvoices].sort((a, b) => {
    if (a.sort_order !== undefined && b.sort_order !== undefined) return a.sort_order - b.sort_order;
    if (a.created_at && b.created_at) return new Date(a.created_at) - new Date(b.created_at);
    return (a.id || 0) - (b.id || 0);
  });

  // Handle drag end for draft invoices
  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(sortedDraftInvoices);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    // Update sort_order in DB and in-memory
    for (let i = 0; i < reordered.length; i++) {
      reordered[i].sort_order = i;
      await supabase.from('invoices').update({ sort_order: i }).eq('id', reordered[i].id);
    }
    if (onReorder) onReorder(); // Ask parent to refresh
  };

  const handleDateChange = async (inv, newDate) => {
    await supabase.from('invoices').update({ invoice_date: newDate }).eq('id', inv.id);
    // Optionally, refresh the UI or update state
    inv.invoice_date = newDate;
    // Force re-render
    setOrderMap(orderMap => ({ ...orderMap }));
  };

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="draft-invoices-droppable" direction="vertical">
          {(provided) => (
            <table className="invoice-list-table" ref={provided.innerRef} {...provided.droppableProps}>
              <thead>
                <tr>
                  <th></th>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>GSTIN</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{textAlign:'center'}}>Loading...</td></tr>
                ) : sortedDraftInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center' }}>No draft invoices found.</td>
                  </tr>
                ) : (
                  sortedDraftInvoices.map((inv, idx) => {
                    const order = orderMap[inv.order_id];
                    const customer = order ? customerMap[order.customer_id] : null;
                    return (
                      <Draggable key={inv.id} draggableId={String(inv.id)} index={idx}>
                        {(provided, snapshot) => (
                          <tr ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style, background: snapshot.isDragging ? '#ffe066' : undefined }}>
                            <td {...provided.dragHandleProps} style={{ cursor: 'grab', width: 24, textAlign: 'center' }}>☰</td>
                            <td>{inv.status === 'Draft' ? `draft${lastLegalNumber + sortedDraftInvoices.findIndex(d => d.id === inv.id) + 1}` : inv.invoice_number || '-'}</td>
                            <td>
                              {inv.status === 'Draft' ? (
                                <input
                                  type="date"
                                  value={inv.invoice_date ? inv.invoice_date.slice(0, 10) : ''}
                                  onChange={e => handleDateChange(inv, e.target.value)}
                                  style={{ minWidth: 110 }}
                                />
                              ) : (
                                inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'
                              )}
                            </td>
                            <td>{customer ? customer.name : '-'}</td>
                            <td>{customer ? customer.gstin : '-'}</td>
                            <td>{order ? (order.name || order.id) : '-'}</td>
                            <td>{inv.status}</td>
                            <td>{getTotal(inv)}</td>
                            <td className="actions">
                              <button onClick={() => handleDelete(inv.id)} title="Delete"><FaTrash style={{color:'#d32f2f'}} /> Delete</button>
                              <button title="Edit"><FaEdit /> Edit</button>
                              <button title="Confirm"><FaCheckCircle style={{color:'#388e3c'}} /> Confirm</button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
              </tbody>
            </table>
          )}
        </Droppable>
      </DragDropContext>
      {totalPendingPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 8 }}>
          <button onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</button>
          <span>Page {page} of {totalPendingPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page === totalPendingPages}>Next</button>
        </div>
      )}
    </div>
  );
}

