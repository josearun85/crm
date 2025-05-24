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
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', maxWidth: 950, margin: '0 auto', color: '#232323', fontSize: 15, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #ffd600', padding: '32px 32px 18px 32px', borderTopLeftRadius: 16, borderTopRightRadius: 16, background: 'linear-gradient(90deg, #fffbe6 60%, #fff 100%)' }}>
        <div>
          <img src="/logo.png" alt="Sign Company Logo" style={{ height: 110, width: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid #ffd600', background: '#fff', boxShadow: '0 2px 12px #ffd60033' }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 15, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: '#0a3d62', letterSpacing: 1 }}>Sign Company</div>
          <div style={{ fontSize: 15, color: '#555' }}>Shed #7, No.120, Malleshpalya Main Road,<br />New Thippasandra Post, Bangalore - 560 075</div>
          <div style={{ fontSize: 15, color: '#555' }}>PHONE: <b>8431550507</b></div>
          <div style={{ fontSize: 15, color: '#555' }}>GSTN: <b>29BPYPK6641B2Z6</b></div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 26, letterSpacing: 2, color: '#ffd600', background: '#0a3d62', padding: '10px 0', borderBottom: '2px solid #ffd600' }}>TAX INVOICE</div>
      {/* Bill to, Place of Supply, Invoice No, Date */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid #eee', fontSize: 15, background: '#fafbfc', padding: '18px 32px' }}>
        <div style={{ flex: 2, borderRight: '1.5px solid #eee', paddingRight: 24 }}>
          <div style={{ fontWeight: 700, color: '#0a3d62', marginBottom: 2 }}>Bill to</div>
          <div style={{ fontWeight: 500 }}>{customer.name || '-'}</div>
          <div style={{ whiteSpace: 'pre-line', color: '#444' }}>{customer.address || '-'}</div>
          <div style={{ color: '#444' }}><b>GSTIN No:-</b> {(customer.gstin || '').toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, borderRight: '1.5px solid #eee', paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ fontWeight: 700, color: '#0a3d62', marginBottom: 2 }}>Place of Supply</div>
          <div style={{ fontWeight: 500 }}>{invoice.place_of_supply}</div>
        </div>
        <div style={{ flex: 1, paddingLeft: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0a3d62' }}>
            <span>{invoice.status === 'Draft' ? 'DRAFT' : `INVOICE No: ${invoice.number}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontWeight: 700 }}>Dated</span>
            <span style={{ fontWeight: 500 }}>{invoice.date}</span>
          </div>
          {/* Show PO Number and PO Date if available */}
          {invoice.po_number && (
            <div style={{ marginTop: 4, color: '#444' }}>
              <b>PO Number:</b> {invoice.po_number}
              {invoice.po_date && (
                <span style={{ marginLeft: 12 }}><b>PO Date:</b> {new Date(invoice.po_date).toLocaleDateString('en-GB')}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0, fontSize: 15, marginBottom: 0 }}>
        <thead>
          <tr style={{ background: '#f3f3f3', color: '#0a3d62', fontWeight: 700, fontSize: 16 }}>
            <th style={{ border: '1.5px solid #eee', padding: 10 }}>S. No.</th>
            <th style={{ border: '1.5px solid #eee', padding: 10 }}>Name & Description</th>
            <th style={{ border: '1.5px solid #eee', padding: 10 }}>HSN Code</th>
            <th style={{ border: '1.5px solid #eee', padding: 10 }}>Qty</th>
            <th style={{ border: '1.5px solid #eee', padding: 10 }}>Rate</th>
            <th style={{ border: '1.5px solid #eee', padding: 10 }}>Amount</th>
            <th style={{ border: '1.5px solid #eee', padding: 10 }}>GST</th>
            <th style={{ border: '1.5px solid #eee', padding: 10 }}>Cost After Tax</th>
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
                <td style={{ border: '1.5px solid #eee', padding: 10, textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1.5px solid #eee', padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{item.name || ''}</div>
                  {item.description && item.description !== 'EMPTY' && (
                    <div style={{ fontWeight: 400, color: '#555', whiteSpace: 'pre-line' }}>{item.description}</div>
                  )}
                </td>
                <td style={{ border: '1.5px solid #eee', padding: 10, textAlign: 'center' }}>{item.hsn_code}</td>
                <td style={{ border: '1.5px solid #eee', padding: 10, textAlign: 'center' }}>{item.qty}</td>
                <td style={{ border: '1.5px solid #eee', padding: 10, textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ border: '1.5px solid #eee', padding: 10, textAlign: 'right' }}>{amount.toFixed(2)}</td>
                <td style={{ border: '1.5px solid #eee', padding: 10, textAlign: 'right' }}>{gstAmount.toFixed(2)} <span style={{ color: '#888' }}>({gstPercent}%)</span></td>
                <td style={{ border: '1.5px solid #eee', padding: 10, textAlign: 'right' }}>{costAfterTax.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Summary */}
      <div style={{ display: 'flex', fontSize: 16, marginTop: 0, background: '#fafbfc', padding: '18px 32px 0 32px', borderBottom: '1.5px solid #eee' }}>
        <div style={{ flex: 1, paddingRight: 24 }}>
          <div style={{ maxWidth: 340, float: 'left', fontWeight: 600, color: '#0a3d62' }}>
            <div style={{ marginBottom: 2 }}>Total</div>
            {Number(invoice.discount) > 0 && <div style={{ marginBottom: 2 }}>Less Discount</div>}
            <div style={{ marginBottom: 2 }}>ADD SGST</div>
            <div style={{ marginBottom: 2 }}>ADD CGST</div>
          </div>
          <div style={{ float: 'right', textAlign: 'right', fontWeight: 600, minWidth: 120, color: '#232323' }}>
            {Number(invoice.discount) > 0 && <div style={{ marginBottom: 2 }}>{invoice.discount}</div>}
            <div style={{ marginBottom: 2 }}>{invoice.taxable_value}</div>
            <div style={{ marginBottom: 2 }}>9% {invoice.sgst}</div>
            <div style={{ marginBottom: 2 }}>9% {invoice.cgst}</div>
            <div style={{ marginTop: 12, fontWeight: 900, fontSize: 22, color: '#0a3d62' }}>Total<br />{invoice.grand_total}</div>
          </div>
          <div style={{ clear: 'both' }}></div>
        </div>
      </div>
      {/* Footer */}
      <div style={{ borderTop: '1.5px solid #eee', fontSize: 15, marginTop: 0, padding: '18px 32px 32px 32px', display: 'flex', background: '#fffbe6', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
        <div style={{ flex: 2, paddingRight: 24 }}>
          <div style={{ fontWeight: 700, color: '#0a3d62', marginBottom: 4 }}>Amount Chargeable (in words)</div>
          <div style={{ fontWeight: 500, color: '#232323', marginBottom: 8 }}>{amountInWords}</div>
          <div style={{ color: '#444' }}>Company's PAN: <b>BYPPK6641B</b></div>
          <div style={{ color: '#444' }}>Payment Terms: <b>Immediate</b></div>
          <div style={{ color: '#444' }}>Note-Please make cheques in favor of <b>"SIGN COMPANY"</b></div>
        </div>
        <div style={{ flex: 2, borderLeft: '1.5px solid #ffd600', paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ fontWeight: 700, color: '#0a3d62', marginBottom: 4 }}>BANK DETAILS</div>
          <div style={{ fontWeight: 500, color: '#232323', marginBottom: 2 }}>Sign Company</div>
          <div style={{ color: '#444' }}>A/C No: <b>59986534909</b></div>
          <div style={{ color: '#444' }}>IFSC: <b>IDFB0080184</b></div>
          <div style={{ color: '#444' }}>Bank name: <b>IDFC FIRST</b></div>
          <div style={{ color: '#444' }}>Branch: <b>JEEVAN BIMA NAGAR BRANCH</b></div>
          <div style={{ color: '#444' }}>UPI ID: <b>signcompany@idfcbank</b></div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', borderLeft: '1.5px solid #ffd600', paddingLeft: 24 }}>
          <div style={{ fontWeight: 700, color: '#0a3d62', marginBottom: 8, fontSize: 16 }}>SCAN & PAY</div>
          <img src="/qr.png" alt="UPI QR" style={{ height: 110, width: 110, objectFit: 'contain', border: '1.5px solid #ffd600', borderRadius: 12, background: '#fff', marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>UPI ID: signcompany@idfcbank</div>
          <div style={{ fontWeight: 700, color: '#0a3d62', marginTop: 24 }}>For SIGN COMPANY</div>
          <div style={{ fontWeight: 500, marginTop: 24, color: '#232323' }}>Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}
