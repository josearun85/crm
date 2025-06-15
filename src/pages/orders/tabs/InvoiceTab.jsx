// src/pages/orders/tabs/InvoiceTab.jsx
import "./InvoiceTab.css";
import React, { useState, useEffect } from "react";
import html2pdf from "html2pdf.js";
import { updateInvoiceStatus } from "../services/orderDetailsService"; 

export default function InvoiceTab({ overview = {}, invoiceData ={},orderData = {} }) {

  // const [draftMode, setDraftMode] = useState(
  //   invoiceData.status === "Draft"
  // );
  const draftMode = invoiceData.status === "Draft";
  const [saving, setSaving] = useState(false);

  // 1️⃣ Download handler
  function downloadInvoice() {
    const element = document.getElementById("invoice-sheet");
    if (!element) {
      console.error("No #invoice-sheet container found");
      return;
    }
    html2pdf()
      .set({
        margin:      [20,20,20,20],
        filename:    `Invoice_${invoiceData.invoice_number || "DRAFT"}.pdf`,
        image:       { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF:       { unit: "pt", format: "a4", orientation: "portrait" },
        pagebreak:   { mode: ["css","legacy"] }
      })
      .from(element)
      .save();
  }

  // 2️⃣ Finalize (turn off draft)
  async function toggleDraft() {
    // if (!draftMode) {
    //   // never finalize twice
    //   return;
    // }
    setSaving(true);
  const { data, error } = await updateInvoiceStatus(invoiceData.id, {
  status: "Confirmed"
});
    if (!error && data?.invoice_number) {
      invoiceData.invoice_number = data.invoice_number;
      invoiceData.status = "Confirmed";
      setDraftMode(false);
    } else {
      console.error("Failed to finalize invoice", error);
    }
    setSaving(false);
  }
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
// Converts integer part of a number into English words
/** Breaks 1–99 into words */
function twoDigitWords(n) {
  const a = [
    "Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
    "Seventeen","Eighteen","Nineteen"
  ];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (n < 20) return a[n];
  const tens = Math.floor(n/10);
  const rem  = n % 10;
  return b[tens] + (rem ? " " + a[rem] : "");
}

/** Breaks 1–999 into words */
function threeDigitWords(n) {
  if (n < 100) return twoDigitWords(n);
  const hundreds = Math.floor(n/100);
  const rem      = n % 100;
  return (
    twoDigitWords(hundreds) + " Hundred" +
    (rem ? " and " + twoDigitWords(rem) : "")
  );
}

/**
 * Converts 0…1,00,00,000 into words using Indian units:
 * 1 Crore = 1,00,00,000
 * 1 Lakh  =    1,00,000
 * 1 Thousand =     1,000
 */
function numberToWordsIndian(n) {
  if (n === 0) return "Zero";
  const parts = [];
  const units = [
    { value: 10000000, name: "Crore" },
    { value:   100000, name: "Lakh" },
    { value:     1000, name: "Thousand" },
    { value:      100, name: "Hundred" }
  ];
  for (const { value, name } of units) {
    if (n >= value) {
      const count = Math.floor(n / value);
      parts.push( threeDigitWords(count) + " " + name );
      n %= value;
    }
  }
  if (n > 0) {
    parts.push( n < 100 ? twoDigitWords(n) : threeDigitWords(n) );
  }
  return parts.join(" ");
}

// ─── Usage inside your React component ─────────────────────────────────

const total = orderData.grandTotal || 0;

// Split into rupees and paise
const rupees = Math.floor(total);
const paise  = Math.round((total - rupees) * 100);

let amountInWords = "Rupees "+numberToWordsIndian(rupees);
if (paise > 0) {
  amountInWords += " and " + numberToWordsIndian(paise) + " Paise";
}
amountInWords += " Only";
const isIntraState = customerGSTIN?.startsWith("29");

  return (
    <div className="invoice-container">
       {/* ─── NEW CONTROL BAR ─────────────────────────────────────────── */}
      <div className="invoice-controls" style={{ marginBottom: 16, textAlign: "right" }}>
        <button 
          onClick={downloadInvoice} 
          className="download-btn"
          style={{ marginRight: 12 }}
        >
          ⬇️ Download Invoice
        </button>

        <button 
          onClick={toggleDraft} 
          disabled={!draftMode || saving}
          className="draft-toggle-btn"
          style={{
            padding: "6px 12px",
            background: draftMode ? "#c00" : "#666",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: draftMode ? "pointer" : "default"
          }}
        >
          Draft Mode: {draftMode ? "ON" : "OFF"}
        </button>
      </div>

      <div id="invoice-sheet" className="invoice-sheet">
      {/* HEADER */}


<div className="invoice-header">
<>
  {/* ── COMPANY BLOCK ─────────────────────── */}
<div className=" company-block">
    <div className="head-left-align">
      <div className="logo-grid">
          <div><img src="/logo.jpeg" alt="Sign Company" className="invoice-logo"/></div>
          <div>
            <div className="company-name">SIGN COMPANY</div>
            <div className="company-line">
              Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bangalore – 560 075
            </div>
            <div className="company-line">PHONE: 8431505007</div>
            <div className="company-line">GSTIN: 29BPYPPK6641B2Z6</div>
          </div>
      </div>
      
      
    </div>
  </div>

  {/* ── INVOICE DETAILS STRIP ─────────────── */}
  <div className=" details-strip">
    <div className="">
      <div className="field-row">
        <span className="label">INVOICE No:</span>
        <span className="value">{invNo}</span>
      </div>
      <div className="field-row">
        <span className="label">Date:</span>
        <span className="value">{invDate}</span>
      </div>
      <div className="field-row">
        <span className="label">Client:</span>
        <span className="value">{clientName}</span>
      </div>
       <div className="field-row">
        <span className="label">Address:</span>
        <span className="value">{overview.customer?.address ?? "—"}</span>
      </div>
      <div className="field-row">
        <span className="label">GSTIN:</span>
        <span className="value">{customerGSTIN}</span>
      </div>

      <div className="field-row">
        <span className="label">Place of Supply:</span>
        <span className="value">{placeOfSupply}</span>
      </div>
      <div className="field-row">
        <span className="label">Job:</span>
        <span className="value">{jobName} (#{overview.id})</span>
      </div>
      <div className="field-row">
        <span className="label">PO Number:</span>
        <span className="value">{poNumber} ({poDate})</span>
      </div>

      
      
     
    </div>
  </div>
</>
</div>

      {/* TITLE */}
      <h2 className="tax-invoice-title">TAX INVOICE</h2>

      {/* ITEMS TABLE */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>S. No.</th>
            <th style={{width:"250px"}}>Name & Description</th>
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
                <span>₹ {orderData.netTotal.toFixed(2)}</span>
              </div>
            </>
          )}

          <table className="gst-table">
            <thead>
              <tr>
                <th>GST Rate</th>
                 {isIntraState ? (
                  <>
                    <th>CGST</th>
                    <th>SGST</th>
                  </>
                ) : (
                  <th>IGST</th>
                )}
              </tr>
            </thead>
            <tbody>
              {Object.keys(orderData.gstSummary).map(rate => (
                <tr key={rate}>
                  <td>{rate}%</td>
                  {isIntraState ? (
                  <>
                    <td className="right">
                    ₹ {orderData.cgstSummary[rate]?.toFixed(2)} ({(rate / 2).toFixed(0)}%)
                  </td>
                  <td className="right">
                    ₹ {orderData.sgstSummary[rate]?.toFixed(2)} ({(rate / 2).toFixed(0)}%)
                  </td>
                  </>
                ) : (
                  <td className="right">
                    ₹ {orderData.igstSummary[rate]?.toFixed(2)} ({(rate)}%)
                  </td>
                )}
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
        {amountInWords}
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
    </div>
  );
}