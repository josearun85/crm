// Centralized utility to generate and download invoice PDF for any order
import { createRoot } from 'react-dom/client';
import InvoicePdf from '../pages/orders/tabs/InvoicePdf.jsx';
import supabase from '../supabaseClient';
import React from 'react';
import html2pdf from 'html2pdf.js';

export async function generateInvoicePdf({ orderId, invoiceId = null, isPdfMode = true }) {
  // Fetch order, customer, signage items, and BOQs
  const { data: orderArr = [] } = await supabase.from('orders').select('*').eq('id', orderId);
  const order = orderArr[0] || {};
  let customer = {};
  if (order.customer_id) {
    const { data: custArr = [] } = await supabase.from('customers').select('*').eq('id', order.customer_id);
    customer = custArr[0] || {};
  }
  const { data: signageItems = [] } = await supabase.from('signage_items').select('*').eq('order_id', orderId).order('sort_order', { ascending: true });
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
  // Prepare items for InvoicePdf (match order page logic)
  const items = signageItems.filter(i => i.name || i.description).map(item => {
    const itemBoqs = boqs.filter(b => b.signage_item_id === item.id);
    const totalCost = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0) * scaling;
    const qty = Number(item.quantity) || 1;
    const rate = totalCost / qty;
    return {
      name: item.name || '',
      description: item.description || '',
      hsn_code: item.hsn_code || '',
      qty: qty,
      unit: item.unit || '',
      rate: rate,
      amount: (rate * qty).toFixed(2),
      gst_percent: item.gst_percent || 18,
    };
  });
  const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
  const discountVal = Number(order.discount) || 0;
  const netTotal = total - discountVal;
  const gst = items.reduce((sum, item) => sum + (item.amount * (item.gst_percent || 18) / 100), 0);
  const grandTotal = netTotal + gst;
  function numberToWords(num) {
    // ...existing numberToWords logic from InvoicePdf.jsx...
    const a = [ '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen' ];
    const b = [ '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety' ];
    function inWords(n) {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
    }
    if (num === 0) return 'Zero';
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let words = inWords(rupees) + ' Rupees';
    if (paise > 0) words += ' and ' + inWords(paise) + ' Paise';
    words += ' Only';
    return words;
  }
  const amountInWords = numberToWords(grandTotal);
  const invoice = {
    number: order.invoice_number || 'DRAFT',
    version: order.version || 1,
    status: order.status || 'Draft',
    date: order.invoice_date ? new Date(order.invoice_date).toLocaleDateString('en-GB') : (order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')),
    place_of_supply: order.place_of_supply || 'Bangalore',
    sgst: (gst / 2).toFixed(2),
    cgst: (gst / 2).toFixed(2),
    total: total.toFixed(2),
    discount: discountVal.toFixed(2),
    taxable_value: netTotal.toFixed(2),
    grand_total: grandTotal.toFixed(2),
    amount_in_words: amountInWords,
    po_number: order.po_number || '',
    po_date: order.po_date || '',
  };
  // Create a hidden div in the current document
  let pdfDiv = document.getElementById('hidden-invoice-pdf-root');
  if (!pdfDiv) {
    pdfDiv = document.createElement('div');
    pdfDiv.id = 'hidden-invoice-pdf-root';
    pdfDiv.style.position = 'fixed';
    pdfDiv.style.left = '-9999px';
    pdfDiv.style.top = '0';
    pdfDiv.style.width = '794px';
    pdfDiv.style.background = '#fff';
    pdfDiv.style.zIndex = '-1';
    document.body.appendChild(pdfDiv);
  }
  pdfDiv.innerHTML = '';
  const root = createRoot(pdfDiv);
  root.render(
    InvoicePdf ?
      React.createElement(InvoicePdf, { invoice, customer, items, isPdfMode }) :
      null
  );
  // Wait for the component to render
  await new Promise(resolve => setTimeout(resolve, 500));
  // Use html2pdf to generate and download the PDF
  await html2pdf().set({
    margin: 0,
    filename: `Invoice_${invoice.number || ''}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all'] }
  }).from(pdfDiv).save();
  // Optionally, clean up the div
  setTimeout(() => { if (pdfDiv) pdfDiv.innerHTML = ''; }, 1000);
}
