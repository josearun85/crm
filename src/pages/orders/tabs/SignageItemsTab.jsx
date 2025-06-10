import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import html2pdf from "html2pdf.js";
import SignageItemsPdf from "./SignageItemsPdf";
import InvoicePdf from "./InvoicePdf";
import { fetchSignageItems, fetchBoqItems, addBoqItem, deleteBoqItem, updateBoqItem, addSignageItem, updateSignageItem, deleteSignageItem, fetchProcurementTasks, ensureFabricationStepsForSignageItems, fetchInventory, addFeedNote, fetchOrderOverview, updateOrderDetails, fetchOrderFiles } from "../services/orderDetailsService";
import { createRoot } from "react-dom/client";
import UnitInput from "../../../components/UnitInput";
import supabase from '../../../supabaseClient';
import { generateInvoicePdf } from '../../../services/generateInvoicePdf';

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

  // Margin/Total state for expanded item
  const [marginEdit, setMarginEdit] = useState({}); // { [signageItemId]: { marginPercent, totalWithMargin, lastEdited } }

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

  // Helper: get signage item total with margin (shared logic)
  function getSignageItemTotalWithMargin(item) {
    const itemBoqs = allBoqs.filter(b => b.signage_item_id === item.id);
    const boqTotal = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
    if (item.total_with_margin && Number(item.total_with_margin) > 0) {
      return Number(item.total_with_margin);
    } else if (item.margin_percent && Number(item.margin_percent) > 0) {
      return boqTotal * (1 + Number(item.margin_percent) / 100);
    } else {
      return boqTotal;
    }
  }

  // Helper to get scaled rate for an item (uses margin logic)
  function getScaledRate(item) {
    const scaling = getGstBillableScaling(items);
    const totalWithMargin = getSignageItemTotalWithMargin(item) * scaling;
    const qty = Number(item.quantity) || 1;
    if (!qty) return 0;
    return totalWithMargin / qty;
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
    // Fetch files for this order
    const files = await fetchOrderFiles(orderId);
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
      files, // pass files to PDF
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

  const handlePreviewInvoicePdf = async () => {
    // Fetch all required data
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
    // Prepare items for InvoicePdf (match order page logic)
    const items = signageItems.filter(i => i.name || i.description).map(item => {
      const itemBoqs = boqs.filter(b => b.signage_item_id === item.id);
      const totalCost = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
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
                filename: 'Invoice_${order.invoice_number || 'DRAFT'}.pdf',
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
          React.createElement(InvoicePdf, { invoice: order, customer, items, isPdfMode: true }) :
          null
      );
    };
    setTimeout(renderReact, 200);
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

    // Helper for image URL (public)
    function getImageUrl(imagePath) {
      if (!imagePath) return '';
      const base = window.location.origin || '';
      return base + '/storage/v1/object/public/crm/' + imagePath.replace(/^\/+/, '');
    }
    const logoUrl = (window.location.origin || '') + '/logo.png';
    const qrUrl = (window.location.origin || '') + '/qr.png';

    return `
      <div style='font-family: "Segoe UI", Arial, sans-serif; max-width: 730px; margin: 0 auto; color: #222; font-size: 13px; padding: 0 18px; box-sizing: border-box;'>
        <div style='display: flex; align-items: center; border-bottom: 2px solid #0a3d62; padding-bottom: 12px; margin-bottom: 18px;'>
          <img src='${logoUrl}' alt='Sign Company Logo' style='height: 55px; margin-right: 18px;' />
          <div>
            <div style='font-size: 22px; font-weight: bold; color: #0a3d62;'>Sign Company</div>
            <div style='font-size: 12px; color: #555;'>Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bangalore - 560 075</div>
            <div style='font-size: 12px; color: #555;'>M: +91 8431505007 | GSTN: 29BPYPPK6641B2Z6 | PAN: BPYPPK6641B</div>
          </div>
        </div>
        <div style='display: flex; justify-content: space-between; margin-bottom: 10px;'>
          <div>
            <div style='font-size: 15px; font-weight: bold, color: #0a3d62;'>ESTIMATE</div>
            <div style='font-size: 12px;'>Estimate #: <b>${orderId}.${orderVersion || 1}.${orderYear}</b></div>
            <div style='font-size: 12px;'>Date: <b>${today}</b></div>
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
                    ${l.item.image_path ? `<div style='margin:6px 0;'><img src='${getImageUrl(l.item.image_path)}' alt='' style='max-width:64px; max-height:48px; border-radius:4px; border:1px solid #eee; display:block;'/></div>` : ''}
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
        <div style='display: flex; justify-content: flex-end; margin-bottom: 32px;'>
          <table style='font-size: 15px; font-weight: 600; min-width: 320px; box-shadow: 0 2px 8px #eee; border-radius: 8px; background: #fafbfc;'>
            <tbody>
              <tr>
                <td style='text-align: right; padding: 4px 16px;'>TOTAL</td>
                <td style='text-align: right; padding: 4px 0;'>₹ ${pdfTotalCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td style='text-align: right; padding: 4px 16px;'>DISCOUNT</td>
                <td style='text-align: right; padding: 4px 0;'>₹ ${discount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style='text-align: right; padding: 4px 16px;'>NET TOTAL</td>
                <td style='text-align: right; padding: 4px 0;'>₹ ${pdfNetTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style='text-align: right; padding: 4px 16px;'>GST</td>
                <td style='text-align: right; padding: 4px 0;'>₹ ${pdfGst.toFixed(2)}</td>
              </tr>
              <tr style='font-weight: bold; font-size: 17px;'>
                <td style='text-align: right; padding: 4px 16px;'>GRAND TOTAL</td>
                <td style='text-align: right; padding: 4px 0;'>₹ ${pdfGrandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style='margin-top: 24px;'>
          <div style='font-size: 15px; margin-bottom: 16px;'>
            <span style='font-weight: bold; font-style: italic; text-decoration: underline;'>Terms & Conditions</span>
            <ul style='color: red; margin-top: 8px; margin-bottom: 16px; padding-left: 24px;'>
              <li>* If any unforeseen requirements come up, costs might change.</li>
              <li>* Scaffolding / Crain to be provided by client, else it will be charged extra if required.</li>
              <li>* 80% Advance (Grand Total) to confirm the order and balance before dispatch of material from our factory.</li>
              <li>* Formal P.O. to be given at the time of confirming the order.</li>
              <li>* Power supply upto signage site has to be provided by the client.</li>
              <li>* 15 working days required to complete the job from reciept of advance and P.O. subject to favourable weather conditions.</li>
              <li>* 1 year warranty only for material defects, physical damage & incoming electrical problems will not be covered.</li>
              <li>* Working Hours- 9.30 AM-7.30 PM. Any Installation before or after working hours will be charged at 10% extra.</li>
              <li>* All permissions to be obtained by client from authorities / land owners.</li>
              <li>* We are not responsible for any theft/damage to material at the site.</li>
              <li>* All prices are subject to change without notice, Please reconfirm at the time of order.</li>
              <li>* 300w Dimmer control unit will be charged extra at Rs.1750/- per piece if required for any signage.</li>
            </ul>
          </div>
          <div style='display: flex; align-items: flex-start; gap: 32px; margin-bottom: 16px;'>
            <div style='flex: 2;'>
              <div style='font-weight: 600; margin-bottom: 6px;'>Bank & Payment Details</div>
              <div>Company name: Sign Company</div>
              <div>Account number: 59986534909</div>
              <div>IFSC: IDFB0080184</div>
              <div>SWIFT code: IDFBINBBMUM</div>
              <div>Bank name: IDFC FIRST</div>
              <div>Branch: JEEVAN BIMA NAGAR BRANCH</div>
              <div>UPI ID: signcompany@idfcbank</div>
              <div style='margin-top: 10px;'>GSTN: 29BPYPPK6641B2Z6</div>
              <div>PAN: BPYPPK6641B</div>
            </div>
            <div style='flex: 1; text-align: center;'>
              <div style='font-weight: 700; margin-bottom: 8px;'>SCAN & PAY</div>
              <img src='${qrUrl}' alt='UPI QR' style='height: 150px; width: 150px; object-fit: contain; border: 1px solid #ccc; border-radius: 8px; background: #fff; margin-bottom: 8px;' />
             
            </div>
          </div>
          <div style='margin-bottom: 16px;'>
            <div>Looking forward to a positive response from your side at the earliest.<br/>Thanking You,</div>
            <div style='font-weight: bold; font-style: italic; margin-top: 8px;'>For Sign Company</div>
            <div style='font-weight: bold; margin-top: 16px;'>Authorized Signatory</div>
          </div>
          <div style='font-size: 11px; color: #888; text-align: right; border-top: 1px solid #eee; padding-top: 8px;'>
            Generated on ${today}
          </div>
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

  // Helper: update signage item cost and margin/total in state after BOQ change
  async function updateSignageItemCostAndMargin(signageItemId) {
    const itemBoqs = allBoqs.filter(b => b.signage_item_id === signageItemId);
    const boqTotal = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
    // Find the signage item
    const itemIdx = items.findIndex(i => i.id === signageItemId);
    if (itemIdx === -1) return;
    const item = items[itemIdx];
    // Use marginEdit if present, else signage item fields
    const marginPercent = marginEdit[signageItemId]?.marginPercent ?? item.margin_percent ?? 0;
    const totalWithMargin = marginEdit[signageItemId]?.totalWithMargin ?? item.total_with_margin ?? '';
    // Update cost
    setItems(items => items.map((it, i) => i === itemIdx ? { ...it, cost: boqTotal, margin_percent: marginPercent, total_with_margin: totalWithMargin } : it));
  }

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

  // Helper: get total BOQ cost for a signage item
  function getSignageBoqTotal(signageItemId) {
    return allBoqs.filter(b => b.signage_item_id === signageItemId)
      .reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
  }

  // Handler for margin % change
  const handleMarginPercentChange = (signageItem, val) => {
    const boqTotal = getSignageBoqTotal(signageItem.id);
    const marginPercent = parseFloat(val) || 0;
    const totalWithMargin = boqTotal * (1 + marginPercent / 100);
    setMarginEdit(edit => ({
      ...edit,
      [signageItem.id]: {
        marginPercent: val,
        totalWithMargin: totalWithMargin.toFixed(2),
        lastEdited: 'margin',
      },
    }));
    // Also update signage item in state for instant UI
    setItems(items => items.map(it => it.id === signageItem.id ? { ...it, margin_percent: marginPercent, total_with_margin: totalWithMargin.toFixed(2) } : it));
  };

  // Handler for total change
  const handleTotalWithMarginChange = (signageItem, val) => {
    const boqTotal = getSignageBoqTotal(signageItem.id);
    const totalWithMargin = parseFloat(val) || 0;
    const marginPercent = boqTotal === 0 ? 0 : ((totalWithMargin / boqTotal - 1) * 100);
    setMarginEdit(edit => ({
      ...edit,
      [signageItem.id]: {
        marginPercent: marginPercent.toFixed(2),
        totalWithMargin: val,
        lastEdited: 'total',
      },
    }));
    // Also update signage item in state for instant UI
    setItems(items => items.map(it => it.id === signageItem.id ? { ...it, margin_percent: marginPercent.toFixed(2), total_with_margin: val } : it));
  };

  // Handler to persist margin/total to backend
  const handleMarginBlur = async (signageItem) => {
    const edit = marginEdit[signageItem.id];
    if (!edit) return;
    const boqTotal = getSignageBoqTotal(signageItem.id);
    // If totalWithMargin is empty or 0, recalculate from marginPercent
    let totalWithMargin = parseFloat(edit.totalWithMargin);
    if (!totalWithMargin && edit.marginPercent) {
      totalWithMargin = boqTotal * (parseFloat(edit.marginPercent) / 100 + 1);
    }
    const updates = {
      margin_percent: parseFloat(edit.marginPercent) || 0,
      total_with_margin: totalWithMargin || 0,
    };
    await updateSignageItem(signageItem.id, updates);
    fetchSignageItems(orderId).then(setItems).catch(console.error);
    setMarginEdit(editState => {
      const next = { ...editState };
      delete next[signageItem.id];
      return next;
    });
  };

  // Remove react-beautiful-dnd imports

  // --- Keyboard navigation for BOQ table ---
  const boqCellRefs = useRef({}); // { [rowIdx_colIdx]: ref }
  const BOQ_COLUMNS = ['item', 'material', 'unit', 'quantity', 'cost_per_unit'];

  function focusBoqCell(row, col) {
    const key = `${row}_${col}`;
    if (boqCellRefs.current[key] && boqCellRefs.current[key].current) {
      boqCellRefs.current[key].current.focus();
    }
  }

  function handleBoqKeyDown(e, rowIdx, colIdx, boqsWithBlank, selectedItemId) {
    // Only block navigation if UnitInput dropdown is open and the key is up/down/enter/escape
    const isUnitInput = e.target.classList.contains('unit-input');
    const isDropdownOpen = e.target.getAttribute('aria-expanded') === 'true';
    const navBlockKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'];
    if (isUnitInput && isDropdownOpen && navBlockKeys.includes(e.key)) {
      // Dropdown is open, block navigation for these keys
      return;
    }
    // Otherwise, allow navigation as normal
    const lastRow = boqsWithBlank.length - 1;
    const lastCol = BOQ_COLUMNS.length - 1;
    let nextRow = rowIdx, nextCol = colIdx;
    if (e.key === 'Tab' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (colIdx < lastCol) {
        nextCol = colIdx + 1;
      } else if (rowIdx < lastRow) {
        nextRow = rowIdx + 1; nextCol = 0;
      } else {
        // Add new row and focus first cell
        addBoqItem(selectedItemId, { material: '', quantity: 1, unit: '', cost_per_unit: 0 }).then(newBoq => {
          setBoqs([...boqsWithBlank, newBoq]);
          setTimeout(() => focusBoqCell(rowIdx + 1, 0), 0);
        });
        return;
      }
      focusBoqCell(nextRow, nextCol);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (colIdx > 0) {
        nextCol = colIdx - 1;
      } else if (rowIdx > 0) {
        nextRow = rowIdx - 1; nextCol = lastCol;
      }
      focusBoqCell(nextRow, nextCol);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIdx < lastRow) {
        nextRow = rowIdx + 1;
      } else {
        // Add new row and focus first cell
        addBoqItem(selectedItemId, { material: '', quantity: 1, unit: '', cost_per_unit: 0 }).then(newBoq => {
          setBoqs([...boqsWithBlank, newBoq]);
          setTimeout(() => focusBoqCell(rowIdx + 1, 0), 0);
        });
        return;
      }
      focusBoqCell(nextRow, colIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIdx > 0) {
        nextRow = rowIdx - 1;
        focusBoqCell(nextRow, colIdx);
      }
    }
  }

  // Add SignageItemImageCell component for paste/upload and thumbnail display
  function SignageItemImageCell({ item, onImageUploaded }) {
    const [uploading, setUploading] = useState(false);
    const [thumbUrl, setThumbUrl] = useState(null);
    const cellRef = useRef();

    // Fetch signed URL for thumbnail
    useEffect(() => {
      async function fetchUrl() {
        if (item.image_path) {
          const { data, error } = await supabase.storage.from('crm').createSignedUrl(item.image_path, 3600);
          if (!error) setThumbUrl(data.signedUrl);
          else setThumbUrl(null);
        } else {
          setThumbUrl(null);
        }
      }
      fetchUrl();
    }, [item.image_path]);

    // Handle paste event
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const clipboardItem of items) {
        if (clipboardItem.type.startsWith('image/')) {
          const file = clipboardItem.getAsFile();
          if (file && item.id) {
            setUploading(true);
            try {
              const fileName = `signage_items/${item.id}/${Date.now()}-${file.name}`;
              const { error } = await supabase.storage.from('crm').upload(fileName, file, { upsert: true });
              if (error) throw error;
              await updateSignageItem(item.id, { image_path: fileName });
              onImageUploaded && onImageUploaded(fileName);
            } catch (err) {
              alert('Image upload failed: ' + err.message);
            } finally {
              setUploading(false);
            }
          }
          break;
        }
      }
    };

    // Handle delete image
    const handleDelete = async (e) => {
      e.stopPropagation();
      if (!item.image_path || !item.id) return;
      if (!window.confirm('Remove this image?')) return;
      setUploading(true);
      try {
        await supabase.storage.from('crm').remove([item.image_path]);
        await updateSignageItem(item.id, { image_path: null });
        onImageUploaded && onImageUploaded(null);
      } catch (err) {
        alert('Failed to delete image: ' + err.message);
      } finally {
        setUploading(false);
      }
    };

    return (
      <div
        ref={cellRef}
        tabIndex={0}
        onPaste={handlePaste}
        style={{
          width: 56, height: 56, border: '1px dashed #bbb', borderRadius: 6, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden'
        }}
        title={thumbUrl ? 'Paste to replace image' : 'Paste screenshot here'}
      >
        {uploading ? (
          <span style={{ fontSize: 12, color: '#888' }}>Uploading...</span>
        ) : thumbUrl ? (
          <>
            <img src={thumbUrl} alt="Signage" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            <button
              onClick={handleDelete}
              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#d32f2f', padding: 0 }}
              title="Remove image"
            >
              ×
            </button>
          </>
        ) : (
          <span style={{ fontSize: 12, color: '#bbb' }}>Paste Image</span>
        )}
      </div>
    );
  }

  // Helper to update signage item sort_order in DB
  async function updateSignageItemsOrder(orderId, newItems) {
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      if (item.id) {
        await updateSignageItem(item.id, { sort_order: i });
      }
    }
  }

  // Move item up
  const moveItemUp = async (idx) => {
    if (idx === 0) return;
    const newItems = [...items];
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    setItems(newItems);
    await updateSignageItemsOrder(orderId, newItems);
  };

  // Move item down
  const moveItemDown = async (idx) => {
    if (idx === items.length - 1) return;
    const newItems = [...items];
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    setItems(newItems);
    await updateSignageItemsOrder(orderId, newItems);
  };

  return (
    <div className="space-y-4 flex justify-center relative">
      {/* Watermark logo */}
      <img
        src="/logo.png"
        alt="Logo watermark"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '400px',
          height: 'auto',
          opacity: 0.08,
          filter: 'grayscale(1) brightness(1.2)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div className="w-full max-w-[1400px]" style={{ position: 'relative', zIndex: 1 }}>
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
            {/* Remove DragDropContext/Droppable/Draggable and add up/down arrows: */}
            <table className="min-w-full border text-xs">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2 border w-8 text-center">#</th>
                  <th className="p-2 border w-16">Image</th>
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
                  <th className="p-2 border w-12 text-center">Move</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center' }}>No signage items</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id} className={showBoqForItemId === item.id ? "bg-yellow-50" : ""}>
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border">
                        <SignageItemImageCell item={item} onImageUploaded={async () => {
                          // Refresh item in state
                          const updated = await fetchSignageItems(orderId);
                          setItems(updated);
                        }} />
                      </td>
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
                      <td className="p-2 border w-12 text-center">
                        <button onClick={() => moveItemUp(idx)} disabled={idx === 0} title="Move Up" style={{marginRight: 4}}>↑</button>
                        <button onClick={() => moveItemDown(idx)} disabled={idx === items.length - 1} title="Move Down">↓</button>
                      </td>
                    </tr>
                  ))
                )}
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
              {/* Cost to Company and Margin */}
              <div className="flex justify-end mt-2">
                <table className="text-sm font-bold">
                  <tbody>
                    <tr>
                      <td className="text-right pr-8 align-middle">COST TO COMPANY</td>
                      <td className="text-right">&#8377; {allBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="text-right pr-8 align-middle">MARGIN</td>
                      <td className="text-right">&#8377; {(netTotal - allBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0)).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {/* PDF Export Content End */}
        {/* Terms & Conditions and Bank Details for PDF - REMOVED from visible UI */}
        <div className="flex justify-start mt-4 footerheight">
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-blue-700 text-white rounded shadow hover:bg-blue-800 text-sm"
          >
            ⬇️ Download Estimate
          </button>
          <button
            onClick={handlePreviewInvoicePdf}
            className="ml-2 px-4 py-2 bg-green-700 text-white rounded shadow hover:bg-green-800 text-sm"
          >
            ⬇️ Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}