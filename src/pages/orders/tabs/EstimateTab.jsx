// src/pages/orders/tabs/EstimateTab.jsx
import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
// import jsPDF from "jspdf";
import supabase from "../../../supabaseClient";
import { updateOrderOverview } from "../services/orderDetailsService";
import "./EstimateTab.css";
import html2pdf from "html2pdf.js";


export default function EstimateTab({ orderId, orderData, overview, fetchAndRecalc }) {
  // ─── Unpack orderData ────────────────────────────────────────────────
  const {
    signageItems = [],
    discount     = 0,
    total        = 0,
    netTotal     = 0,
    gstSummary   = {},
    cgstSummary  = {},
    sgstSummary  = {},
    grandTotal   = 0,
    costToCompany= 0,
    margin       = 0,
  } = orderData;

  // ─── Unpack overview ───────────────────────────────────────────────────
  const { customer_name = "—", jobName = "—" } = overview;

  // ─── Terms & Conditions ──────────────────────────────────────────────
  const defaultTerms = `
* If any unforeseen requirements come up, costs might change.
* Scaffolding / Crane to be provided by client, else charged extra if required.
* 80% Advance (Grand Total) to confirm the order and balance before dispatch.
* Formal P.O. to be given at the time of confirming the order.
* Power supply up to signage site to be provided by client.
* 15 working days from receipt of advance and P.O., subject to favourable weather.
* 1 year warranty only for material defects.
* Working Hours 9.30 AM–7.30 PM (after hours +10%).
* All permissions obtained by client. We’re not responsible for theft/damage onsite.
* Prices subject to change without notice; please reconfirm.
* 300W dimmer control unit extra ₹1,750 each if required.
  `.trim();
  // 🚩 Pull the saved terms straight from overview
  const storedTerms = overview.terms ?? "";
 useEffect(() => {
   // whenever the saved terms from overview change, reset local `terms`
   setTerms(overview.terms || defaultTerms);
 }, [overview.terms]);
  // Local state for editing
  const [terms, setTerms]       = useState(storedTerms || defaultTerms);
  const [editing, setEditing] = useState(false);

  // useEffect(() => {
  //   setTerms(storedTerms || defaultTerms);
  // }, [storedTerms]);

  const saveTerms = async () => {
    await updateOrderOverview(orderId, { terms });
    setEditing(false);
    // if (fetchAndRecalc) await fetchAndRecalc();
  };

  // ─── Date & PDF setup ─────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
  const printRef = useRef();
  const headerRef = useRef();       // wrap your <header> in this 
  const footerRef = useRef();       // wrap your <footer> in this

function downloadPDF() {
  const element = printRef.current;
  const elemWidth = element.scrollWidth; 

  element.classList.add("downloading");
  html2pdf()
    .set({
      margin:      [20, 20, 20, 20], // top/right/bottom/left in pt
      filename:    `Estimate_${orderId}.pdf`,
      image:       { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale:       2,
        useCORS:     true,
        windowWidth: elemWidth-20,      // capture the true width
      },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] }
    })
    .from(element)
    .save()
    .finally(() => element.classList.remove("downloading"));
}

  // ─── Thumbnails ───────────────────────────────────────────────────────
  const [thumbUrls, setThumbUrls] = useState({});
  useEffect(() => {
    (async () => {
      const map = {};
      await Promise.all(
        signageItems.map(async it => {
          if (it.image_path) {
            const { data } = await supabase
              .storage
              .from("crm")
              .createSignedUrl(it.image_path, 3600);
            map[it.id] = data.signedUrl;
          }
        })
      );
      setThumbUrls(map);
    })();
  }, [signageItems]);

  return (
    <div className="estimate-container">
      <button className="download-btn" onClick={downloadPDF}>
        ⬇️ Download Estimate
      </button>

      <div className="estimate-sheet" ref={printRef}>
        {/* HEADER */}
        <header className="est-header" ref={headerRef} >
          <div className="row1">
            <div className="title">ESTIMATE</div>
            <img src="/logo.jpeg" alt="Logo" className="logo" />
          </div>
          <div className="row2">
            <div className="left">
              <div className="field-row">
                <span>CLIENT:</span>
                <span className="value">{customer_name}</span>
              </div>
              <div className="field-row">
                <span>JOB NAME:</span>
                <span className="value">{jobName}</span>
              </div>
            </div>
            <div className="right">
              <div className="field-row">
                <span>DATE:</span>
                <span className="value">{today}</span>
              </div>
              <div className="field-row">
                <span>EST NO:</span>
                <span className="value">
                  {orderId}.1.{new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ITEMS TABLE */}
        <table className="est-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>S No</th>
              <th>Particulars</th>
              <th>Rate/Unit</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {signageItems.map((it, i) => (
              <tr key={it.id}>
                <td className="image-cell">
                  {thumbUrls[it.id] ? (
                    <img src={thumbUrls[it.id]} alt="" className="thumbnail" />
                  ) : (
                    <div className="placeholder">Paste Image</div>
                  )}
                </td>
                <td className="center">{i + 1}</td>
                <td className="particulars">
                  {it.name && <div className="name">{it.name}</div>}
                  {it.description && (
                    <div className="desc">{it.description}</div>
                  )}
                </td>
                <td className="right">₹ {(it.rate || 0).toFixed(2)}</td>
                <td className="center">{it.quantity}</td>
                <td className="right">₹ {(it.amount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY BOX */}
        <aside className="summary-block">
          <div className="line">
            <span>TOTAL</span>
            <span>₹ {total.toFixed(2)}</span>
          </div>

          {discount > 0 && (
            <>
              <div className="line">
                <span>DISCOUNT</span>
                <span>₹ {discount.toFixed(2)}</span>
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
              {Object.keys(gstSummary).map(rate => (
                <tr key={rate}>
                  <td>{rate}%</td>
                  <td className="right">
                    ₹ {cgstSummary[rate]?.toFixed(2)} ({(rate / 2).toFixed(0)}%)
                  </td>
                  <td className="right">
                    ₹ {sgstSummary[rate]?.toFixed(2)} ({(rate / 2).toFixed(0)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="line big">
            <span>GRAND TOTAL</span>
            <span>₹ {grandTotal.toFixed(2)}</span>
          </div>
          
        </aside>

        {/* TERMS & CONDITIONS */}
        <section className="terms">
      <h2>Terms &amp; Conditions</h2>
      {editing ? (
        <>
          <textarea
            className="terms-edit"
            value={terms}                     // bound to local state
            onChange={e => setTerms(e.target.value)}
          />
          <div className="terms-actions">
            <button onClick={saveTerms}>Save</button>
            <button
              onClick={() => {
                setEditing(false);
                // reset back to whatever overview.terms holds
                setTerms(storedTerms || defaultTerms);
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <pre className="terms-view">{terms}</pre>
          <button
            className="edit-terms-btn"
            onClick={() => setEditing(true)}
          >
            Edit Terms
          </button>
        </>
      )}
    </section>
         {/* ─── BANK & SCAN-AND-PAY BLOCK ─────────────────────────────────────── */}
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

        {/* ─── CLOSING LINES ─────────────────────────────────────────────────── */}
        <div className="closing-lines">
          <p>
            Looking forward to a positive response from your side at the earliest.
            <br/>
            Thanking You,
          </p>
          <p><em>For Sign Company</em></p>
          <p><strong>Authorized Signatory</strong></p>
        </div>

        {/* FOOTER */}
        <footer  ref={footerRef}  className="est-footer">
          <div>Sign Company • www.signcompany.com • +91 8431505007</div>
          <div>Generated on {today}</div>
        </footer>
      </div>
    </div>
  );
}