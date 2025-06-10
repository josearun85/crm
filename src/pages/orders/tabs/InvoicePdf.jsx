import React, { useEffect, useState } from "react";

// Add CSS styles for print layout
const printStyles = `
  @media print {
    html, body {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }
    @page {
      size: A4;
      margin: 0;
    }
    .invoice-container {
      width: 794px !important; /* A4 at 96dpi */
      min-width: 0 !important;
      max-width: 794px !important;
      min-height: 1122px !important; /* A4 height at 96dpi */
      height: auto !important;
      max-height: none !important;
      margin: 0 auto !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      page-break-inside: avoid;
      position: static !important;
      background: #fff !important;
      display: block !important;
    }
    .a4-outline {
      display: none !important;
    }
    .invoice-table {
      width: 100% !important;
      table-layout: fixed !important;
      page-break-inside: auto;
      font-size: 10px !important;
    }
    .invoice-table th, .invoice-table td {
      word-break: break-word;
      overflow-wrap: break-word;
      padding: 3px 4px !important;
      font-size: 10px !important;
    }
    
    .invoice-header {
      page-break-inside: avoid;
    }
    
    .invoice-table {
      page-break-inside: auto;
    }
    
    .invoice-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    
    .invoice-table thead {
      display: table-header-group;
    }
    
    .invoice-table tbody tr {
      page-break-inside: avoid;
    }
    
    .invoice-footer {
      page-break-inside: avoid;
      page-break-before: auto;
    }
    
    .invoice-summary {
      page-break-inside: avoid;
    }
  }
  @media screen {
    .invoice-container {
      min-height: 100vh;
      width: 794px;
      max-width: 100vw;
      margin: 24px auto;
      box-shadow: 0 2px 8px #0002;
      border: 1px solid #e0e0e0;
      background: #fff;
      position: relative;
      border-radius: 12px;
      padding: 0;
    }
    .a4-outline {
      display: none !important;
    }
  }
`;

