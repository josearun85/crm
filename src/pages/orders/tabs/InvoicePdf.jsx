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

export default function InvoicePdf({ invoice, customer, items, isPdfMode }) {
  // invoice: { number, date, place_of_supply, sgst, cgst, total, ... }
  // customer: { name, address, gstin }
  // items: [{ description, hsn_code, qty, unit, rate, amount }]
  // Base64 image state
  const [logoBase64, setLogoBase64] = useState(null);
  const [qrBase64, setQrBase64] = useState(null);

  // Use absolute URLs for images
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const logoUrl = baseUrl + '/logo.png';
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

  // In InvoicePdf, show Place of Supply and Invoice Number/Date in the header
  // Find the correct values from props
  const invoiceNumber = invoice.invoice_number || invoice.number || '-';
  const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : '-';
  const placeOfSupply = invoice.place_of_supply || customer?.place_of_supply || '-';

  // --- Totals Calculation ---
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const discount = Number(invoice.discount) || 0;
  const taxableValue = total - discount;
  // Assume 9% SGST and 9% CGST for all items (or use item.gst_percent if needed)
  const sgst = items.reduce((sum, item) => sum + (Number(item.amount) * 0.09), 0);
  const cgst = items.reduce((sum, item) => sum + (Number(item.amount) * 0.09), 0);
  const grandTotal = taxableValue + sgst + cgst;

  // Always use computed grandTotal for amount in words
  const amountInWords = numberToWords(grandTotal);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div
        className="invoice-container"
        style={{
          fontFamily: 'Inter, Helvetica, Arial, sans-serif',
          width: isPdfMode ? 760 : 794,
          maxWidth: isPdfMode ? 760 : 794,
          color: '#232323',
          fontSize: 13,
          background: '#fff',
          border: isPdfMode ? 'none' : '1px solid #e0e0e0',
          borderRadius: isPdfMode ? 0 : 12,
          boxShadow: isPdfMode ? 'none' : '0 2px 8px #0001',
          padding: 0,
          position: 'relative',
          margin: isPdfMode ? '0 auto' : '24px auto',
          // Remove blue border and fit content
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #0a3d62', padding: '0 0 12px 0', marginBottom: 0, background: '#fafbfc' }}>
          <img src={logoBase64 || logoUrl} alt="Sign Company Logo" style={{ height: 80, width: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ffe066', background: '#fff', marginRight: 24 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0a3d62', letterSpacing: 1, fontFamily: 'Inter, Helvetica, Arial, sans-serif', textTransform: 'uppercase', marginBottom: 2 }}>SIGN COMPANY</div>
            <div style={{ fontSize: 14, color: '#222', fontWeight: 500 }}>Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bengaluru - 560 075</div>
            <div style={{ fontSize: 14, color: '#222', fontWeight: 500 }}>PHONE: <b>8431505007</b> &nbsp;|&nbsp; GSTN: <b>29BPYPPK6641B2Z6</b></div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Invoice Info */}
          <div style={{ fontSize: 14, color: '#555', fontWeight: 600, borderBottom: '1px solid #e0e0e0', paddingBottom: 8 }}>
            Invoice #{invoiceNumber} &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; Date: {invoiceDate}
          </div>
          <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>
            Place of Supply: <span style={{ fontWeight: 400 }}>{placeOfSupply}</span>
          </div>
        </div>
        {/* Table - Items */}
        <div style={{ padding: '0 24px', overflowX: 'auto' }}>
          <table className="invoice-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead style={{ background: '#0a3d62', color: '#fff', fontSize: 14 }}>
              <tr>
                <th style={{ padding: '10px', border: '1px solid #fff', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '10px', border: '1px solid #fff', textAlign: 'left' }}>HSN/SAC</th>
                <th style={{ padding: '10px', border: '1px solid #fff', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '10px', border: '1px solid #fff', textAlign: 'center' }}>Rate</th>
                <th style={{ padding: '10px', border: '1px solid #fff', textAlign: 'center' }}>Amount</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 14, color: '#333' }}>
              {items.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '8px', border: '1px solid #e0e0e0' }}>{item.description}</td>
                  <td style={{ padding: '8px', border: '1px solid #e0e0e0' }}>{item.hsn_code}</td>
                  <td style={{ padding: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ padding: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>{item.rate}</td>
                  <td style={{ padding: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Summary - Totals */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #e0e0e0', marginTop: 16 }}>
          <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>
            Total Amount: <span style={{ fontWeight: 700, fontSize: 16 }}>₹ {invoice.grand_total}</span>
          </div>
          <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>
            Amount in Words: <span style={{ fontWeight: 400 }}>{amountInWords}</span>
          </div>
        </div>
        {/* Footer - QR Code and UPI ID */}
        <div className="invoice-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', marginTop: 24 }}>
          <div style={{ flex: 1, fontSize: 12, color: '#777', lineHeight: 1.6 }}>
            Thank you for your business! Please make the payment within 15 days.
          </div>
          <div style={{ flex: 1.2, textAlign: 'center', borderLeft: '1px solid #e0e0e0', paddingLeft: 14 }}>
            {/* <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Scan to Pay</div> */}
            <img src={qrBase64 || qrUrl} alt="UPI QR" style={{ height: 150, width: 150, objectFit: 'contain', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', marginBottom: 12 }} />
            {/* <div style={{ fontSize: 12, color: '#888', marginBottom: 16, fontWeight: 500 }}>UPI ID: signcompany@idfcbank</div> */}
            <div style={{ fontSize: 12, color: '#888', marginBottom: 0, fontWeight: 500 }}>For any queries, contact us at support@signcompany.com</div>
          </div>
        </div>
      </div>
    </>
  );
}
