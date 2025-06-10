import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { FaTrash, FaEdit, FaCheckCircle, FaTimesCircle, FaFilePdf, FaSync } from 'react-icons/fa';
import { calculateOrderGrandTotal } from '../services/orderService';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import InvoicePdf from '../pages/orders/tabs/InvoicePdf';
import html2pdf from 'html2pdf.js';
import { createRoot } from 'react-dom/client';
import { generateInvoicePdf } from '../services/generateInvoicePdf';

const PAGE_SIZE = 10;

export default function InvoiceList({ invoices, confirmedNumbers = [], onDelete, onReorder }) {
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
  const pendingInvoices = invoices.filter(inv => inv.status === 'Confirmed');
  const pastInvoices = invoices.filter(inv => inv.status !== 'Draft' && (inv.status !== 'Confirmed' || inv.payment_status === 'Paid'));
  const paginatedPending = pendingInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedPast = pastInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPendingPages = Math.ceil(pendingInvoices.length / PAGE_SIZE);
  const totalPastPages = Math.ceil(pastInvoices.length / PAGE_SIZE);

  // Helper: get all draft numbers already used by reverted drafts
  const revertedDraftNumbers = draftInvoices
    .filter(inv => inv.invoice_number && /^\d+$/.test(inv.invoice_number))
    .map(inv => parseInt(inv.invoice_number, 10));

  // Helper: get the next available draft number, skipping numbers used by confirmed invoices
  function getNextDraftLabel(idx) {
    // Get all used numbers (confirmed + draft with numeric invoice_number)
    const usedNumbers = invoices
      .filter(inv => inv.invoice_number && /^\d+$/.test(inv.invoice_number))
      .map(inv => parseInt(inv.invoice_number, 10));
    // The draft label should be draft{N} where N is the next available number after the highest used
    let n = 1;
    while (usedNumbers.includes(n)) n++;
    // If there are multiple drafts, increment for each draft row
    return `draft${n + idx}`;
  }

  // Compute missing numbers for drafts (next available numbers not used by any CONFIRMED invoice)
  function getDraftLabelsForDrafts(sortedDraftInvoices, confirmedNumbers) {
    const usedNumbers = Array.isArray(confirmedNumbers) && confirmedNumbers.length > 0
      ? confirmedNumbers
      : invoices
        .filter(inv => inv.status === 'Confirmed' && inv.invoice_number && /^\d+$/.test(inv.invoice_number))
        .map(inv => parseInt(inv.invoice_number, 10));
    const draftCount = sortedDraftInvoices.length;
    let missingNumbers = [];
    let n = 1;
    while (missingNumbers.length < draftCount) {
      if (!usedNumbers.includes(n)) missingNumbers.push(n);
      n++;
    }
    return missingNumbers;
  }

  // Sort: reverted drafts (with invoice_number) first, then new drafts, but draft number is always based on position
  const sortedDraftInvoices = [
    ...draftInvoices.filter(inv => inv.invoice_number && /^\d+$/.test(inv.invoice_number)),
    ...draftInvoices.filter(inv => !inv.invoice_number || !/^\d+$/.test(inv.invoice_number))
  ];

  // Track used draft numbers for new drafts
  let usedDraftNumbers = [...revertedDraftNumbers];

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
    inv.invoice_date = newDate;
    // Resequence all draft invoices by date
    const { data: drafts } = await supabase
      .from('invoices')
      .select('id, invoice_date')
      .eq('status', 'Draft');
    if (drafts && drafts.length > 0) {
      // Sort by invoice_date (oldest first), fallback to id for tie-breaker
      drafts.sort((a, b) => {
        if (a.invoice_date === b.invoice_date) return a.id - b.id;
        return new Date(a.invoice_date) - new Date(b.invoice_date);
      });
      for (let i = 0; i < drafts.length; i++) {
        await supabase.from('invoices').update({ invoice_number: String(i + 1) }).eq('id', drafts[i].id);
      }
    }
    if (onReorder) onReorder();
    setOrderMap(orderMap => ({ ...orderMap }));
  };

  // Helper to get next invoice number
  const getNextInvoiceNumber = () => {
    const numbers = invoices
      .filter(inv => inv.status !== 'Draft' && inv.invoice_number && /^\d+$/.test(inv.invoice_number))
      .map(inv => parseInt(inv.invoice_number, 10));
    return numbers.length ? Math.max(...numbers) + 1 : 1;
  };

  // Confirm draft invoice
  const handleConfirm = async (inv) => {
    // Fetch the latest confirmed invoice number from the database to avoid duplicates
    const { data: confirmedInvoices, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('status', 'Confirmed')
      .order('invoice_number', { ascending: false })
      .limit(1);
    let nextNumber = 1;
    if (!error && confirmedInvoices && confirmedInvoices.length > 0) {
      const lastNum = parseInt(confirmedInvoices[0].invoice_number, 10);
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }
    // Save a JSON snapshot (for now, just a shallow copy)
    const invoice_json_snapshot = { ...inv };
    await supabase.from('invoices').update({
      status: 'Confirmed',
      invoice_number: String(nextNumber),
      invoice_json_snapshot,
      invoice_date: inv.invoice_date || new Date().toISOString().slice(0, 10)
    }).eq('id', inv.id);
    if (onReorder) onReorder();
  };

  // Revert confirmed invoice to draft
  const handleRevert = async (inv) => {
    await supabase.from('invoices').update({
      status: 'Draft',
      invoice_number: null,
      invoice_json_snapshot: null
    }).eq('id', inv.id);
    if (onReorder) onReorder();
  };

  // Detect if this is the Drafts tab (all invoices are drafts)
  const allDrafts = invoices.length > 0 && invoices.every(inv => inv.status === 'Draft');

  // Replace the handlePreviewInvoicePdf to match the SignageItemsTab preview flow
  const handlePreviewInvoicePdf = async (inv) => {
    // Fetch order, customer, signage items, and BOQs for this invoice
    const { data: orderArr = [] } = await supabase.from('orders').select('*').eq('id', inv.order_id);
    const order = orderArr[0] || {};
    let customer = {};
    if (order.customer_id) {
      const { data: custArr = [] } = await supabase.from('customers').select('*').eq('id', order.customer_id);
      customer = custArr[0] || {};
    }
    const { data: signageItems = [] } = await supabase.from('signage_items').select('*').eq('order_id', inv.order_id).order('sort_order', { ascending: true });
    const signageItemIds = signageItems.map(i => i.id);
    let boqs = [];
    if (signageItemIds.length > 0) {
      const { data: boqsData = [] } = await supabase.from('boq_items').select('*').in('signage_item_id', signageItemIds);
      boqs = boqsData;
    }
    // Calculate scaling for GST billable percent/amount
    let scaling = 1;
    if (order.gst_billable_percent !== undefined && order.gst_billable_percent !== null && order.gst_billable_percent !== '' && Number(order.gst_billable_percent) !== 100) {
      scaling = Number(order.gst_billable_percent) / 100;
    } else if (order.gst_billable_amount && signageItems.length) {
      const originalTotal = signageItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
      if (originalTotal && Number(order.gst_billable_amount) !== originalTotal) {
        scaling = Number(order.gst_billable_amount) / originalTotal;
      }
    }
    // Prepare items for InvoicePdf (match SignageItemsTab logic)
    // Pass raw signageItems and allBoqs, not mapped/flattened items
    // InvoicePdf will handle margin/BOQ logic
    // Compose all header fields for InvoicePdf
    const invoiceData = {
      ...inv,
      invoice_number: inv.invoice_number || inv.number || '-',
      invoice_date: inv.invoice_date || inv.date || '-',
      place_of_supply: order.place_of_supply || '-',
      po_number: order.po_number || inv.po_number || '',
      po_date: order.po_date || inv.po_date || '',
      status: inv.status,
      discount: typeof inv.discount !== 'undefined' && inv.discount !== null ? inv.discount : (order.discount || 0),
    };
    // Open a new tab and render the invoice preview
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }
    previewWindow.document.write(`
      <html>
        <head>
          <title>Invoice Preview</title>
          <style>body { margin: 0; padding: 0; font-family: sans-serif; }</style>
        </head>
        <body>
          <div id="invoice-preview-root"></div>
          <button id="download-pdf-btn" style="position:fixed;top:16px;right:16px;z-index:1000;padding:8px 16px;font-size:16px;">⬇️ Download PDF</button>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <script>
            document.getElementById('download-pdf-btn').onclick = function() {
              var root = document.getElementById('invoice-preview-root');
              html2pdf().set({
                margin: 0,
                filename: 'Invoice_${invoiceData.invoice_number || 'DRAFT'}.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all'] }
              }).from(root).save();
            };
          <\/script>
        </body>
      </html>
    `);
    previewWindow.document.close();
    // Wait for the new tab to load, then render the React component
    const renderReact = () => {
      const root = previewWindow.document.getElementById('invoice-preview-root');
      if (!root) {
        setTimeout(renderReact, 100);
        return;
      }
      const reactRoot = createRoot(root);
      reactRoot.render(
        InvoicePdf ?
          React.createElement(InvoicePdf, {
            invoice: invoiceData,
            customer,
            items: signageItems, // pass raw signageItems
            allBoqs: boqs,       // pass raw boqs
            isPdfMode: true
          }) :
          null
      );
    };
    setTimeout(renderReact, 200);
  };

  return (
    <div>
      {allDrafts ? (
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
                    // Compute draft labels before mapping
                    (() => {
                      const draftLabels = getDraftLabelsForDrafts(sortedDraftInvoices, confirmedNumbers);
                      return sortedDraftInvoices.map((inv, idx) => {
                        const order = orderMap[inv.order_id];
                        const customer = order ? customerMap[order.customer_id] : null;
                        return (
                          <Draggable key={inv.id} draggableId={String(inv.id)} index={idx}>
                            {(provided, snapshot) => (
                              <tr ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style, background: snapshot.isDragging ? '#ffe066' : undefined }}>
                                <td {...provided.dragHandleProps} style={{ cursor: 'grab', width: 24, textAlign: 'center' }}>☰</td>
                                <td>{inv.status === 'Draft' ? `draft${draftLabels[idx]}` : inv.invoice_number || '-'}</td>
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
                                <td>{customer ? (
                                  <a href={`/customers?selected=${customer.id}`} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }} target="_blank" rel="noopener noreferrer">{customer.name}</a>
                                ) : '-'}</td>
                                <td>{customer ? customer.gstin : '-'}</td>
                                <td>{order ? (
                                  <a href={`/orders-v2/${order.id}`} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }} target="_blank" rel="noopener noreferrer">{order.name || order.id}</a>
                                ) : '-'}</td>
                                <td>{inv.status}</td>
                                <td>{getTotal(inv)}</td>
                                <td className="actions">
                                  <button onClick={() => handleDelete(inv.id)} title="Delete"><FaTrash style={{color:'#d32f2f'}} /> Delete</button>
                                  <button title="Edit"><FaEdit /> Edit</button>
                                  {inv.status === 'Draft' && (
                                    <button title="Confirm" onClick={() => handleConfirm(inv)}><FaCheckCircle style={{color:'#388e3c'}} /> Confirm</button>
                                  )}
                                  {inv.status === 'Confirmed' && (
                                    <button title="Revert to Draft" onClick={() => handleRevert(inv)}><FaTimesCircle style={{color:'#d32f2f'}} /> Revert</button>
                                  )}
                                  <button title="Download Invoice" onClick={() => handlePreviewInvoicePdf(inv)}><FaFilePdf style={{color:'#1976d2'}} /> PDF</button>
                                </td>
                              </tr>
                            )}
                          </Draggable>
                        );
                      });
                    })()
                  )}
                  {provided.placeholder}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <table className="invoice-list-table">
          <thead>
            <tr>
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
              <tr><td colSpan={8} style={{textAlign:'center'}}>Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center' }}>No invoices found.</td>
              </tr>
            ) : (
              invoices.map((inv, idx) => {
                const order = orderMap[inv.order_id];
                const customer = order ? customerMap[order.customer_id] : null;
                return (
                  <tr key={inv.id}>
                    <td>{inv.invoice_number || '-'}</td>
                    <td>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}</td>
                    <td>{customer ? (
                      <a href={`/customers?selected=${customer.id}`} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }} target="_blank" rel="noopener noreferrer">{customer.name}</a>
                    ) : '-'}</td>
                    <td>{customer ? customer.gstin : '-'}</td>
                    <td>{order ? (
                      <a href={`/orders-v2/${order.id}`} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }} target="_blank" rel="noopener noreferrer">{order.name || order.id}</a>
                    ) : '-'}</td>
                    <td>{inv.status}</td>
                    <td>{getTotal(inv)}</td>
                    <td className="actions">
                      <button onClick={() => handleDelete(inv.id)} title="Delete"><FaTrash style={{color:'#d32f2f'}} /> Delete</button>
                      <button title="Edit"><FaEdit /> Edit</button>
                      {inv.status === 'Draft' && (
                        <button title="Confirm" onClick={() => handleConfirm(inv)}><FaCheckCircle style={{color:'#388e3c'}} /> Confirm</button>
                      )}
                      {inv.status === 'Confirmed' && (
                        <button title="Revert to Draft" onClick={() => handleRevert(inv)}><FaTimesCircle style={{color:'#d32f2f'}} /> Revert</button>
                      )}
                      <button title="Download Invoice" onClick={() => handlePreviewInvoicePdf(inv)}><FaFilePdf style={{color:'#1976d2'}} /> PDF</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

