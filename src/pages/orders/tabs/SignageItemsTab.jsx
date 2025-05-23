import { useEffect, useState, useRef, useLayoutEffect } from "react";
import html2pdf from "html2pdf.js";
import SignageItemsPdf from "./SignageItemsPdf";
import InvoicePdf from "./InvoicePdf";
import { fetchSignageItems, fetchBoqItems, addBoqItem, deleteBoqItem, updateBoqItem, addSignageItem, updateSignageItem, deleteSignageItem, fetchProcurementTasks, ensureFabricationStepsForSignageItems, fetchInventory, addFeedNote, fetchOrderOverview, updateOrderDetails } from "../services/orderDetailsService";
import { createRoot } from "react-dom/client";
import Select from 'react-select';

const unitOptions = [
  { value: 'nos', label: 'nos' },
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'm' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
  { value: 'ft', label: 'ft' },
  { value: 'inch', label: 'inch' },
  { value: 'set', label: 'set' },
  { value: 'box', label: 'box' },
  { value: 'sheet', label: 'sheet' },
  { value: 'trip', label: 'trip (logistics)' },
  { value: 'km', label: 'km (logistics)' },
  { value: 'hour', label: 'hour (man hours)' },
  { value: 'day', label: 'day (man hours)' },
  { value: 'lump sum', label: 'lump sum' },
];

