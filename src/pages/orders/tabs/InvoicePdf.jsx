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
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', maxWidth: 950, margin: '0 auto', color: '#232323', fontSize: 15, background: '#fff', border: '2.5px solid #ffd600', borderRadius: 18, boxShadow: '0 4px 24px #ffd60022', padding: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #ffd600', padding: '40px 40px 24px 40px', borderTopLeftRadius: 18, borderTopRightRadius: 18, background: 'linear-gradient(90deg, #fffbe6 0%, #fff 100%)' }}>
        <div>
          <img src="/logo.png" alt="Sign Company Logo" style={{ height: 120, width: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #ffd600', background: '#fff', boxShadow: '0 2px 16px #ffd60033' }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 16, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 900, fontSize: 32, color: '#d32f2f', letterSpacing: 1, fontFamily: 'Inter, Arial, sans-serif', textTransform: 'uppercase' }}>Sign Company</div>
          <div style={{ fontSize: 16, color: '#232323', fontWeight: 500 }}>Shed #7, No.120, Malleshpalya Main Road,<br />New Thippasandra Post, Bangalore - 560 075</div>
          <div style={{ fontSize: 16, color: '#232323', fontWeight: 500 }}>PHONE: <b>8431550507</b></div>
          <div style={{ fontSize: 16, color: '#232323', fontWeight: 500 }}>GSTN: <b>29BPYPK6641B2Z6</b></div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 28, letterSpacing: 2, color: '#ffd600', background: '#232323', padding: '18px 0', borderBottom: '4px solid #ffd600', fontFamily: 'Inter, Arial, sans-serif', textShadow: '0 2px 8px #ffd60022', textTransform: 'uppercase' }}>Tax Invoice</div>
      {/* Bill to, Place of Supply, Invoice No, Date */}
      <div style={{ display: 'flex', borderBottom: '2.5px solid #ffd600', fontSize: 16, background: '#fffbe6', padding: '28px 40px', gap: 32 }}>
        <div style={{ flex: 2, borderRight: '2.5px solid #ffd600', paddingRight: 32 }}>
          <div style={{ fontWeight: 800, color: '#d32f2f', marginBottom: 4, fontFamily: 'Inter, Arial, sans-serif', fontSize: 17 }}>Bill to</div>
          <div style={{ fontWeight: 600 }}>{customer.name || '-'}</div>
          <div style={{ whiteSpace: 'pre-line', color: '#232323', fontWeight: 500 }}>{customer.address || '-'}</div>
          <div style={{ color: '#232323', fontWeight: 500 }}><b>GSTIN No:-</b> {(customer.gstin || '').toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, borderRight: '2.5px solid #ffd600', paddingLeft: 32, paddingRight: 32 }}>
          <div style={{ fontWeight: 800, color: '#d32f2f', marginBottom: 4, fontFamily: 'Inter, Arial, sans-serif', fontSize: 17 }}>Place of Supply</div>
          <div style={{ fontWeight: 600 }}>{invoice.place_of_supply}</div>
        </div>
        <div style={{ flex: 1, paddingLeft: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#d32f2f', fontFamily: 'Inter, Arial, sans-serif', fontSize: 17 }}>
            <span>{invoice.status === 'Draft' ? 'DRAFT' : `INVOICE No: ${invoice.number}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ fontWeight: 800 }}>Dated</span>
            <span style={{ fontWeight: 600 }}>{invoice.date}</span>
          </div>
          {/* Show PO Number and PO Date if available */}
          {invoice.po_number && (
            <div style={{ marginTop: 8, color: '#232323', fontWeight: 500 }}>
              <b>PO Number:</b> {invoice.po_number}
              {invoice.po_date && (
                <span style={{ marginLeft: 16 }}><b>PO Date:</b> {new Date(invoice.po_date).toLocaleDateString('en-GB')}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, marginTop: 0, fontSize: 16, marginBottom: 0, fontFamily: 'Inter, Arial, sans-serif', letterSpacing: 0.2 }}>
        <thead>
          <tr style={{ background: '#fff', color: '#d32f2f', fontWeight: 800, fontSize: 17 }}>
            <th style={{ border: '2px solid #ffd600', padding: 14 }}>S. No.</th>
            <th style={{ border: '2px solid #ffd600', padding: 14 }}>Name & Description</th>
            <th style={{ border: '2px solid #ffd600', padding: 14 }}>HSN Code</th>
            <th style={{ border: '2px solid #ffd600', padding: 14 }}>Qty</th>
            <th style={{ border: '2px solid #ffd600', padding: 14 }}>Rate</th>
            <th style={{ border: '2px solid #ffd600', padding: 14 }}>Amount</th>
            <th style={{ border: '2px solid #ffd600', padding: 14 }}>GST</th>
            <th style={{ border: '2px solid #ffd600', padding: 14 }}>Cost After Tax</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const amount = Number(item.amount);
            const gstPercent = Number(item.gst_percent || 0);
            const gstAmount = amount * gstPercent / 100;
            const costAfterTax = amount + gstAmount;
            return (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fffbe6' }}>
                <td style={{ border: '2px solid #ffd600', padding: 14, textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                <td style={{ border: '2px solid #ffd600', padding: 14 }}>
                  <div style={{ fontWeight: 700 }}>{item.name || ''}</div>
                  {item.description && item.description !== 'EMPTY' && (
                    <div style={{ fontWeight: 500, color: '#232323', whiteSpace: 'pre-line' }}>{item.description}</div>
                  )}
                </td>
                <td style={{ border: '2px solid #ffd600', padding: 14, textAlign: 'center', fontWeight: 600 }}>{item.hsn_code}</td>
                <td style={{ border: '2px solid #ffd600', padding: 14, textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                <td style={{ border: '2px solid #ffd600', padding: 14, textAlign: 'right', fontWeight: 600 }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ border: '2px solid #ffd600', padding: 14, textAlign: 'right', fontWeight: 600 }}>{amount.toFixed(2)}</td>
                <td style={{ border: '2px solid #ffd600', padding: 14, textAlign: 'right', fontWeight: 600 }}>{gstAmount.toFixed(2)} <span style={{ color: '#d32f2f', fontWeight: 700 }}>({gstPercent}%)</span></td>
                <td style={{ border: '2px solid #ffd600', padding: 14, textAlign: 'right', fontWeight: 700 }}>{costAfterTax.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Summary */}
      <div style={{ display: 'flex', fontSize: 17, marginTop: 0, background: '#fffbe6', padding: '28px 40px 0 40px', borderBottom: '2.5px solid #ffd600', gap: 32 }}>
        <div style={{ flex: 1, paddingRight: 32 }}>
          <div style={{ maxWidth: 340, float: 'left', fontWeight: 800, color: '#d32f2f', fontFamily: 'Inter, Arial, sans-serif', fontSize: 17 }}>
            <div style={{ marginBottom: 4 }}>Total</div>
            {Number(invoice.discount) > 0 && <div style={{ marginBottom: 4 }}>Less Discount</div>}
            <div style={{ marginBottom: 4 }}>ADD SGST</div>
            <div style={{ marginBottom: 4 }}>ADD CGST</div>
          </div>
          <div style={{ float: 'right', textAlign: 'right', fontWeight: 800, minWidth: 120, color: '#232323', fontSize: 17 }}>
            {Number(invoice.discount) > 0 && <div style={{ marginBottom: 4 }}>{invoice.discount}</div>}
            <div style={{ marginBottom: 4 }}>{invoice.taxable_value}</div>
            <div style={{ marginBottom: 4 }}>9% {invoice.sgst}</div>
            <div style={{ marginBottom: 4 }}>9% {invoice.cgst}</div>
            <div style={{ marginTop: 16, fontWeight: 900, fontSize: 26, color: '#d32f2f', letterSpacing: 1 }}>Total<br />{invoice.grand_total}</div>
          </div>
          <div style={{ clear: 'both' }}></div>
        </div>
      </div>
      {/* Footer */}
      <div style={{ borderTop: '2.5px solid #ffd600', fontSize: 16, marginTop: 0, padding: '28px 40px 40px 40px', display: 'flex', background: '#fff', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, gap: 32 }}>
        <div style={{ flex: 2, paddingRight: 32 }}>
          <div style={{ fontWeight: 900, color: '#d32f2f', marginBottom: 8, fontFamily: 'Inter, Arial, sans-serif', fontSize: 17 }}>Amount Chargeable (in words)</div>
          <div style={{ fontWeight: 700, color: '#232323', marginBottom: 12 }}>{amountInWords}</div>
          <div style={{ color: '#232323', fontWeight: 600 }}>Company's PAN: <b>BYPPK6641B</b></div>
          <div style={{ color: '#232323', fontWeight: 600 }}>Payment Terms: <b>Immediate</b></div>
          <div style={{ color: '#232323', fontWeight: 600 }}>Note-Please make cheques in favor of <b>"SIGN COMPANY"</b></div>
        </div>
        <div style={{ flex: 2, borderLeft: '2.5px solid #ffd600', paddingLeft: 32, paddingRight: 32 }}>
          <div style={{ fontWeight: 900, color: '#d32f2f', marginBottom: 8, fontFamily: 'Inter, Arial, sans-serif', fontSize: 17 }}>BANK DETAILS</div>
          <div style={{ fontWeight: 700, color: '#232323', marginBottom: 4 }}>Sign Company</div>
          <div style={{ color: '#232323', fontWeight: 600 }}>A/C No: <b>59986534909</b></div>
          <div style={{ color: '#232323', fontWeight: 600 }}>IFSC: <b>IDFB0080184</b></div>
          <div style={{ color: '#232323', fontWeight: 600 }}>Bank name: <b>IDFC FIRST</b></div>
          <div style={{ color: '#232323', fontWeight: 600 }}>Branch: <b>JEEVAN BIMA NAGAR BRANCH</b></div>
          <div style={{ color: '#232323', fontWeight: 600 }}>UPI ID: <b>signcompany@idfcbank</b></div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', borderLeft: '2.5px solid #ffd600', paddingLeft: 32 }}>
          <div style={{ fontWeight: 900, color: '#d32f2f', marginBottom: 12, fontSize: 17, fontFamily: 'Inter, Arial, sans-serif' }}>SCAN & PAY</div>
          <img src="/qr.png" alt="UPI QR" style={{ height: 120, width: 120, objectFit: 'contain', border: '2.5px solid #ffd600', borderRadius: 14, background: '#fff', marginBottom: 12 }} />
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20, fontWeight: 600 }}>UPI ID: signcompany@idfcbank</div>
          <div style={{ fontWeight: 900, color: '#d32f2f', marginTop: 32, fontFamily: 'Inter, Arial, sans-serif', fontSize: 17 }}>For SIGN COMPANY</div>
          <div style={{ fontWeight: 700, marginTop: 32, color: '#232323', fontSize: 16 }}>Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}
