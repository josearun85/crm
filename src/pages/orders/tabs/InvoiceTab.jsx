// src/pages/orders/tabs/InvoiceTab.jsx
import React from "react";
import "./InvoiceTab.css";

export default function InvoiceTab({ overview = {}, invoiceData ={},orderData = {} }) {
  // 1) Top‐level columns from your "invoices" table:
  console.log("Rendering InvoiceTab with overview:", overview, "invoiceData:", invoiceData, "orderData:", orderData);
  let invNo = invoiceData.invoice_number || "—";
  if (invoiceData.status === "Draft") {
    invNo = "Draft";
  }
  const invDate      = invoiceData.invoice_date      || "";
  const placeOfSupply= invoiceData.place_of_supply   || "Bangalore";
  const poNumber     = overview.po_number         || "—";
  const poDate       = overview.po_date           || "—";
  const customerGSTIN= overview.customer_gstin    || "—";

  // 2) The JSONB payload you stored in invoice_json
  const amountWords  = orderData.amountInWords               || "";
  const bankDetails  = orderData.bankDetails                 || {};

  // 3) From overview (your orders.customer_name and jobName)
  const clientName   = overview.customer_name || "—";
  const jobName      = overview.jobName      || "—";

  return (
    <div className="invoice-container">
      {/* HEADER */}
      <div className="invoice-header">
        <div className="header-left">
          <img src="/logo.jpeg" alt="" className="invoice-logo" />
          <div className="company-name">SIGN COMPANY</div>
          <div className="company-line">
            Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bangalore – 560 075
          </div>
          <div className="company-line">PHONE: 8431505007</div>
          <div className="company-line">GSTIN: 29BPYPPK6641B2Z6</div>
        </div>
        <div className="header-right">
          <div><span className="label">INVOICE No:</span>    <span className="value">{invNo}</span></div>
          <div><span className="label">Date:</span>          <span className="value">{invDate}</span></div>
          <div><span className="label">Place of Supply:</span><span className="value">{placeOfSupply}</span></div>
          <div><span className="label">Job:</span>           <span className="value">{jobName}</span></div>
          <div><span className="label">PO Number:</span>     <span className="value">{poNumber}</span></div>
          <div><span className="label">PO Date:</span>       <span className="value">{poDate}</span></div>
          <div><span className="label">Client:</span>        <span className="value">{clientName}</span></div>
          <div><span className="label">GSTIN:</span>         <span className="value">{customerGSTIN}</span></div>
        </div>
      </div>

      {/* TITLE */}
      <h2 className="tax-invoice-title">TAX INVOICE</h2>

      {/* ITEMS TABLE */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>S. No.</th>
            <th>Name & Description</th>
            <th>HSN Code</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
            <th>GST</th>
            <th>Cost After Tax</th>
          </tr>
        </thead>
        <tbody>
          {orderData.signageItems.map((it, i) => (
            <tr key={i}>
              <td className="center">{i+1}</td>
              <td>
                <div className="item-name">{it.name}</div>
                <div className="item-desc">{it.description}</div>
              </td>
              <td className="center">{it.hsnCode}</td>
              <td className="center">{it.quantity}</td>
              <td className="right">₹ {it.rate.toFixed(2)}</td>
              <td className="right">₹ {it.amount}</td>
              <td className="right">₹ {it.gstAmount} ({it.gstPercent}%)</td>
              <td className="right">₹ {it.costAfterTax}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SUMMARY */}
      <aside className="summary-block">
          <div className="line">
            <span>TOTAL</span>
            <span>₹ {orderData.total.toFixed(2)}</span>
          </div>

          {orderData.discount > 0 && (
            <>
              <div className="line">
                <span>DISCOUNT</span>
                <span>₹ {orderData.discount.toFixed(2)}</span>
              </div>
              <div className="line">
                <span>NET TOTAL</span>
                <span>₹ {netTotal.toFixed(2)}</span>
              </div>
            </>
          )}

          <table className="gst-table">
            <thead>
              <tr>
                <th>GST Rate</th>
                <th>CGST</th>
                <th>SGST</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(orderData.gstSummary).map(rate => (
                <tr key={rate}>
                  <td>{rate}%</td>
                  <td className="right">
                    ₹ {orderData.cgstSummary[rate]?.toFixed(2)} ({(rate / 2).toFixed(0)}%)
                  </td>
                  <td className="right">
                    ₹ {orderData.sgstSummary[rate]?.toFixed(2)} ({(rate / 2).toFixed(0)}%)
                  </td>
                  <td className="right">
                    ₹ {orderData.igstSummary[rate]?.toFixed(2)} ({(rate / 2).toFixed(0)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="line big">
            <span>GRAND TOTAL</span>
            <span>₹ {orderData.grandTotal.toFixed(2)}</span>
          </div>
         
        </aside>

      {/* AMOUNT IN WORDS */}
      <div className="amount-words">
        <strong>Amount Chargeable (in words)</strong><br/>
        {orderData.amountWords}
      </div>

    

      {/* BANK & SCAN-AND-PAY */}
      <div className="bank-qr-section">
          <div className="bank-details">
            <div className="section-title">Bank &amp; Payment Details</div>
            <div>Company name: Sign Company</div>
            <div>Account number: 59986534909</div>
            <div>IFSC: IDFB0080184</div>
            <div>SWIFT code: IDFBINBBMUM</div>
            <div>Bank name: IDFC FIRST</div>
            <div>Branch: JEEVAN BIMA NAGAR BRANCH</div>
          </div>

          <div className="scan-pay">
            {/* <div className="section-title">Scan &amp; Pay</div> */}
            <img
              src="/qr.png"
              alt="UPI QR code"
              className="qr-image"
              style={{ width: "150px", height: "150px" }}
            />
            {/* <div className="upi-id">UPI ID: signcompany@idfcbank</div> */}
          </div>
        </div>
    </div>
  );
}