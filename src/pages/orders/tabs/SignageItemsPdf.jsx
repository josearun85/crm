import React from "react";

export default function SignageItemsPdf({ items, allBoqs, discount, gstPercent, orderId, totalCost, netTotal, gst, grandTotal, customer = {}, jobName = "", po_number, po_date, version }) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto', color: '#222' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <img src="/logo.png" alt="Sign Company Logo" style={{ height: 60, marginBottom: 8 }} />
          <div style={{ fontWeight: 'bold', fontSize: 22 }}>Sign Company</div>
          <div style={{ fontSize: 14 }}>Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bangalore - 560 075</div>
          <div style={{ fontSize: 14 }}>M +91 8431505007</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 'bold' }}>
          Estimate No: {orderId}.{version || 1}.{new Date(po_date || Date.now()).getFullYear()}
        </div>
      </div>
      {/* Customer Info Section */}
      <div style={{ marginBottom: 16, fontSize: 15 }}>
        <div><b>CLIENT:</b> {customer.name || '-'}</div>
        {customer.gstin && <div><b>GSTIN:</b> {(customer.gstin || '').toUpperCase()}</div>}
        {customer.pan && <div><b>PAN:</b> {(customer.pan || '').toUpperCase()}</div>}
        <div><b>JOB NAME:</b> {jobName || '-'}</div>
      </div>
      {/* Show PO Number and PO Date if available */}
      {orderId && (po_number || po_date) && (
        <div style={{ marginBottom: 8, fontSize: 15 }}>
          {po_number && <span><b>PO Number:</b> {po_number}</span>}
          {po_date && <span style={{ marginLeft: 12 }}><b>PO Date:</b> {new Date(po_date).toLocaleDateString('en-GB')}</span>}
        </div>
      )}
      <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Signage Items</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 24 }}>
        <thead style={{ background: '#f3f3f3' }}>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>S. No.</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Description</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Quantity</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Cost</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>HSN Code</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.name}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.description}</td>
              <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'right' }}>
                {allBoqs.filter(b => b.signage_item_id === item.id).reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0).toFixed(2)}
              </td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.hsn_code || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
        <table style={{ fontSize: 15, fontWeight: 600 }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'right', padding: '4px 16px' }}>TOTAL</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>₹ {totalCost.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', padding: '4px 16px' }}>DISCOUNT</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>₹ {discount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', padding: '4px 16px' }}>NET TOTAL</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>₹ {netTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', padding: '4px 16px' }}>GST @{gstPercent}%</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>₹ {gst.toFixed(2)}</td>
            </tr>
            <tr style={{ fontWeight: 'bold', fontSize: 17 }}>
              <td style={{ textAlign: 'right', padding: '4px 16px' }}>GRAND TOTAL</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>₹ {grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 15, marginTop: 32, marginBottom: 16 }}>
        <span style={{ fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline' }}>Terms & Conditions</span>
        <ul style={{ color: 'red', marginTop: 8, marginBottom: 16, paddingLeft: 24 }}>
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div>Company name: Sign Company</div>
            <div>Account number: 59986534909</div>
            <div>IFSC: IDFB0080184</div>
            <div>SWIFT code: IDFBINBBMUM</div>
            <div>Bank name: IDFC FIRST</div>
            <div>Branch: JEEVAN BIMA NAGAR BRANCH</div>
            <div>UPI ID: signcompany@idfcbank</div>
          </div>
          <img src="/qr.png" alt="UPI QR" style={{ height: 80, width: 80, objectFit: 'contain', border: '1px solid #ccc', borderRadius: 8, background: '#fff' }} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div>GSTN: {("29BPYPK6641B2Z6").toUpperCase()}</div>
        <div>PAN: {("BPYPK6641B").toUpperCase()}</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div>Looking forward to a positive response from your side at the earliest.<br/>Thanking You,</div>
        <div style={{ fontWeight: 'bold', fontStyle: 'italic', marginTop: 8 }}>For Sign Company</div>
        <div style={{ fontWeight: 'bold', marginTop: 16 }}>Authorized Signatory</div>
      </div>
    </div>
  );
}
