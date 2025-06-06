import React from "react";

// Add CSS styles for print layout
const printStyles = `
  @media print {
    html, body {
      width: 100% !important;
      height: 100% !important;
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
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 !important;
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
      width: 210mm;
      min-height: 297mm;
      margin: 24px auto;
      box-shadow: 0 0 0 2px #1976d2, 0 2px 8px #0002;
      border: 2px dashed #1976d2;
      background: #fff;
      position: relative;
    }
    .a4-outline {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      border: 2px dashed #1976d2;
      pointer-events: none;
      z-index: 10;
      display: block;
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
  const amountInWords = invoice.amount_in_words || numberToWords(invoice.grand_total || 0);
  // Use absolute URLs for images
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const logoUrl = baseUrl + '/logo.png';
  const qrUrl = baseUrl + '/qr.png';

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
          margin: isPdfMode ? '0' : '24px auto',
          padding: isPdfMode ? '0' : undefined,
        }}
      >
        {/* A4 outline for preview only, not for PDF */}
        {!isPdfMode && <div className="a4-outline" />}
        {/* Header */}
        <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0', padding: isPdfMode ? '0 28px 12px 28px' : '24px 28px 12px 28px', borderTopLeftRadius: isPdfMode ? 0 : 12, borderTopRightRadius: isPdfMode ? 0 : 12, background: '#fafbfc', marginTop: 0 }}>
          <div>
            <img src={logoUrl} alt="Sign Company Logo" style={{ height: 90, width: 90, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e0e0e0', background: '#fff', boxShadow: '0 1px 4px #0001' }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#232323', letterSpacing: 0.2, fontFamily: 'Inter, Helvetica, Arial, sans-serif', textTransform: 'uppercase' }}>Sign Company</div>
            <div style={{ color: '#444' }}>Shed #7, No.120, Malleshpalya Main Road,<br />New Thippasandra Post, Bangalore - 560 075</div>
            <div style={{ color: '#444' }}>PHONE: <b>8431550507</b></div>
            <div style={{ color: '#444' }}>GSTN: <b>29BPYPK6641B2Z6</b></div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, letterSpacing: 1, color: '#d32f2f', background: '#fff', padding: '10px 0 10px 0', borderBottom: '1px solid #e0e0e0', fontFamily: 'Inter, Helvetica, Arial, sans-serif', textTransform: 'uppercase' }}>Tax Invoice</div>
        
        {/* Bill to, Place of Supply, Invoice No, Date */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', fontSize: 13, background: '#fafbfc', padding: '16px 28px', gap: 18 }}>
          <div style={{ flex: 2, borderRight: '1px solid #e0e0e0', paddingRight: 14 }}>
            <div style={{ fontWeight: 600, color: '#232323', marginBottom: 2, fontSize: 13 }}>Bill to</div>
            <div style={{ fontWeight: 500 }}>{customer.name || '-'}</div>
            <div style={{ whiteSpace: 'pre-line', color: '#444', fontWeight: 400 }}>{customer.address || '-'}</div>
            <div style={{ color: '#444', fontWeight: 400 }}><b>GSTIN No:-</b> {(customer.gstin || '').toUpperCase()}</div>
          </div>
          <div style={{ flex: 1, borderRight: '1px solid #e0e0e0', paddingLeft: 14, paddingRight: 14 }}>
            <div style={{ fontWeight: 600, color: '#232323', marginBottom: 2, fontSize: 13 }}>Place of Supply</div>
            <div style={{ fontWeight: 500 }}>{invoice.place_of_supply}</div>
          </div>
          <div style={{ flex: 1, paddingLeft: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#d32f2f', fontSize: 13 }}>
              <span>{invoice.status === 'Draft' ? 'DRAFT' : <span>INVOICE No: <span style={{ color: '#d32f2f' }}>{invoice.number}</span></span>}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontWeight: 600 }}>Dated</span>
              <span style={{ fontWeight: 400 }}>{invoice.date}</span>
            </div>
            {/* Show PO Number and PO Date if available */}
            {invoice.po_number && (
              <div style={{ marginTop: 3, color: '#444', fontWeight: 400 }}>
                <b>PO Number:</b> {invoice.po_number}
                {invoice.po_date && (
                  <span style={{ marginLeft: 8 }}><b>PO Date:</b> {new Date(invoice.po_date).toLocaleDateString('en-GB')}</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Table */}
        <table className="invoice-table" style={{ width: isPdfMode ? 740 : '100%', maxWidth: isPdfMode ? 740 : '100%', borderCollapse: 'collapse', marginTop: 0, fontSize: 13, marginBottom: 0, fontFamily: 'Inter, Helvetica, Arial, sans-serif', letterSpacing: 0.05 }}>
          <thead>
            <tr style={{ background: '#fafbfc', color: '#232323', fontWeight: 600, fontSize: 13 }}>
              <th style={{ border: '1px solid #e0e0e0', padding: 7, minWidth: '32px' }}>S. No.</th>
              <th style={{ border: '1px solid #e0e0e0', padding: 7, minWidth: '180px' }}>Name & Description</th>
              <th style={{ border: '1px solid #e0e0e0', padding: 7, minWidth: '48px' }}>HSN Code</th>
              <th style={{ border: '1px solid #e0e0e0', padding: 7, minWidth: '32px' }}>Qty</th>
              <th style={{ border: '1px solid #e0e0e0', padding: 7, minWidth: '48px' }}>Rate</th>
              <th style={{ border: '1px solid #e0e0e0', padding: 7, minWidth: '48px' }}>Amount</th>
              <th style={{ border: '1px solid #e0e0e0', padding: 7, minWidth: '48px' }}>GST</th>
              <th style={{ border: '1px solid #e0e0e0', padding: 7, minWidth: '64px' }}>Cost After Tax</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const amount = Number(item.amount);
              const gstPercent = Number(item.gst_percent || 0);
              const gstAmount = amount * gstPercent / 100;
              const costAfterTax = amount + gstAmount;
              return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ border: '1px solid #e0e0e0', padding: 6, textAlign: 'center', fontWeight: 500, verticalAlign: 'top' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: 6, verticalAlign: 'top', wordWrap: 'break-word', wordBreak: 'break-word' }}>
                    <div style={{ fontWeight: 600 }}>{item.name || ''}</div>
                    {item.description && item.description !== 'EMPTY' && (
                      <div style={{ fontWeight: 400, color: '#444', whiteSpace: 'pre-line' }}>{item.description}</div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #e0e0e0', padding: 6, textAlign: 'center', fontWeight: 500, verticalAlign: 'top' }}>{item.hsn_code}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: 6, textAlign: 'center', fontWeight: 500, verticalAlign: 'top' }}>{item.qty}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: 6, textAlign: 'right', fontWeight: 500, verticalAlign: 'top' }}>{Number(item.rate).toFixed(2)}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: 6, textAlign: 'right', fontWeight: 500, verticalAlign: 'top' }}>{amount.toFixed(2)}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: 6, textAlign: 'right', fontWeight: 500, verticalAlign: 'top' }}>{gstAmount.toFixed(2)} <span style={{ color: '#d32f2f', fontWeight: 600 }}>({gstPercent}%)</span></td>
                  <td style={{ border: '1px solid #e0e0e0', padding: 6, textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>{costAfterTax.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Summary */}
        <div className="invoice-summary" style={{ display: 'flex', fontSize: 13, marginTop: 0, background: '#fafbfc', padding: '12px 28px 0 28px', borderBottom: '1px solid #e0e0e0', gap: 18 }}>
          <div style={{ flex: 1, paddingRight: 14 }}>
            <div style={{ maxWidth: 340, float: 'left', fontWeight: 600, color: '#232323', fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontSize: 13 }}>
              <div style={{ marginBottom: 2 }}>Total</div>
              {Number(invoice.discount) > 0 && <div style={{ marginBottom: 2 }}>Less Discount</div>}
              <div style={{ marginBottom: 2 }}>ADD SGST</div>
              <div style={{ marginBottom: 2 }}>ADD CGST</div>
            </div>
            <div style={{ float: 'right', textAlign: 'right', fontWeight: 600, minWidth: 120, color: '#232323', fontSize: 13 }}>
              {Number(invoice.discount) > 0 && <div style={{ marginBottom: 2 }}>{invoice.discount}</div>}
              <div style={{ marginBottom: 2 }}>{invoice.taxable_value}</div>
              <div style={{ marginBottom: 2, color: '#d32f2f' }}>9% {invoice.sgst}</div>
              <div style={{ marginBottom: 2, color: '#d32f2f' }}>9% {invoice.cgst}</div>
              <div style={{ marginTop: 14, marginBottom: 14, fontWeight: 700, fontSize: 15, color: '#d32f2f', letterSpacing: 0.2 }}>Total<br />{invoice.grand_total}</div>
            </div>
            <div style={{ clear: 'both' }}></div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="invoice-footer" style={{ borderTop: '1px solid #e0e0e0', fontSize: 13, marginTop: 0, padding: '18px 28px 24px 28px', display: 'flex', background: '#fff', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, gap: 18 }}>
          <div style={{ flex: 2, paddingRight: 14 }}>
            <div style={{ fontWeight: 600, color: '#232323', marginBottom: 4, fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontSize: 13 }}>Amount Chargeable (in words)</div>
            <div style={{ fontWeight: 500, color: '#232323', marginBottom: 8 }}>{amountInWords}</div>
            <div style={{ color: '#444', fontWeight: 400 }}>Company's PAN: <b>BYPPK6641B</b></div>
            <div style={{ color: '#444', fontWeight: 400 }}>Payment Terms: <b>Immediate</b></div>
            <div style={{ color: '#444', fontWeight: 400 }}>Note-Please make cheques in favor of <b>"SIGN COMPANY"</b></div>
          </div>
          <div style={{ flex: 2, borderLeft: '1px solid #e0e0e0', paddingLeft: 14, paddingRight: 14 }}>
            <div style={{ fontWeight: 600, color: '#232323', marginBottom: 4, fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontSize: 13 }}>BANK DETAILS</div>
            <div style={{ fontWeight: 500, color: '#232323', marginBottom: 2 }}>Sign Company</div>
            <div style={{ color: '#444', fontWeight: 400 }}>A/C No: <b>59986534909</b></div>
            <div style={{ color: '#444', fontWeight: 400 }}>IFSC: <b>IDFB0080184</b></div>
            <div style={{ color: '#444', fontWeight: 400 }}>Bank name: <b>IDFC FIRST</b></div>
            <div style={{ color: '#444', fontWeight: 400 }}>Branch: <b>JEEVAN BIMA NAGAR BRANCH</b></div>
            <div style={{ color: '#444', fontWeight: 400 }}>UPI ID: <b>signcompany@idfcbank</b></div>
          </div>
          <div style={{ flex: 1.2, textAlign: 'center', borderLeft: '1px solid #e0e0e0', paddingLeft: 14 }}>
            <div style={{ fontWeight: 700, color: '#232323', marginBottom: 12, fontSize: 15, fontFamily: 'Inter, Helvetica, Arial, sans-serif', letterSpacing: 0.5 }}>SCAN & PAY</div>
            <img src={qrUrl} alt="UPI QR" style={{ height: 100, width: 100, objectFit: 'contain', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16, fontWeight: 500 }}>UPI ID: signcompany@idfcbank</div>
            <div style={{ fontWeight: 700, color: '#232323', marginTop: 18, fontFamily: isPdfMode ? 'Helvetica, Arial, sans-serif' : 'Inter, Helvetica, Arial, sans-serif', fontSize: 13, letterSpacing: 0.5, wordSpacing: 2 }}>For SIGN COMPANY</div>
            <div style={{ fontWeight: 500, marginTop: 10, color: '#232323', fontSize: 12, letterSpacing: 0.5, wordSpacing: 2 }}>
              <span>Authorised</span>
              <span style={{ display: 'inline-block', minWidth: 8 }}></span>
              <span>Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