export default function SignageItemsTab({ orderId, customerGstin, setCustomerGstin, customerPan, setCustomerPan, gstBillableAmount, gstBillablePercent }) {
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [boqs, setBoqs] = useState([]);
  const [allBoqs, setAllBoqs] = useState([]);
  const [showBoqForItemId, setShowBoqForItemId] = useState(null);
  const [procuredBoqIds, setProcuredBoqIds] = useState(new Set());
  const [procurementTasksByBoqId, setProcurementTasksByBoqId] = useState({});
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [newBoq, setNewBoq] = useState({ material: "", quantity: 1, unit: "", cost_per_unit: "" });
  const [blankBoqRow, setBlankBoqRow] = useState({ material: '', quantity: 1, unit: '', cost_per_unit: '' });
  const [discount, setDiscount] = useState(0);
  const [showPdf, setShowPdf] = useState(false);
  const pdfRef = useRef();
  const pdfDivRef = useRef();
  const [customer, setCustomer] = useState(null);
  const [editingUnitIdx, setEditingUnitIdx] = useState(null);

  // Helper to keep refs for each textarea
  const descriptionRefs = useRef({});

  // Auto-resize textarea on value change
  useLayoutEffect(() => {
    items.forEach((item, idx) => {
      const ref = descriptionRefs.current[item.id || idx];
      if (ref) {
        ref.style.height = 'auto';
        ref.style.height = ref.scrollHeight + 'px';
      }
    });
  }, [items]);

  // Helper to get GST-billable scaling factor and apply to item costs
  function getGstBillableScaling(items) {
    // If gstBillablePercent is set and not 100, use it for scaling
    if (gstBillablePercent !== undefined && gstBillablePercent !== null && gstBillablePercent !== '' && Number(gstBillablePercent) !== 100) {
      return Number(gstBillablePercent) / 100;
    }
    // Otherwise, use gstBillableAmount logic
    const billable = Number(gstBillableAmount);
    if (!billable || !items.length) return 1;
    const originalTotal = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    if (!originalTotal || billable === originalTotal) return 1;
    return billable / originalTotal;
  }

  // Helper to get scaled rate for an item
  function getScaledRate(item) {
    const scaling = getGstBillableScaling(items);
    const itemBoqs = allBoqs.filter(b => b.signage_item_id === item.id);
    const totalCost = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
    const qty = Number(item.quantity) || 1;
    if (!qty) return 0;
    return (totalCost / qty) * scaling;
  }

  // Add Item button handler
  const handleAddBlankItem = async () => {
    try {
      const added = await addSignageItem(orderId, { name: '', description: '', quantity: 1, cost: 0 });
      setItems((prev) => [...prev, added]);
    } catch (err) {
      // Optionally show error
      console.error("Failed to add item", err);
    }
  };

  const getScaledItems = () => {
    const scaling = getGstBillableScaling(items);
    return items.map(item => ({ ...item, cost: Number(item.cost || 0) * scaling }));
  };

  const handleDownloadPdf = async () => {
    const itemsScaled = getScaledItems();
    const allBoqs = await fetchBoqItems(orderId);
    const pdfData = {
      items: itemsScaled.filter(i => i.name || i.description),
      allBoqs,
      discount,
      orderId,
      totalCost,
      netTotal,
      gst,
      grandTotal,
      customer, // pass full customer object
    };
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }
    pdfWindow.document.write(`
      <html>
        <head>
          <title>Estimate PDF</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <div id="pdf-root">${renderPdfHtml(pdfData)}</div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <script>
            function exportPDF() {
              var root = document.getElementById('pdf-root');
              if (window.html2pdf) {
                html2pdf().set({
                  margin: 0.2,
                  filename: 'Signage_Estimate_${orderId}.pdf',
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                }).from(root).save();
              } else {
                setTimeout(exportPDF, 200);
              }
            }
            exportPDF();
          <\/script>
        </body>
      </html>
    `);
    pdfWindow.document.close();
  };

  const handleDownloadInvoicePdf = async () => {
    const scaling = getGstBillableScaling(items);
    const allBoqs = await fetchBoqItems(orderId);

    // Fetch all required data
    const order = await fetchOrderOverview(orderId);

    // Prepare customer info
    const customer = order.customer || {};

    // Calculate item-wise cost and invoice lines (with scaling)
    const itemsScaled = items.filter(i => i.name || i.description).map(item => {
      const itemBoqs = allBoqs.filter(b => b.signage_item_id === item.id);
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

    // Calculate totals (with scaling)
    const total = itemsScaled.reduce((sum, i) => sum + Number(i.amount), 0);
    const discountVal = Number(order.discount) || 0;
    const netTotal = total - discountVal;
    const gst = itemsScaled.reduce((sum, item) => sum + (item.amount * (item.gst_percent || 18) / 100), 0);
    const grandTotal = netTotal + gst;

    // Amount in words
    function numberToWords(num) {
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

    // Prepare invoice object for InvoicePdf
    const invoice = {
      number: order.id,
      version: order.version || 1,
      date: order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
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

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(<InvoicePdf invoice={invoice} customer={customer} items={itemsScaled} />);

    setTimeout(() => {
      html2pdf().set({
        margin: 0.2,
        filename: `Invoice_${invoice.number || ""}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
      }).from(container).save().then(() => {
        root.unmount();
        document.body.removeChild(container);
      });
    }, 300);
  };

  // Helper to render the PDF HTML as a string
  function renderPdfHtml({ items, allBoqs, discount, orderId, totalCost, netTotal, gst, grandTotal, customerGstin }) {
    const scaling = getGstBillableScaling(items);
    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const orderVersion = 1; // Placeholder for version
    const orderYear = new Date().getFullYear(); // Placeholder for year
    // GST summary calculation by rate
    const gstSummary = {};
    items.forEach(item => {
      const cost = allBoqs.filter(b => b.signage_item_id === item.id).reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0) * scaling;
      const gstPercent = Number(item.gst_percent ?? 18);
      if (!gstSummary[gstPercent]) gstSummary[gstPercent] = 0;
      gstSummary[gstPercent] += cost * gstPercent / 100;
    });
    const isKarnataka = (customerGstin || "").trim().toUpperCase().startsWith("29");

    // --- Summary Table (matches InvoicePdf.jsx and UI) ---
    let gstRows = '';
    if (isKarnataka) {
      Object.entries(gstSummary).forEach(([rate, amount]) => {
        if (amount > 0.001) {
          const halfRate = (Number(rate) / 2).toFixed(1).replace(/\.0$/, "");
          const halfAmount = (amount / 2).toFixed(2);
          gstRows += `<div style='display:flex;justify-content:space-between;'><span>CGST</span><span>₹ ${halfAmount} (${halfRate}%)</span></div>`;
          gstRows += `<div style='display:flex;justify-content:space-between;'><span>SGST</span><span>₹ ${halfAmount} (${halfRate}%)</span></div>`;
        }
      });
    } else {
      Object.entries(gstSummary).forEach(([rate, amount]) => {
        if (amount > 0.001) {
          gstRows += `<div style='display:flex;justify-content:space-between;'><span>IGST</span><span>₹ ${amount.toFixed(2)} (${rate}%)</span></div>`;
        }
      });
    }

    // Calculate scaled line items for PDF
    const scaledLineItems = items.map((item, idx) => {
      const cost = allBoqs.filter(b => b.signage_item_id === item.id).reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0) * scaling;
      const qty = Number(item.quantity) || 1;
      const rate = cost / qty;
      const amount = cost;
      const gstPercent = Number(item.gst_percent ?? 18);
      const gstAmount = amount * gstPercent / 100;
      const costAfterTax = amount + gstAmount;
      return { idx, item, qty, rate, amount, gstPercent, gstAmount, costAfterTax };
    });

    // Totals
    const pdfTotalCost = scaledLineItems.reduce((sum, l) => sum + l.amount, 0);
    const pdfNetTotal = pdfTotalCost - discount;
    const pdfGst = scaledLineItems.reduce((sum, l) => sum + l.gstAmount, 0);
    const pdfGrandTotal = pdfNetTotal + pdfGst;

    return `
      <div style='font-family: "Segoe UI", Arial, sans-serif; max-width: 730px; margin: 0 auto; color: #222; font-size: 13px; padding: 0 18px; box-sizing: border-box;'>
        <div style='display: flex; align-items: center; border-bottom: 2px solid #0a3d62; padding-bottom: 12px; margin-bottom: 18px;'>
          <img src='/logo.png' alt='Sign Company Logo' style='height: 55px; margin-right: 18px;' />
          <div>
            <div style='font-size: 22px; font-weight: bold; color: #0a3d62;'>Sign Company</div>
            <div style='font-size: 12px; color: #555;'>Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bangalore - 560 075</div>
            <div style='font-size: 12px; color: #555;'>M: +91 8431505007 | GSTN: 29BPYPK6641B2Z6 | PAN: BPYPK6641B</div>
          </div>
        </div>
        <div style='display: flex; justify-content: space-between; margin-bottom: 10px;'>
          <div>
            <div style='font-size: 15px; font-weight: bold; color: #0a3d62;'>ESTIMATE</div>
            <div style='font-size: 12px;'>Estimate #: <b>${orderId}.${orderVersion || 1}.${orderYear}</b></div>
            <div style='font-size: 12px;'>Date: <b>${today}</b></div>
          </div>
          <div style='text-align: right; font-size: 12px;'>
            <div style='font-weight: bold;'>Client:</div>
            <div>${customer?.name || '-'}</div>
            <div>${customer?.address || '-'}</div>
            <div>${customer?.gstin ? `GSTIN: ${customer.gstin.toUpperCase()}` : '-'}</div>
          </div>
        </div>
        <table style='width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; box-sizing: border-box;'>
          <thead>
            <tr style='background: #f3f6fa;'>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>S. No.</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Name & Description</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>HSN Code</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Qty</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Rate</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Amount</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>GST</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Cost After Tax</th>
            </tr>
          </thead>
          <tbody>
            ${scaledLineItems.map(l => `
                <tr>
                  <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: center;'>${l.idx + 1}</td>
                  <td style='border: 1px solid #d1d8e0; padding: 8px;'>
                    <div style='font-weight: bold;'>${l.item.name || ''}</div>
                    ${l.item.description ? `<div style='font-weight: normal; white-space: pre-line;'>${l.item.description}</div>` : ''}
                  </td>
                  <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: center;'>${l.item.hsn_code || ''}</td>
                  <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: center;'>${l.qty}</td>
                  <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: right;'>${l.rate.toFixed(2)}</td>
                  <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: right;'>${l.amount.toFixed(2)}</td>
                  <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: right;'>${l.gstAmount.toFixed(2)} (${l.gstPercent}%)</td>
                  <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: right;'>${l.costAfterTax.toFixed(2)}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
        <div style='display: flex; font-size: 13px; margin-top: 8px;'>
          <div style='flex: 1; padding: 8px;'>
            <div style='max-width: 340px; float: left;'>
              <!-- Only show Total and Taxable Value if discount > 0 -->
              <div style='margin-bottom: 2px;'>
                ${discount > 0 ? 'Total' : 'Taxable Value'}
              </div>
              ${discount > 0 ? `<div style='margin-bottom: 2px;'>Less Discount</div>` : ''}
              ${discount > 0 ? `<div style='margin-bottom: 2px;'>Taxable Value</div>` : ''}
            </div>
            <div style='float: right; text-align: right; font-weight: normal; min-width: 120px;'>
              <div style='margin-bottom: 2px;'>
                ${discount > 0 ? pdfTotalCost.toFixed(2) : pdfNetTotal.toFixed(2)}
              </div>
              ${discount > 0 ? `<div style='margin-bottom: 2px;'>${discount.toFixed(2)}</div>` : ''}
              ${discount > 0 ? `<div style='margin-bottom: 2px;'>${pdfNetTotal.toFixed(2)}</div>` : ''}
              <!-- GST rows only on the right -->
              ${isKarnataka
                ? Object.entries(gstSummary).map(([rate, amount]) => `<div style='margin-bottom: 2px;'>CGST ₹ ${(amount/2).toFixed(2)} (${(Number(rate)/2).toFixed(1).replace(/\.0$/, '')}%)</div><div style='margin-bottom: 2px;'>SGST ₹ ${(amount/2).toFixed(2)} (${(Number(rate)/2).toFixed(1).replace(/\.0$/, '')}%)</div>`).join('')
                : Object.entries(gstSummary).map(([rate, amount]) => `<div style='margin-bottom: 2px;'>IGST ₹ ${amount.toFixed(2)} (${rate}%)</div>`).join('')
              }
              <div style='margin-top: 12px; font-weight: bold; font-size: 16px;'>Total<br />${pdfGrandTotal.toFixed(2)}</div>
            </div>
            <div style='clear: both'></div>
          </div>
        </div>
        <div style='margin-bottom: 16px; font-size: 12px;'>
          <div style='font-weight: bold; text-decoration: underline; color: #0a3d62; margin-bottom: 4px;'>Payment Details</div>
          <div style='display: flex; align-items: center; gap: 24px;'>
            <div>
              <div>Account Name: <b>Sign Company</b></div>
              <div>Account Number: <b>59986534909</b></div>
              <div>IFSC: <b>IDFB0080184</b></div>
              <div>Bank: <b>IDFC FIRST, JEEVAN BIMA NAGAR BRANCH</b></div>
              <div>UPI ID: <b>signcompany@idfcbank</b></div>
            </div>
            <img src='/qr.png' alt='UPI QR' style='height: 150px; width: 150px; object-fit: contain; border: 1px solid #ccc; border-radius: 8px; background: #fff;' />
          </div>
        </div>
        <div style='margin-bottom: 16px; font-size: 12px;'>
          <div style='font-weight: bold; text-decoration: underline; color: #0a3d62; margin-bottom: 4px;'>Terms & Conditions</div>
          <ul style='margin: 0 0 0 18px; color: #b71c1c;'>
            <li>If any unforeseen requirements come up, costs might change.</li>
            <li>Scaffolding / Crane to be provided by client, else it will be charged extra if required.</li>
            <li>80% Advance (Grand Total) to confirm the order and balance before dispatch of material from our factory.</li>
            <li>Formal P.O. to be given at the time of confirming the order.</li>
            <li>Power supply up to signage site has to be provided by the client.</li>
            <li>15 working days required to complete the job from receipt of advance and P.O. subject to favourable weather conditions.</li>
            <li>1 year warranty only for material defects, physical damage & incoming electrical problems will not be covered.</li>
            <li>Working Hours: 9.30 AM-7.30 PM. Any Installation before or after working hours will be charged at 10% extra.</li>
            <li>All permissions to be obtained by client from authorities / land owners.</li>
            <li>We are not responsible for any theft/damage to material at the site.</li>
            <li>All prices are subject to change without notice. Please reconfirm at the time of order.</li>
            <li>300w Dimmer control unit will be charged extra at Rs.1750/- per piece if required for any signage.</li>
          </ul>
        </div>
        <div style='margin-bottom: 22px; font-size: 12px;'>
          <div>Looking forward to a positive response from your side at the earliest.<br/>Thanking You,</div>
          <div style='font-weight: bold; font-style: italic; margin-top: 8px;'>For Sign Company</div>
          <div style='font-weight: bold; margin-top: 16px; height: 30px;'>Authorized Signatory</div>
        </div>
        <div style='font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px;'>
          Generated on ${today}
        </div>
      </div>
    `;
  }

  // Calculate totals
  const scaledItems = items.map(item => {
    const rate = getScaledRate(item);
    const qty = Number(item.quantity) || 1;
    const amount = rate * qty;
    return { ...item, scaledRate: rate, scaledAmount: amount };
  });
  const totalCost = scaledItems.reduce((sum, item) => sum + item.scaledAmount, 0);
  const netTotal = totalCost - discount;
  const gst = scaledItems.reduce((sum, item) => sum + (item.gst_percent || 18) * item.scaledAmount / 100, 0);
  const grandTotal = netTotal + gst;

  // GST summary calculation by rate (skip zero cost)
  const gstSummary = {};
  scaledItems.forEach(item => {
    const cost = item.scaledAmount;
    if (!cost) return; // skip zero cost
    const gstPercent = Number(item.gst_percent ?? 18);
    if (!gstSummary[gstPercent]) gstSummary[gstPercent] = 0;
    gstSummary[gstPercent] += cost * gstPercent / 100;
  });
  const isKarnataka = (customerGstin || "").trim().toUpperCase().startsWith("29");

  useEffect(() => {
    ensureFabricationStepsForSignageItems(orderId).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    fetchSignageItems(orderId).then(setItems).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    fetchBoqItems(orderId).then(setAllBoqs).catch(console.error);
    // Fetch procurement tasks and build a set of procured BOQ ids
    fetchProcurementTasks(orderId).then(tasks => {
      setProcuredBoqIds(new Set(tasks.map(t => t.boq_item_id)));
    }).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (selectedItemId) {
      fetchBoqItems(orderId).then(all => {
        const filtered = all.filter(b => b.signage_item_id === selectedItemId);
        if (filtered.length === 0) {
          // If no BOQ items, create one with empty values for this signage item
          addBoqItem(selectedItemId, { material: '', quantity: 1, unit: '', cost_per_unit: 0 }).then(newBoq => {
            setBoqs([newBoq]);
          });
        } else {
          setBoqs(filtered);
        }
      });
    } else {
      setBoqs([]);
    }
  }, [selectedItemId, orderId]);

  useEffect(() => {
    if (!selectedItemId) return;
    fetchProcurementTasks(orderId).then(tasks => {
      const map = {};
      for (const t of tasks) {
        if (!map[t.boq_item_id]) map[t.boq_item_id] = [];
        map[t.boq_item_id].push(t);
      }
      setProcurementTasksByBoqId(map);
    });
  }, [orderId, selectedItemId]);

  useEffect(() => {
    fetchInventory().then(setInventory).catch(console.error);
  }, [orderId]);

  // Fetch discount and customer info from backend on mount
  useEffect(() => {
    if (!orderId) return;
    fetchOrderOverview(orderId).then(order => {
      setDiscount(Number(order.discount) || 0);
      if (order.customer) {
        setCustomer(order.customer);
      }
    });
  }, [orderId]);

  // Calculate and update signage item cost from BOQ
  useEffect(() => {
    if (!allBoqs.length || !items.length) return;
    // For each signage item, compute its BOQ total and update cost if needed
    items.forEach(async (item, idx) => {
      if (!item.id) return;
      const itemBoqs = allBoqs.filter(b => b.signage_item_id === item.id);
      const boqTotal = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
      if (item.cost !== boqTotal) {
        setItems(items => items.map((it, i) => i === idx ? { ...it, cost: boqTotal } : it));
        await updateSignageItem(item.id, { ...item, cost: boqTotal });
      }
    });
  }, [allBoqs, items]);

  // Handler to update discount in backend
  const handleDiscountBlur = async (e) => {
    const value = Number(e.target.value) || 0;
    setDiscount(value);
    try {
      await updateOrderDetails(orderId, { discount: value });
    } catch (err) {
      // Optionally show error
      console.error("Failed to update discount", err);
    }
  };

  // Handler to update GSTIN
  const handleGstinBlur = async (e) => {
    const value = e.target.value.trim();
    setCustomerGstin(value);
    if (customer && customer.id) {
      await updateOrderDetails(orderId, { customer: { ...customer, gstin: value } });
    }
  };

  // Ensure GST summary recalculates when GSTIN changes
  useEffect(() => {
    // This effect will run when customerGstin changes, triggering a re-render
  }, [customerGstin]);

  // Handler to update PAN
  const handlePanBlur = async (e) => {
    const value = e.target.value.trim();
    setCustomerPan(value);
    if (customer && customer.id) {
      await updateOrderDetails(orderId, { customer: { ...customer, pan: value } });
    }
  };

  // Helper to update signage item (including the empty placeholder)
  const updateItemField = (idx, field, value) => {
    setItems(items => items.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  // Helper to handle blur for signage item fields
  const handleItemBlur = async (idx, field, value) => {
    const item = items[idx];
    if (!item) return;
    if (item.id) {
      await updateSignageItem(item.id, { ...item, [field]: value });
      const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
      await addFeedNote({
        type: 'feed',
        content: `Signage item updated by ${user?.data?.user?.email || 'Unknown'}`,
        signage_item_id: item.id,
        orderId,
        created_by: user?.data?.user?.id,
        created_by_name: user?.data?.user?.user_metadata?.full_name || '',
        created_by_email: user?.data?.user?.email || ''
      });
    }
  };

  return (
    <div className="space-y-4 flex justify-center">
      <div className="w-full max-w-[1200px]">
        {/* Hidden PDF render target */}
        {showPdf && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', zIndex: -1, opacity: 0, pointerEvents: 'none' }} ref={pdfDivRef}>
            <SignageItemsPdf
              items={items.filter(i => i.name || i.description)}
              allBoqs={allBoqs}
              discount={discount}
              orderId={orderId}
              totalCost={totalCost}
              netTotal={netTotal}
              gst={gst}
              grandTotal={grandTotal}
              customer={customer}
            />
          </div>
        )}
        {/* PDF Export Content Start */}
        <div className="overflow-x-auto w-full">
          <div ref={pdfRef} className="text-xs">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold">Signage Items</h2>
            </div>
            <table className="min-w-full border text-xs">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2 border">S. No.</th>
                  <th className="p-2 border w-[220px]">Name</th>
                  <th className="p-2 border w-[340px]">Description</th>
                  <th className="p-2 border">HSN Code</th>
                  <th className="p-2 border w-14">Qty</th>
                  <th className="p-2 border w-20">Rate</th>
                  <th className="p-2 border w-24">Amount</th>
                  <th className="p-2 border w-20">GST (%)</th>
                  <th className="p-2 border w-24">GST Amount</th>
                  <th className="p-2 border w-28">Cost After Tax</th>
                  <th className="p-2 border w-8 text-center no-print">Actions</th>
                  <th className="p-2 border no-print">BOQ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => [
                  <tr
                    key={item.id || 'new'}
                    className={`cursor-pointer ${showBoqForItemId === item.id ? "bg-yellow-50" : ""}`}
                  >
                    <td className="p-2 border">{idx + 1}</td>
                    {/* Name */}
                    <td className="p-2 border">
                      <input
                        className="w-full border px-1 py-0.5 text-xs"
                        type="text"
                        value={item.name}
                        onChange={e => updateItemField(idx, 'name', e.target.value)}
                        onBlur={e => handleItemBlur(idx, 'name', e.target.value.trim())}
                      />
                    </td>
                    {/* Description */}
                    <td className="p-2 border w-[340px]">
                      <textarea
                        ref={el => descriptionRefs.current[item.id || idx] = el}
                        className="w-full border px-1 py-0.5 text-xs resize-none overflow-hidden"
                        style={{ minHeight: 32, height: 'auto' }}
                        value={item.description}
                        onChange={e => updateItemField(idx, 'description', e.target.value)}
                        onBlur={e => handleItemBlur(idx, 'description', e.target.value)}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />
                    </td>
                    {/* HSN Code */}
                    <td className="p-2 border">
                      <input
                        className="w-full border px-1 py-0.5 text-xs"
                        type="text"
                        value={(item.hsn_code || '').toUpperCase()}
                        onChange={async e => {
                          const value = e.target.value;
                          updateItemField(idx, 'hsn_code', value);
                          if (item.id) {
                            await updateSignageItem(item.id, { ...item, hsn_code: value });
                            const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                            await addFeedNote({
                              type: 'feed',
                              content: `Signage item HSN updated by ${user?.data?.user?.email || 'Unknown'}`,
                              signage_item_id: item.id,
                              orderId,
                              created_by: user?.data?.user?.id,
                              created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                              created_by_email: user?.data?.user?.email || ''
                            });
                          }
                        }}
                      />
                    </td>
                    <td className="p-2 border w-14 text-right">
                      <input
                        className="w-full border px-1 py-0.5 text-xs text-right"
                        type="number"
                        min={1}
                        value={item.quantity || 1}
                        onChange={e => updateItemField(idx, 'quantity', e.target.value)}
                        onBlur={e => handleItemBlur(idx, 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border w-20 text-right">
                      {item.id
                        ? getScaledRate(item).toFixed(2)
                        : ''}
                    </td>
                    {/* Amount */}
                    <td className="p-2 border w-24 text-right">
                      {item.id
                        ? (getScaledRate(item) * (Number(item.quantity) || 1)).toFixed(2)
                        : ''}
                    </td>
                    {/* GST Percent */}
                    <td className="p-2 border w-20">
                      <input
                        className="w-full border px-1 py-0.5 text-xs text-right"
                        type="number"
                        min={0}
                        max={100}
                        value={items[idx]?.gst_percent ?? 18}
                        onChange={async e => {
                          const value = Number(e.target.value) || 0;
                          updateItemField(idx, 'gst_percent', value);
                          if (item.id) {
                            await updateSignageItem(item.id, { ...item, gst_percent: value });
                            const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                            await addFeedNote({
                              type: 'feed',
                              content: `Signage item GST updated by ${user?.data?.user?.email || 'Unknown'}`,
                              signage_item_id: item.id,
                              orderId,
                              created_by: user?.data?.user?.id,
                              created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                              created_by_email: user?.data?.user?.email || ''
                            });
                          }
                        }}
                      />
                    </td>
                    {/* GST Amount */}
                    <td className="p-2 border w-24 text-right">
                      {(() => {
                        const amt = getScaledRate(item) * (Number(item.quantity) || 1);
                        const gst = Number(item.gst_percent ?? 18);
                        return (amt * gst / 100).toFixed(2);
                      })()}
                    </td>
                    {/* Cost After Tax */}
                    <td className="p-2 border w-28 text-right">
                      {(() => {
                        const amt = getScaledRate(item) * (Number(item.quantity) || 1);
                        const gst = Number(item.gst_percent ?? 18);
                        return (amt + (amt * gst / 100)).toFixed(2);
                      })()}
                    </td>
                    <td className="p-2 border w-8 text-center align-middle no-print">
                      {item.id && (item.name || item.description || Number(item.quantity) > 1 || Number(item.cost) > 0) && (
                        <span
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = confirm("Are you sure you want to delete this item?");
                            if (confirmed) {
                              await deleteSignageItem(item.id);
                              setItems(items.filter(it => it.id !== item.id));
                              const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                              await addFeedNote({
                                type: 'feed',
                                content: `Signage item deleted by ${user?.data?.user?.email || 'Unknown'}`,
                                signage_item_id: item.id,
                                orderId,
                                created_by: user?.data?.user?.id,
                                created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                created_by_email: user?.data?.user?.email || ''
                              });
                            }
                          }}
                          className="text-red-500 cursor-pointer flex items-center justify-center"
                          title="Delete"
                        >
                          🗑
                        </span>
                      )}
                    </td>
                    <td className="p-2 border w-10 text-center align-middle no-print">
                      {item.id && (
                        <span
                          className="text-blue-600 underline cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            const next = showBoqForItemId === item.id ? null : item.id;
                            setShowBoqForItemId(next);
                            setSelectedItemId(next);
                          }}
                        >
                          {allBoqs.filter(b => b.signage_item_id === item.id).length}
                        </span>
                      )}
                    </td>
                  </tr>,
                  showBoqForItemId === item.id && item.id ? (
                    <tr key={item.id + '-boq-details'}>
                      <td colSpan={12} className="bg-yellow-100 p-4 border-t-2 border-yellow-300">
                        <h3 className="font-medium mb-2">BOQ for selected item</h3>
                        {(() => {
                          const boqsWithBlank = [...boqs];
                          return (
                            <>
                              <table className="min-w-full text-sm border mb-2" style={{ minWidth: 900 }}>
                                <thead className="bg-gray-100 text-left">
                                  <tr>
                                    <th className="p-2 border w-8 text-center">S. No.</th>
                                    <th className="p-2 border w-48">Item</th>
                                    <th className="p-2 border w-48">Material</th>
                                    <th className="p-2 border w-20 text-center">Unit</th>
                                    <th className="p-2 border w-20 text-center">Quantity</th>
                                    <th className="p-2 border w-28 text-center">Cost/Unit</th>
                                    <th className="p-2 border w-28 text-center">Total</th>
                                    <th className="p-2 border"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {boqsWithBlank.map((boq, bidx) => (
                                    <tr key={boq.id}>
                                      <td className="p-2 border w-8 text-center">{bidx + 1}</td>
                                      <td className="p-2 border w-32">
                                        <input
                                          className="w-full border px-1 py-0.5 text-xs"
                                          value={boq.item || ''}
                                          onChange={e => {
                                            const value = e.target.value;
                                            if (boq.id) {
                                              setBoqs(boqs.map(b => b.id === boq.id ? { ...b, item: value } : b));
                                            }
                                          }}
                                          onBlur={async (e) => {
                                            const value = e.target.value.trim();
                                            if (boq.id) {
                                              await updateBoqItem(boq.id, { ...boq, item: value });
                                              const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                              await addFeedNote({
                                                type: 'feed',
                                                content: `BOQ item field updated by ${user?.data?.user?.email || 'Unknown'}`,
                                                boq_item_id: boq.id,
                                                signage_item_id: boq.signage_item_id,
                                                orderId,
                                                created_by: user?.data?.user?.id,
                                                created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                                created_by_email: user?.data?.user?.email || ''
                                              });
                                            }
                                          }}
                                        />
                                      </td>
                                      <td className="p-2 border">
                                        <input
                                          className="w-full border px-1 py-0.5 text-xs"
                                          value={boq.material}
                                          onChange={e => {
                                            const value = e.target.value;
                                            if (boq.id) {
                                              setBoqs(boqs.map(b => b.id === boq.id ? { ...b, material: value } : b));
                                            }
                                          }}
                                          onBlur={async (e) => {
                                            const value = e.target.value.trim();
                                            if (boq.id) {
                                              await updateBoqItem(boq.id, boq);
                                              const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                              await addFeedNote({
                                                type: 'feed',
                                                content: `BOQ item updated by ${user?.data?.user?.email || 'Unknown'}`,
                                                boq_item_id: boq.id,
                                                signage_item_id: boq.signage_item_id,
                                                orderId,
                                                created_by: user?.data?.user?.id,
                                                created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                                created_by_email: user?.data?.user?.email || ''
                                              });
                                            }
                                          }}
                                        />
                                      </td>
                                      <td className="p-2 border w-16 text-center">
                                        {editingUnitIdx === bidx ? (
                                          <Select
                                            classNamePrefix="unit-select"
                                            options={unitOptions}
                                            value={unitOptions.find(opt => opt.value === boq.unit) || (boq.unit ? { value: boq.unit, label: boq.unit } : null)}
                                            onChange={selected => {
                                              const value = selected ? selected.value : '';
                                              if (boq.id) {
                                                setBoqs(boqs.map(b => b.id === boq.id ? { ...b, unit: value } : b));
                                              }
                                              setEditingUnitIdx(null);
                                            }}
                                            onInputChange={inputValue => {
                                              if (boq.id && inputValue !== boq.unit) {
                                                setBoqs(boqs.map(b => b.id === boq.id ? { ...b, unit: inputValue } : b));
                                              }
                                            }}
                                            onBlur={() => setEditingUnitIdx(null)}
                                            autoFocus
                                            isClearable
                                            isSearchable
                                            placeholder="Unit"
                                            menuPlacement="auto"
                                          />
                                        ) : (
                                          <span
                                            style={{ cursor: 'pointer', minWidth: 32, display: 'inline-block' }}
                                            onClick={() => setEditingUnitIdx(bidx)}
                                            title="Click to edit unit"
                                          >
                                            {boq.unit || <span className="text-gray-400 italic">(unit)</span>}
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2 border w-16 text-center">
                                        <input
                                          className="w-full border px-1 py-0.5 text-xs text-right"
                                          type="number"
                                          value={boq.quantity}
                                          onChange={e => {
                                            const value = e.target.value;
                                            if (boq.id) {
                                              setBoqs(boqs.map(b => b.id === boq.id ? { ...b, quantity: value } : b));
                                            }
                                          }}
                                          onBlur={async () => {
                                            if (boq.id) {
                                              await updateBoqItem(boq.id, boq);
                                              const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                              await addFeedNote({
                                                type: 'feed',
                                                content: `BOQ item updated by ${user?.data?.user?.email || 'Unknown'}`,
                                                boq_item_id: boq.id,
                                                signage_item_id: boq.signage_item_id,
                                                orderId,
                                                created_by: user?.data?.user?.id,
                                                created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                                created_by_email: user?.data?.user?.email || ''
                                              });
                                            }
                                          }}
                                        />
                                      </td>
                                      <td className="p-2 border w-20 text-center">
                                        <input
                                          className="w-full border px-1 py-0.5 text-xs text-right"
                                          type="number"
                                          value={boq.cost_per_unit}
                                          onChange={e => {
                                            const value = e.target.value;
                                            if (boq.id) {
                                              setBoqs(boqs.map(b => b.id === boq.id ? { ...b, cost_per_unit: value } : b));
                                            }
                                          }}
                                          onBlur={async () => {
                                            if (boq.id) {
                                              await updateBoqItem(boq.id, boq);
                                              const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                              await addFeedNote({
                                                type: 'feed',
                                                content: `BOQ item updated by ${user?.data?.user?.email || 'Unknown'}`,
                                                boq_item_id: boq.id,
                                                signage_item_id: boq.signage_item_id,
                                                orderId,
                                                created_by: user?.data?.user?.id,
                                                created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                                created_by_email: user?.data?.user?.email || ''
                                              });
                                            }
                                          }}
                                        />
                                      </td>
                                      <td className="p-2 border w-20 text-center">
                                        <input
                                          className="w-full border px-1 py-0.5 text-xs text-right"
                                          type="number"
                                          value={Number(boq.quantity) * Number(boq.cost_per_unit) || 0}
                                          readOnly
                                        />
                                      </td>
                                      <td className="p-2 border text-right">
                                        {boq.id && (
                                          <span
                                            onClick={async () => {
                                              const confirmed = confirm("Delete this BOQ entry?");
                                              if (confirmed) {
                                                await deleteBoqItem(boq.id);
                                                setBoqs(boqs.filter(b => b.id !== boq.id));
                                              }
                                            }}
                                            className="ml-2 text-red-500 cursor-pointer"
                                          >
                                            🗑
                                          </span>
                                        )}
                                        {boq.id && procurementTasksByBoqId[boq.id]?.length > 0 && (
                                          <span
                                            title={
                                              procurementTasksByBoqId[boq.id][0].status === 'received'
                                                ? 'Procurement received, material available'
                                                : 'Procurement created'
                                            }
                                            style={{ cursor: 'pointer', marginLeft: 8 }}
                                            onClick={() => setSelectedProcurement(procurementTasksByBoqId[boq.id][0])}
                                          >
                                            {procurementTasksByBoqId[boq.id][0].status === 'received' ? '✅' : '🛒'}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <button
                                className="mt-2 px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-500 self-start"
                                onClick={async () => {
                                  if (selectedItemId) {
                                    const newBoq = await addBoqItem(selectedItemId, { material: '', quantity: 1, unit: '', cost_per_unit: 0 });
                                    setBoqs([...boqs, newBoq]);
                                  }
                                }}
                                type="button"
                              >
                                + Add BOQ
                              </button>
                            </>
                          );
                        })()}
                      </td>
                    </tr>
                  ) : null
                ])}
              </tbody>
            </table>
            <button
              className="mt-4 px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-500 self-start"
              onClick={handleAddBlankItem}
              type="button"
            >
              + Add Item
            </button>
            <div className="mt-8 border-t pt-4">
              <div className="flex justify-end">
                <table className="text-sm font-semibold">
                  <tbody>
                    <tr>
                      <td className="text-right pr-8 align-middle">TOTAL</td>
                      <td className="text-right">&#8377; {totalCost.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="text-right pr-8 align-middle">DISCOUNT</td>
                      <td className="text-right">
                        <input
                          type="number"
                          className="border px-1 py-0.5 text-right w-20 text-xs"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                          onBlur={handleDiscountBlur}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="text-right pr-8 align-middle">NET TOTAL</td>
                      <td className="text-right">&#8377; {netTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* GST Summary Table */}
              <div className="flex justify-end mt-2">
                <table className="text-xs border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-1">GST Rate</th>
                      {isKarnataka ? (
                        <>
                          <th className="border p-1">CGST</th>
                          <th className="border p-1">SGST</th>
                        </>
                      ) : (
                        <th className="border p-1">IGST</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(gstSummary).filter(([_rate, amount]) => amount > 0.001).map(([rate, amount]) => {
                      if (isKarnataka) {
                        const halfRate = (Number(rate) / 2).toFixed(1).replace(/\.0$/, "");
                        return (
                          <tr key={rate}>
                            <td className="border p-1">{rate}%</td>
                            <td className="border p-1 text-right">&#8377; {(amount/2).toFixed(2)} <span className="text-gray-500">({halfRate}%)</span></td>
                            <td className="border p-1 text-right">&#8377; {(amount/2).toFixed(2)} <span className="text-gray-500">({halfRate}%)</span></td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr key={rate}>
                            <td className="border p-1">{rate}%</td>
                            <td className="border p-1 text-right" colSpan={2}>&#8377; {amount.toFixed(2)}</td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2">
                <table className="text-sm font-bold">
                  <tbody>
                    <tr className="text-lg">
                      <td className="text-right pr-8 align-middle">GRAND TOTAL</td>
                      <td className="text-right">&#8377; {grandTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {/* PDF Export Content End */}
        {/* Terms & Conditions and Bank Details for PDF - REMOVED from visible UI */}
        <div className="flex justify-start mt-4">
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-blue-700 text-white rounded shadow hover:bg-blue-800 text-sm"
          >
            ⬇️ Download Estimate
          </button>
          <button
            onClick={handleDownloadInvoicePdf}
            className="ml-2 px-4 py-2 bg-green-700 text-white rounded shadow hover:bg-green-800 text-sm"
          >
            ⬇️ Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}