function numberToWords(num) {
  // Simple number to words for INR (up to crores)
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

export default function InvoicePdf({ invoice, customer, items, isPdfMode, allBoqs = [] }) {
  // invoice: { number, date, place_of_supply, sgst, cgst, total, ... }
  // customer: { name, address, gstin }
  // items: [{ description, hsn_code, qty, unit, rate, amount }]
  // Base64 image state
  const [logoBase64, setLogoBase64] = useState(null);
  const [qrBase64, setQrBase64] = useState(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const logoUrl = baseUrl + '/logo.jpeg';
  const qrUrl = baseUrl + '/qr.png';

  // Load images as base64 for PDF rendering
  useEffect(() => {
    // Helper to fetch and convert to base64
    const toBase64 = async (url, setter) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setter(reader.result);
        reader.readAsDataURL(blob);
      } catch (e) {
        // fallback: do nothing
      }
    };
    toBase64(logoUrl, setLogoBase64);
    toBase64(qrUrl, setQrBase64);
    // eslint-disable-next-line
  }, [logoUrl, qrUrl]);

  // Header fields (robust extraction)
  function getFirstNonEmpty(...args) {
    for (const v of args) {
      if (v !== undefined && v !== null && String(v).trim() !== '' && v !== '-') return v;
    }
    return '-';
  }

  const invoiceNumber = getFirstNonEmpty(
    invoice.invoice_number,
    invoice.number,
    invoice.invoiceNo,
    invoice.no,
    invoice.id,
    invoice.id_number,
    invoice.idNumber,
    invoice?.meta?.invoice_number,
    invoice?.meta?.number,
    '-'
  );
  const invoiceDate = getFirstNonEmpty(
    invoice.invoice_date && new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
    invoice.date && new Date(invoice.date).toLocaleDateString('en-IN'),
    invoice.created_at && new Date(invoice.created_at).toLocaleDateString('en-IN'),
    invoice?.meta?.date && new Date(invoice.meta.date).toLocaleDateString('en-IN'),
    '-'
  );
  const placeOfSupply = getFirstNonEmpty(
    invoice.place_of_supply,
    invoice.placeOfSupply,
    invoice.supply_place,
    invoice.supplyPlace,
    customer?.place_of_supply,
    customer?.placeOfSupply,
    customer?.supply_place,
    customer?.supplyPlace,
    '-'
  );
  const poNumber = getFirstNonEmpty(
    invoice.po_number,
    invoice.poNumber,
    invoice.po,
    invoice.purchase_order_number,
    invoice.purchaseOrderNumber,
    invoice?.meta?.po_number,
    '-'
  );
  const poDate = getFirstNonEmpty(
    invoice.po_date && new Date(invoice.po_date).toLocaleDateString('en-IN'),
    invoice.poDate && new Date(invoice.poDate).toLocaleDateString('en-IN'),
    invoice.purchase_order_date && new Date(invoice.purchase_order_date).toLocaleDateString('en-IN'),
    invoice.purchaseOrderDate && new Date(invoice.purchaseOrderDate).toLocaleDateString('en-IN'),
    invoice?.meta?.po_date && new Date(invoice.meta.po_date).toLocaleDateString('en-IN'),
    '-'
  );
  const jobName = getFirstNonEmpty(
    invoice.job_name,
    invoice.jobName,
    invoice.jobname,
    invoice.project_name,
    invoice.projectName,
    invoice.name, // <-- add this
    invoice.order_name, // <-- and this
    invoice?.meta?.job_name,
    invoice?.meta?.jobName,
    invoice?.meta?.project_name,
    invoice?.meta?.projectName,
    '-'
  );
  const clientName = getFirstNonEmpty(
    customer?.name,
    customer?.client_name,
    customer?.clientName,
    invoice.client_name,
    invoice.clientName,
    invoice?.meta?.client_name,
    invoice?.meta?.clientName,
    '-'
  );
  const gstin = getFirstNonEmpty(
    customer?.gstin,
    customer?.gst_no,
    customer?.gstNo,
    invoice.gstin,
    invoice.gst_no,
    invoice.gstNo,
    invoice?.meta?.gstin,
    invoice?.meta?.gst_no,
    invoice?.meta?.gstNo,
    '-'
  );

  // --- Totals Calculation (match on-screen margin logic) ---
  // Helper: get all BOQs for an item (returns array)
  function getItemBoqs(item) {
    if (!item.id) return [];
    return allBoqs.filter(b => b.signage_item_id === item.id);
  }
  // Helper: get all BOQs as a map for getSignageItemTotalWithMargin
  function getBoqsMap() {
    const map = {};
    allBoqs.forEach(b => {
      if (!map[b.signage_item_id]) map[b.signage_item_id] = [];
      map[b.signage_item_id].push(b);
    });
    return map;
  }
  const boqsMap = getBoqsMap();
  // Helper: get GST-billable scaling factor (copied from SignageItemsTab)
  function getGstBillableScaling() {
    // Try to get from invoice, fallback to 1
    if (typeof invoice.gstBillablePercent !== 'undefined' && invoice.gstBillablePercent !== null && invoice.gstBillablePercent !== '' && Number(invoice.gstBillablePercent) !== 100) {
      return Number(invoice.gstBillablePercent) / 100;
    }
    if (typeof invoice.gstBillableAmount !== 'undefined' && invoice.gstBillableAmount !== null && invoice.gstBillableAmount !== '' && items.length) {
      const billable = Number(invoice.gstBillableAmount);
      const originalTotal = items.reduce((sum, item) => sum + getSignageItemTotalWithMargin(item), 0);
      if (originalTotal && billable !== originalTotal) {
        return billable / originalTotal;
      }
    }
    return 1;
  }
  // Helper: get signage item total with margin (shared logic, used for both table and PDF)
  function getSignageItemTotalWithMargin(item) {
    // Find all BOQ items for this signage item
    const itemBoqs = allBoqs.filter(b => b.signage_item_id === item.id);
    const boqTotal = itemBoqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
    // Use margin logic if present
    if (item.total_with_margin && Number(item.total_with_margin) > 0) {
      return Number(item.total_with_margin);
    } else if (item.margin_percent && Number(item.margin_percent) > 0) {
      return boqTotal * (1 + Number(item.margin_percent) / 100);
    } else {
      return boqTotal;
    }
  }
  function getScaledRate(item) {
    const scaling = getGstBillableScaling();
    const totalWithMargin = getSignageItemTotalWithMargin(item) * scaling;
    const qty = Number(item.quantity ?? item.qty) || 1;
    if (!qty) return 0;
    return totalWithMargin / qty;
  }
  // Compute scaled items (with margin logic, always compute rate and amount from margin logic)
  const scaledItems = items.map(item => {
    const qty = Number(item.quantity ?? item.qty) || 1;
    const rate = getScaledRate(item);
    const amount = rate * qty;
    const gstP = Number(item.gst_percent ?? 18);
    const gstAmt = amount * gstP / 100;
    const costAfterTax = amount + gstAmt;
    return { ...item, qty, rate, amount, gstP, gstAmt, costAfterTax };
  });
  // Warn if allBoqs is empty
  if (!allBoqs || allBoqs.length === 0) {
    console.warn('InvoicePdf: allBoqs is empty, margin logic will not be applied.');
  }
  const total = scaledItems.reduce((sum, item) => sum + item.amount, 0);
  const discount = Number(invoice.discount) || 0;
  const netTotal = total - discount;
  const gst = scaledItems.reduce((sum, item) => sum + item.gstAmt, 0);
  const sgst = gst / 2;
  const cgst = gst / 2;
  const grandTotal = netTotal + gst;
  const amountInWords = numberToWords(grandTotal);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="invoice-container" style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif', width: isPdfMode ? 760 : 794, maxWidth: isPdfMode ? 760 : 794, color: '#232323', fontSize: 13, background: '#fff', border: isPdfMode ? 'none' : '1px solid #e0e0e0', borderRadius: isPdfMode ? 0 : 12, boxShadow: isPdfMode ? 'none' : '0 2px 8px #0001', padding: 0, position: 'relative', margin: isPdfMode ? '0 auto' : '24px auto' }}>
        {/* Classic Header: Company info left, meta right as table */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 32px 0 32px', background: '#fafbfc', marginBottom: 0 }}>
          <div style={{ minWidth: 260, maxWidth: 400 }}>
            <img src={logoBase64 || logoUrl} alt="Sign Company Logo" style={{ height: 110, marginBottom: 12}} />
            <div style={{ fontWeight: 900, fontSize: 28, marginTop: 0, letterSpacing: 1, textTransform: 'uppercase' }}>SIGN COMPANY</div>
            <div style={{ fontSize: 15, margin: '6px 0 0 0' }}>Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bangalore - 560 075</div>
            <div style={{ fontSize: 15 }}>PHONE: <b>8431505007</b></div>
            <div style={{ fontSize: 15 }}>GSTN: <b>29BPYPPK6641B2Z6</b></div>
          </div>
          <table style={{ minWidth: 320, fontSize: 15, fontWeight: 600, textAlign: 'right', borderCollapse: 'collapse', marginTop: 8, background: 'transparent' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'right', padding: '2px 8px' }}>INVOICE No:</td>
                <td style={{ color: '#d32f2f', fontWeight: 700, padding: '2px 0', textAlign: 'left' }}>{invoiceNumber}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'right', padding: '2px 8px' }}>Date:</td>
                <td style={{ fontWeight: 400, padding: '2px 0', textAlign: 'left' }}>{invoiceDate}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'right', padding: '2px 8px' }}>Place of Supply:</td>
                <td style={{ fontWeight: 400, padding: '2px 0', textAlign: 'left' }}>{placeOfSupply}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'right', padding: '2px 8px' }}>Job Name:</td>
                <td style={{ fontWeight: 400, padding: '2px 0', textAlign: 'left' }}>{jobName}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'right', padding: '2px 8px' }}>PO Number:</td>
                <td style={{ fontWeight: 400, padding: '2px 0', textAlign: 'left' }}>{poNumber}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'right', padding: '2px 8px' }}>PO Date:</td>
                <td style={{ fontWeight: 400, padding: '2px 0', textAlign: 'left' }}>{poDate}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'right', padding: '2px 8px' }}>Client:</td>
                <td style={{ fontWeight: 400, padding: '2px 0', textAlign: 'left' }}>{clientName}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'right', padding: '2px 8px' }}>GSTIN:</td>
                <td style={{ fontWeight: 700, padding: '2px 0', textAlign: 'left' }}>{gstin !== '-' ? gstin.toUpperCase() : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* TAX INVOICE Title */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, letterSpacing: 1, margin: '18px 0 8px 0' }}>TAX INVOICE</div>
        {/* Items Table - classic columns */}
        <div style={{ padding: '0 8px', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24, background: '#fff' }}>
            <thead style={{ background: '#f7f7f7' }}>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>S. No.</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Name & Description</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>HSN Code</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Qty</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Rate</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Amount</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>GST</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Cost After Tax</th>
              </tr>
            </thead>
            <tbody>
              {scaledItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>
                    <div style={{ fontWeight: 700 }}>{item.name || item.description || '-'}</div>
                    {item.description && (
                      <div style={{ fontWeight: 400, color: '#444', whiteSpace: 'pre-line' }}>{item.description}</div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.hsn_code || ''}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'right' }}>{item.rate.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'right' }}>{item.amount.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'right', fontWeight: 600 }}>{item.gstAmt.toFixed(2)}<br /><span style={{ fontWeight: 400, fontSize: 12 }}>({item.gstP}%)</span></td>
                  <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'right', fontWeight: 700 }}>{item.costAfterTax.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Summary Table - classic style */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, paddingRight: 32 }}>
          <table style={{ fontSize: 15, fontWeight: 600, minWidth: 320, background: '#fff' }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>TOTAL</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{total.toFixed(2)}</td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td style={{ textAlign: 'right', padding: '4px 8px' }}>DISCOUNT</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>{discount.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>NET TOTAL</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{netTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>GST Rate</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{scaledItems.length > 0 ? scaledItems[0].gstP : 18}%</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>CGST</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{cgst.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>SGST</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{sgst.toFixed(2)}</td>
              </tr>
              <tr style={{ fontWeight: 'bold', fontSize: 17 }}>
                <td style={{ textAlign: 'right', padding: '4px 8px', color: '#d32f2f' }}>GRAND TOTAL</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Amount in Words */}
        <div style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 0 32px', color: '#232323' }}>
          Amount Chargeable (in words)
        </div>
        <div style={{ fontSize: 15, margin: '0 0 8px 32px', color: '#232323' }}>{amountInWords}</div>
        {/* Terms & Conditions and Bank Details */}
        <div style={{ margin: '24px 32px 0 32px', fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 16 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Bank & Payment Details</div>
              <div>Company name: Sign Company</div>
              <div>Account number: 59986534909</div>
              <div>IFSC: IDFB0080184</div>
              <div>SWIFT code: IDFBINBBMUM</div>
              <div>Bank name: IDFC FIRST</div>
              <div>Branch: JEEVAN BIMA NAGAR BRANCH</div>
              {/* <div>UPI ID: signcompany@idfcbank</div> */}
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <img src={qrBase64 || qrUrl} alt="UPI QR" style={{ height: 150, width: 150, objectFit: 'contain', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', marginBottom: 12 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
