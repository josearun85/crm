import React from "react";

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

export default function InvoicePdf({ invoice, customer, items }) {
  // invoice: { number, date, place_of_supply, sgst, cgst, total, ... }
  // customer: { name, address, gstin }
  // items: [{ description, hsn_code, qty, unit, rate, amount }]
  const amountInWords = invoice.amount_in_words || numberToWords(invoice.grand_total || 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 900, margin: '0 auto', color: '#222', fontSize: 14, border: '1px solid #222' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #222', padding: 8 }}>
        <div>
          <img src="/logo.png" alt="Sign Company Logo" style={{ height: 60, marginBottom: 8 }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 13 }}>
          <div style={{ fontWeight: 'bold' }}>Sign Company</div>
          <div>Shed #7, No.120,<br />Malleshpalya Main Road,<br />New Thippasandra Post,<br />Bangalore - 560 075</div>
          <div>PHONE: 8431550507</div>
          <div>GSTN: 29BPYPK6641B2Z6</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, borderBottom: '2px solid #222', padding: 4 }}>TAX INVOICE</div>
      {/* Bill to, Place of Supply, Invoice No, Date */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222', fontSize: 13 }}>
        <div style={{ flex: 2, borderRight: '1px solid #222', padding: 8 }}>
          <div style={{ fontWeight: 'bold' }}>Bill to</div>
          <div>{customer.name || '-'}</div>
          <div style={{ whiteSpace: 'pre-line' }}>{customer.address || '-'}</div>
          <div><b>GSTIN No:-</b> {(customer.gstin || '').toUpperCase()}</div>
          {customer.pan && <div>PAN: {(customer.pan || '').toUpperCase()}</div>}
        </div>
        <div style={{ flex: 1, borderRight: '1px solid #222', padding: 8 }}>
          <div style={{ fontWeight: 'bold' }}>Place of Supply</div>
          <div>{invoice.place_of_supply}</div>
        </div>
        <div style={{ flex: 1, padding: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>INVOICE No</span>
            <span>{invoice.number}.{invoice.version || 1}.{invoice.date ? new Date(invoice.date).getFullYear() : new Date().getFullYear()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontWeight: 'bold' }}>Dated</span>
            <span>{invoice.date}</span>
          </div>
          {/* Show PO Number and PO Date if available */}
          {invoice.po_number && (
            <div style={{ marginTop: 4 }}>
              <b>PO Number:</b> {invoice.po_number}
              {invoice.po_date && (
                <span style={{ marginLeft: 12 }}><b>PO Date:</b> {new Date(invoice.po_date).toLocaleDateString('en-GB')}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f3f3f3' }}>
            <th style={{ border: '1px solid #222', padding: 6 }}>S. No.</th>
            <th style={{ border: '1px solid #222', padding: 6 }}>Name & Description</th>
            <th style={{ border: '1px solid #222', padding: 6 }}>HSN Code</th>
            <th style={{ border: '1px solid #222', padding: 6 }}>Qty</th>
            <th style={{ border: '1px solid #222', padding: 6 }}>Rate</th>
            <th style={{ border: '1px solid #222', padding: 6 }}>Amount</th>
            <th style={{ border: '1px solid #222', padding: 6 }}>GST</th>
            <th style={{ border: '1px solid #222', padding: 6 }}>Cost After Tax</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const amount = Number(item.amount);
            const gstPercent = Number(item.gst_percent || 0);
            const gstAmount = amount * gstPercent / 100;
            const costAfterTax = amount + gstAmount;
            return (
              <tr key={idx}>
                <td style={{ border: '1px solid #222', padding: 6, textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #222', padding: 6 }}>
                  <div style={{ fontWeight: 'bold' }}>{item.name || ''}</div>
                  {item.description && item.description !== 'EMPTY' && (
                    <div style={{ fontWeight: 'normal', whiteSpace: 'pre-line' }}>{item.description}</div>
                  )}
                </td>
                <td style={{ border: '1px solid #222', padding: 6, textAlign: 'center' }}>{item.hsn_code}</td>
                <td style={{ border: '1px solid #222', padding: 6, textAlign: 'center' }}>{item.qty}</td>
                <td style={{ border: '1px solid #222', padding: 6, textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ border: '1px solid #222', padding: 6, textAlign: 'right' }}>{amount.toFixed(2)}</td>
                <td style={{ border: '1px solid #222', padding: 6, textAlign: 'right' }}>{gstAmount.toFixed(2)} ({gstPercent}%)</td>
                <td style={{ border: '1px solid #222', padding: 6, textAlign: 'right' }}>{costAfterTax.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Summary */}
      <div style={{ display: 'flex', fontSize: 13, marginTop: 8 }}>
        <div style={{ flex: 1, padding: 8 }}>
          <div style={{ maxWidth: 340, float: 'left' }}>
            <div style={{ marginBottom: 2 }}>Total</div>
            {Number(invoice.discount) > 0 && <div style={{ marginBottom: 2 }}>Less Discount</div>}
            <div style={{ marginBottom: 2 }}>Taxable Value</div>
            <div style={{ marginBottom: 2 }}>ADD SGST</div>
            <div style={{ marginBottom: 2 }}>ADD CGST</div>
          </div>
          <div style={{ float: 'right', textAlign: 'right', fontWeight: 'normal', minWidth: 120 }}>
            <div style={{ marginBottom: 2 }}>{invoice.total}</div>
            {Number(invoice.discount) > 0 && <div style={{ marginBottom: 2 }}>{invoice.discount}</div>}
            <div style={{ marginBottom: 2 }}>{invoice.taxable_value}</div>
            <div style={{ marginBottom: 2 }}>9% {invoice.sgst}</div>
            <div style={{ marginBottom: 2 }}>9% {invoice.cgst}</div>
            <div style={{ marginTop: 12, fontWeight: 'bold', fontSize: 16 }}>Total<br />{invoice.grand_total}</div>
          </div>
          <div style={{ clear: 'both' }}></div>
        </div>
      </div>
      {/* Footer */}
      <div style={{ borderTop: '1px solid #222', fontSize: 12, marginTop: 8, padding: 8, display: 'flex' }}>
        <div style={{ flex: 2 }}>
          <div><b>Amount Chargeable (in words)</b></div>
          <div>{amountInWords}</div>
          <div>Company's PAN: BPYPK6641B</div>
          <div>Payment Terms: Immediate</div>
          <div>Note-Please make cheques in favor of "SIGN COMPANY"</div>
        </div>
        <div style={{ flex: 2, borderLeft: '1px solid #222', paddingLeft: 8 }}>
          <div><b>BANK DETAILS</b></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div>Sign Company</div>
              <div>A/C No: 59986534909</div>
              <div>IFSC: IDFB0080184</div>
              <div>Bank name: IDFC FIRST</div>
              <div>Branch: JEEVAN BIMA NAGAR BRANCH</div>
              <div>UPI ID: signcompany@idfcbank</div>
            </div>
            <img src="/qr.png" alt="UPI QR" style={{ height: 80, width: 80, objectFit: 'contain', border: '1px solid #ccc', borderRadius: 8, background: '#fff' }} />
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #222', paddingLeft: 8 }}>
          <div style={{ fontWeight: 'bold', marginTop: 32 }}>For SIGN COMPANY</div>
          <div style={{ marginTop: 32 }}>Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}
