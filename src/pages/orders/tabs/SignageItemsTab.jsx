import { useEffect, useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import SignageItemsPdf from "./SignageItemsPdf";
import { fetchSignageItems, fetchBoqItems, addBoqItem, deleteBoqItem, updateBoqItem, addSignageItem, updateSignageItem, deleteSignageItem, fetchProcurementTasks, ensureFabricationStepsForSignageItems, fetchInventory, addFeedNote, fetchOrderOverview, updateOrderDetails } from "../services/orderDetailsService";

export default function SignageItemsTab({ orderId }) {
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [boqs, setBoqs] = useState([]);
  const [allBoqs, setAllBoqs] = useState([]);
  const [showBoqForItemId, setShowBoqForItemId] = useState(null);
  const [procuredBoqIds, setProcuredBoqIds] = useState(new Set());
  const [procurementTasksByBoqId, setProcurementTasksByBoqId] = useState({});
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [newBoq, setNewBoq] = useState({ material: "", quantity: 1, unit: "", cost_per_unit: "" });
  const [blankBoqRow, setBlankBoqRow] = useState({ material: '', quantity: 1, unit: '', cost_per_unit: '' });
  const [discount, setDiscount] = useState(0);
  const [gstPercent, setGstPercent] = useState(18);
  const [showPdf, setShowPdf] = useState(false);
  const pdfRef = useRef();
  const pdfDivRef = useRef();

  const handleDownloadPdf = () => {
    const pdfData = {
      items: items.filter(i => i.name || i.description),
      allBoqs,
      discount,
      gstPercent,
      orderId,
      totalCost,
      netTotal,
      gst,
      grandTotal
    };
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }
    pdfWindow.document.write(`
      <html>
        <head>
          <title>Invoice PDF</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <div id="pdf-root">${renderPdfHtml(pdfData)}</div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <script>
            function exportPDF() {
              var root = document.getElementById('pdf-root');
              if (window.html2pdf) {
                html2pdf().set({
                  margin: 0.2,
                  filename: 'Signage_Invoice_${orderId}.pdf',
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                }).from(root).save();
              } else {
                setTimeout(exportPDF, 200);
              }
            }
            exportPDF();
          <\/script>
        </body>
      </html>
    `);
    pdfWindow.document.close();
  };

  // Helper to render the PDF HTML as a string
  function renderPdfHtml({ items, allBoqs, discount, gstPercent, orderId, totalCost, netTotal, gst, grandTotal }) {
    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
      <div style='font-family: "Segoe UI", Arial, sans-serif; max-width: 730px; margin: 0 auto; color: #222; font-size: 13px; padding: 0 18px; box-sizing: border-box;'>
        <div style='display: flex; align-items: center; border-bottom: 2px solid #0a3d62; padding-bottom: 12px; margin-bottom: 18px;'>
          <img src='/logo.png' alt='Sign Company Logo' style='height: 55px; margin-right: 18px;' />
          <div>
            <div style='font-size: 22px; font-weight: bold; color: #0a3d62;'>Sign Company</div>
            <div style='font-size: 12px; color: #555;'>Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bangalore - 560 075</div>
            <div style='font-size: 12px; color: #555;'>M: +91 9986534902 | GSTN: 29BPYPK6641B2Z6 | PAN: BPYPK6641B</div>
          </div>
        </div>
        <div style='display: flex; justify-content: space-between; margin-bottom: 10px;'>
          <div>
            <div style='font-size: 15px; font-weight: bold; color: #0a3d62;'>TAX INVOICE</div>
            <div style='font-size: 12px;'>Invoice #: <b>${orderId}</b></div>
            <div style='font-size: 12px;'>Date: <b>${today}</b></div>
          </div>
          <div style='text-align: right; font-size: 12px;'>
            <div style='font-weight: bold;'>Bill To:</div>
            <div>__________________________</div>
            <div>__________________________</div>
            <div>__________________________</div>
          </div>
        </div>
        <table style='width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; box-sizing: border-box;'>
          <thead>
            <tr style='background: #f3f6fa;'>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>S. No.</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Name</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Description</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Quantity</th>
              <th style='border: 1px solid #d1d8e0; padding: 8px;'>Cost (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr>
                <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: center;'>${idx + 1}</td>
                <td style='border: 1px solid #d1d8e0; padding: 8px;'>${item.name || ''}</td>
                <td style='border: 1px solid #d1d8e0; padding: 8px;'>${item.description || ''}</td>
                <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: center;'>${item.quantity || ''}</td>
                <td style='border: 1px solid #d1d8e0; padding: 8px; text-align: right;'>${(allBoqs.filter(b => b.signage_item_id === item.id).reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style='display: flex; justify-content: flex-end; margin-bottom: 22px;'>
          <table style='font-size: 13px; font-weight: 600; width: 270px; border-collapse: collapse; box-sizing: border-box;'>
            <tbody>
              <tr><td style='padding: 6px 12px; border: none; text-align: right;'>Total</td><td style='padding: 6px 0; text-align: right; border: none;'>₹ ${totalCost.toFixed(2)}</td></tr>
              <tr><td style='padding: 6px 12px; border: none; text-align: right;'>Discount</td><td style='padding: 6px 0; text-align: right; border: none;'>₹ ${discount.toFixed(2)}</td></tr>
              <tr><td style='padding: 6px 12px; border: none; text-align: right;'>Net Total</td><td style='padding: 6px 0; text-align: right; border: none;'>₹ ${netTotal.toFixed(2)}</td></tr>
              <tr><td style='padding: 6px 12px; border: none; text-align: right;'>GST @${gstPercent}%</td><td style='padding: 6px 0; text-align: right; border: none;'>₹ ${gst.toFixed(2)}</td></tr>
              <tr style='font-weight: bold; font-size: 15px; background: #f3f6fa;'><td style='padding: 8px 12px; text-align: right;'>Grand Total</td><td style='padding: 8px 0; text-align: right;'>₹ ${grandTotal.toFixed(2)}</td></tr>
            </tbody>
          </table>
        </div>
        <div style='margin-bottom: 16px; font-size: 12px;'>
          <div style='font-weight: bold; text-decoration: underline; color: #0a3d62; margin-bottom: 4px;'>Payment Details</div>
          <div>Account Name: <b>Sign Company</b></div>
          <div>Account Number: <b>59986534909</b></div>
          <div>IFSC: <b>IDFB0080184</b></div>
          <div>Bank: <b>IDFC FIRST, JEEVAN BIMA NAGAR BRANCH</b></div>
          <div>UPI ID: <b>signcompany@idfcbank</b></div>
        </div>
        <div style='margin-bottom: 16px; font-size: 12px;'>
          <div style='font-weight: bold; text-decoration: underline; color: #0a3d62; margin-bottom: 4px;'>Terms & Conditions</div>
          <ul style='margin: 0 0 0 18px; color: #b71c1c;'>
            <li>If any unforeseen requirements come up, costs might change.</li>
            <li>Scaffolding / Crane to be provided by client, else it will be charged extra if required.</li>
            <li>80% Advance (Grand Total) to confirm the order and balance before dispatch of material from our factory.</li>
            <li>Formal P.O. to be given at the time of confirming the order.</li>
            <li>Power supply up to signage site has to be provided by the client.</li>
            <li>15 working days required to complete the job from receipt of advance and P.O. subject to favourable weather conditions.</li>
            <li>1 year warranty only for material defects, physical damage & incoming electrical problems will not be covered.</li>
            <li>Working Hours: 9.30 AM-7.30 PM. Any Installation before or after working hours will be charged at 10% extra.</li>
            <li>All permissions to be obtained by client from authorities / land owners.</li>
            <li>We are not responsible for any theft/damage to material at the site.</li>
            <li>All prices are subject to change without notice. Please reconfirm at the time of order.</li>
            <li>300w Dimmer control unit will be charged extra at Rs.1750/- per piece if required for any signage.</li>
          </ul>
        </div>
        <div style='margin-bottom: 22px; font-size: 12px;'>
          <div>Looking forward to a positive response from your side at the earliest.<br/>Thanking You,</div>
          <div style='font-weight: bold; font-style: italic; margin-top: 8px;'>For Sign Company</div>
          <div style='font-weight: bold; margin-top: 16px; height: 30px;'>Authorized Signatory</div>
        </div>
        <div style='font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px;'>
          This is a computer-generated invoice. No signature required.<br/>
          Generated on ${today}
        </div>
      </div>
    `;
  }

  // Calculate totals
  const totalCost = items.reduce((sum, item) => {
    const itemCost = allBoqs
      .filter(b => b.signage_item_id === item.id)
      .reduce((boqSum, b) => boqSum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
    return sum + itemCost;
  }, 0);
  const netTotal = totalCost - discount;
  const gst = netTotal * (gstPercent / 100);
  const grandTotal = netTotal + gst;

  useEffect(() => {
    ensureFabricationStepsForSignageItems(orderId).catch(console.error);
  }, [orderId]);

  // On mount, ensure there is always a single empty signage_item in the DB for this order
  useEffect(() => {
    if (!orderId) return;
    fetchSignageItems(orderId).then(async items => {
      let emptyItem = items.find(i => !i.name && !i.description && (!i.quantity || i.quantity === 1) && (!i.cost || i.cost === 0));
      if (!emptyItem) {
        emptyItem = await addSignageItem(orderId, { name: '', description: '', quantity: 1, cost: 0 });
        items = [...items, emptyItem];
      }
      setItems(items);
    }).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    fetchBoqItems(orderId).then(setAllBoqs).catch(console.error);
    // Fetch procurement tasks and build a set of procured BOQ ids
    fetchProcurementTasks(orderId).then(tasks => {
      setProcuredBoqIds(new Set(tasks.map(t => t.boq_item_id)));
    }).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (selectedItemId) {
      fetchBoqItems(orderId).then(all => {
        const filtered = all.filter(b => b.signage_item_id === selectedItemId);
        if (filtered.length === 0) {
          // If no BOQ items, create one with empty values for this signage item
          addBoqItem(selectedItemId, { material: '', quantity: 1, unit: '', cost_per_unit: 0 }).then(newBoq => {
            setBoqs([newBoq]);
          });
        } else {
          setBoqs(filtered);
        }
      });
    } else {
      setBoqs([]);
    }
  }, [selectedItemId, orderId]);

  useEffect(() => {
    if (!selectedItemId) return;
    fetchProcurementTasks(orderId).then(tasks => {
      const map = {};
      for (const t of tasks) {
        if (!map[t.boq_item_id]) map[t.boq_item_id] = [];
        map[t.boq_item_id].push(t);
      }
      setProcurementTasksByBoqId(map);
    });
  }, [orderId, selectedItemId]);

  useEffect(() => {
    fetchInventory().then(setInventory).catch(console.error);
  }, [orderId]);

  // Fetch discount and gst from backend on mount
  useEffect(() => {
    if (!orderId) return;
    fetchOrderOverview(orderId).then(order => {
      setDiscount(Number(order.discount) || 0);
      setGstPercent(Number(order.gst_percent) || 18);
    });
  }, [orderId]);

  // Handler to update discount in backend
  const handleDiscountBlur = async (e) => {
    const value = Number(e.target.value) || 0;
    setDiscount(value);
    try {
      await updateOrderDetails(orderId, { discount: value });
    } catch (err) {
      // Optionally show error
      console.error("Failed to update discount", err);
    }
  };

  // Handler to update GST in backend
  const handleGstBlur = async (e) => {
    const value = Number(e.target.value) || 0;
    setGstPercent(value);
    try {
      await updateOrderDetails(orderId, { gst_percent: value });
    } catch (err) {
      console.error("Failed to update GST", err);
    }
  };

  // Always show the empty signage_item from DB as the last row
  const sortedItems = [
    ...items.filter(i => i.name || i.description || Number(i.quantity) > 1 || Number(i.cost) > 0),
    ...items.filter(i => !i.name && !i.description && (!i.quantity || i.quantity === 1) && (!i.cost || i.cost === 0)),
  ];
  const itemsWithBlank = sortedItems;

  // Helper to update signage item (including the empty placeholder)
  const updateItemField = (idx, field, value) => {
    setItems(items => items.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  // Helper to handle blur for signage item fields
  const handleItemBlur = async (idx, field, value) => {
    const item = items[idx];
    if (!item) return;
    const isEmpty = !item.name && !item.description && (!item.quantity || item.quantity === 1) && (!item.cost || item.cost === 0);
    if (item.id) {
      // If this is the empty placeholder and user entered a value, create a new empty signage_item for next time
      await updateSignageItem(item.id, { ...item, [field]: value });
      const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
      await addFeedNote({
        type: 'feed',
        content: `Signage item updated by ${user?.data?.user?.email || 'Unknown'}`,
        signage_item_id: item.id,
        orderId,
        created_by: user?.data?.user?.id,
        created_by_name: user?.data?.user?.user_metadata?.full_name || '',
        created_by_email: user?.data?.user?.email || ''
      });
      if (isEmpty && value) {
        // User filled the placeholder, create a new one
        const newEmpty = await addSignageItem(orderId, { name: '', description: '', quantity: 1, cost: 0 });
        setItems(items => [...items, newEmpty]);
      }
    }
  };

  return (
    <div className="space-y-4 flex justify-center">
      <div className="w-full max-w-[900px]">
        {/* Hidden PDF render target */}
        {showPdf && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', zIndex: -1, opacity: 0, pointerEvents: 'none' }} ref={pdfDivRef}>
            <SignageItemsPdf
              items={items.filter(i => i.name || i.description)}
              allBoqs={allBoqs}
              discount={discount}
              gstPercent={gstPercent}
              orderId={orderId}
              totalCost={totalCost}
              netTotal={netTotal}
              gst={gst}
              grandTotal={grandTotal}
            />
          </div>
        )}
        {/* PDF Export Content Start */}
        <div ref={pdfRef}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Signage Items</h2>
          </div>
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">S. No.</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border w-[340px]">Description</th>
                <th className="p-2 border w-20">Quantity</th>
                <th className="p-2 border w-24">Cost</th>
                <th className="p-2 border no-print">Actions</th>
                <th className="p-2 border no-print">BOQ</th>
              </tr>
            </thead>
            <tbody>
              {itemsWithBlank.map((item, idx) => [
                <tr
                  key={item.id || 'new'}
                  className={`cursor-pointer ${showBoqForItemId === item.id ? "bg-yellow-50" : ""}`}
                >
                  <td className="p-2 border">{idx + 1}</td>
                  {/* Name */}
                  <td className="p-2 border">
                    <input
                      className="w-full border px-1 py-0.5 text-sm"
                      type="text"
                      value={item.name}
                      onChange={e => updateItemField(idx, 'name', e.target.value)}
                      onBlur={e => handleItemBlur(idx, 'name', e.target.value.trim())}
                    />
                  </td>
                  {/* Description */}
                  <td className="p-2 border w-[340px]">
                    <textarea
                      className="w-full border px-1 py-0.5 text-sm resize-none overflow-hidden"
                      style={{ minHeight: 32, height: 'auto' }}
                      value={item.description}
                      onChange={e => updateItemField(idx, 'description', e.target.value)}
                      onBlur={e => handleItemBlur(idx, 'description', e.target.value)}
                    />
                  </td>
                  {/* Quantity */}
                  <td className="p-2 border w-20">
                    <input
                      className="w-full border px-1 py-0.5 text-sm text-right"
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItemField(idx, 'quantity', e.target.value)}
                      onBlur={e => handleItemBlur(idx, 'quantity', e.target.value)}
                    />
                  </td>
                  {/* Cost */}
                  <td className="p-2 border w-24 text-right">
                    {item.id
                      ? allBoqs.filter(b => b.signage_item_id === item.id).reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0).toFixed(2)
                      : ''}
                  </td>
                  <td className="p-2 border w-12 text-center align-middle no-print">
                    {item.id && (
                      <span
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = confirm("Are you sure you want to delete this item?");
                          if (confirmed) {
                            await deleteSignageItem(item.id);
                            setItems(items.filter(it => it.id !== item.id));
                            const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                            await addFeedNote({
                              type: 'feed',
                              content: `Signage item deleted by ${user?.data?.user?.email || 'Unknown'}`,
                              signage_item_id: item.id,
                              orderId,
                              created_by: user?.data?.user?.id,
                              created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                              created_by_email: user?.data?.user?.email || ''
                            });
                          }
                        }}
                        className="text-red-500 cursor-pointer"
                      >
                        🗑
                      </span>
                    )}
                  </td>
                  <td className="p-2 border w-10 text-center align-middle no-print">
                    {item.id && (
                      <span
                        className="text-blue-600 underline cursor-pointer"
                        onClick={e => {
                          e.stopPropagation();
                          setShowBoqForItemId(showBoqForItemId === item.id ? null : item.id);
                          setSelectedItemId(showBoqForItemId === item.id ? null : item.id);
                        }}
                      >
                        {allBoqs.filter(b => b.signage_item_id === item.id).length}
                      </span>
                    )}
                  </td>
                </tr>,
                showBoqForItemId === item.id && item.id ? (
                  <tr key={item.id + '-boq-details'}>
                    <td colSpan={7} className="bg-yellow-100 p-4 border-t-2 border-yellow-300">
                      <h3 className="font-medium mb-2">BOQ for selected item</h3>
                      {(() => {
                        const boqsWithBlank = [...boqs];
                        return (
                          <table className="min-w-full text-sm border mb-2">
                            <thead className="bg-gray-100 text-left">
                              <tr>
                                <th className="p-2 border w-8 text-center">S. No.</th>
                                <th className="p-2 border">Material</th>
                                <th className="p-2 border w-16 text-center">Unit</th>
                                <th className="p-2 border w-16 text-center">Quantity</th>
                                <th className="p-2 border w-20 text-center">Cost/Unit</th>
                                <th className="p-2 border w-20 text-center">Total</th>
                                <th className="p-2 border"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {boqsWithBlank.map((boq, bidx) => (
                                <tr key={boq.id}>
                                  <td className="p-2 border w-8 text-center">{bidx + 1}</td>
                                  <td className="p-2 border">
                                    <input
                                      className="w-full border px-1 py-0.5 text-sm"
                                      value={boq.material}
                                      onChange={e => {
                                        const value = e.target.value;
                                        if (boq.id) {
                                          setBoqs(boqs.map(b => b.id === boq.id ? { ...b, material: value } : b));
                                        }
                                      }}
                                      onBlur={async (e) => {
                                        const value = e.target.value.trim();
                                        if (boq.id) {
                                          await updateBoqItem(boq.id, boq);
                                          const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                          await addFeedNote({
                                            type: 'feed',
                                            content: `BOQ item updated by ${user?.data?.user?.email || 'Unknown'}`,
                                            boq_item_id: boq.id,
                                            signage_item_id: boq.signage_item_id,
                                            orderId,
                                            created_by: user?.data?.user?.id,
                                            created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                            created_by_email: user?.data?.user?.email || ''
                                          });
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-2 border w-16 text-center">
                                    <input
                                      className="w-full border px-1 py-0.5 text-sm text-center"
                                      value={boq.unit}
                                      onChange={e => {
                                        const value = e.target.value;
                                        if (boq.id) {
                                          setBoqs(boqs.map(b => b.id === boq.id ? { ...b, unit: value } : b));
                                        }
                                      }}
                                      onBlur={async () => {
                                        if (boq.id) {
                                          await updateBoqItem(boq.id, boq);
                                          const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                          await addFeedNote({
                                            type: 'feed',
                                            content: `BOQ item updated by ${user?.data?.user?.email || 'Unknown'}`,
                                            boq_item_id: boq.id,
                                            signage_item_id: boq.signage_item_id,
                                            orderId,
                                            created_by: user?.data?.user?.id,
                                            created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                            created_by_email: user?.data?.user?.email || ''
                                          });
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-2 border w-16 text-center">
                                    <input
                                      className="w-full border px-1 py-0.5 text-sm text-right"
                                      type="number"
                                      value={boq.quantity}
                                      onChange={e => {
                                        const value = e.target.value;
                                        if (boq.id) {
                                          setBoqs(boqs.map(b => b.id === boq.id ? { ...b, quantity: value } : b));
                                        }
                                      }}
                                      onBlur={async () => {
                                        if (boq.id) {
                                          await updateBoqItem(boq.id, boq);
                                          const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                          await addFeedNote({
                                            type: 'feed',
                                            content: `BOQ item updated by ${user?.data?.user?.email || 'Unknown'}`,
                                            boq_item_id: boq.id,
                                            signage_item_id: boq.signage_item_id,
                                            orderId,
                                            created_by: user?.data?.user?.id,
                                            created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                            created_by_email: user?.data?.user?.email || ''
                                          });
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-2 border w-16 text-center">
                                    <input
                                      className="w-full border px-1 py-0.5 text-sm text-right"
                                      type="number"
                                      value={boq.quantity}
                                      onChange={e => {
                                        const value = e.target.value;
                                        if (boq.id) {
                                          setBoqs(boqs.map(b => b.id === boq.id ? { ...b, quantity: value } : b));
                                        }
                                      }}
                                      onBlur={async () => {
                                        if (boq.id) {
                                          await updateBoqItem(boq.id, boq);
                                          const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                          await addFeedNote({
                                            type: 'feed',
                                            content: `BOQ item updated by ${user?.data?.user?.email || 'Unknown'}`,
                                            boq_item_id: boq.id,
                                            signage_item_id: boq.signage_item_id,
                                            orderId,
                                            created_by: user?.data?.user?.id,
                                            created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                            created_by_email: user?.data?.user?.email || ''
                                          });
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-2 border w-20 text-center">
                                    <input
                                      className="w-full border px-1 py-0.5 text-sm text-right"
                                      type="number"
                                      value={boq.cost_per_unit}
                                      onChange={e => {
                                        const value = e.target.value;
                                        if (boq.id) {
                                          setBoqs(boqs.map(b => b.id === boq.id ? { ...b, cost_per_unit: value } : b));
                                        }
                                      }}
                                      onBlur={async () => {
                                        if (boq.id) {
                                          await updateBoqItem(boq.id, boq);
                                          const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                          await addFeedNote({
                                            type: 'feed',
                                            content: `BOQ item updated by ${user?.data?.user?.email || 'Unknown'}`,
                                            boq_item_id: boq.id,
                                            signage_item_id: boq.signage_item_id,
                                            orderId,
                                            created_by: user?.data?.user?.id,
                                            created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                            created_by_email: user?.data?.user?.email || ''
                                          });
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-2 border w-20 text-right">{(boq.quantity * boq.cost_per_unit).toFixed(2)}</td>
                                  <td className="p-2 border text-right">
                                    {boq.id && (
                                      <span
                                        onClick={async () => {
                                          const confirmed = confirm("Delete this BOQ entry?");
                                          if (confirmed) {
                                            await deleteBoqItem(boq.id);
                                            setBoqs(boqs.filter(b => b.id !== boq.id));
                                            const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                            await addFeedNote({
                                              type: 'feed',
                                              content: `BOQ item deleted by ${user?.data?.user?.email || 'Unknown'}`,
                                              boq_item_id: boq.id,
                                              signage_item_id: boq.signage_item_id,
                                              orderId,
                                              created_by: user?.data?.user?.id,
                                              created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                              created_by_email: user?.data?.user?.email || ''
                                            });
                                          }
                                        }}
                                        className="ml-2 text-red-500 cursor-pointer"
                                      >
                                        🗑
                                      </span>
                                    )}
                                    {boq.id && procurementTasksByBoqId[boq.id]?.length > 0 && (
                                      <span
                                        title={
                                          procurementTasksByBoqId[boq.id][0].status === 'received'
                                            ? 'Procurement received, material available'
                                            : 'Procurement created'
                                        }
                                        style={{ cursor: 'pointer', marginLeft: 8 }}
                                        onClick={() => setSelectedProcurement(procurementTasksByBoqId[boq.id][0])}
                                      >
                                        {procurementTasksByBoqId[boq.id][0].status === 'received' ? '✅' : '🛒'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-yellow-50">
                                <td className="p-2 border w-8 text-center">{boqsWithBlank.length + 1}</td>
                                <td className="p-2 border">
                                  <input
                                    className="w-full border px-1 py-0.5 text-sm"
                                    value={blankBoqRow.material}
                                    onChange={e => setBlankBoqRow({ ...blankBoqRow, material: e.target.value })}
                                    onBlur={async (e) => {
                                      const value = e.target.value.trim();
                                      if (value) {
                                        const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                                        const created = await addBoqItem(selectedItemId, {
                                          material: value,
                                          quantity: Number(blankBoqRow.quantity) || 1,
                                          unit: blankBoqRow.unit,
                                          cost_per_unit: Number(blankBoqRow.cost_per_unit) || 0,
                                        });
                                        await addFeedNote({
                                          type: 'feed',
                                          content: `BOQ item added by ${user?.data?.user?.email || 'Unknown'}`,
                                          boq_item_id: created.id,
                                          signage_item_id: selectedItemId,
                                          orderId,
                                          created_by: user?.data?.user?.id,
                                          created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                          created_by_email: user?.data?.user?.email || ''
                                        });
                                        // Refresh boqs and reset blank row
                                        fetchBoqItems(orderId).then(all => setBoqs(all.filter(b => b.signage_item_id === selectedItemId)));
                                        setBlankBoqRow({ material: '', quantity: 1, unit: '', cost_per_unit: '' });
                                      }
                                    }}
                                  />
                                </td>
                                <td className="p-2 border w-16 text-center">
                                  <input
                                    className="w-full border px-1 py-0.5 text-sm text-center"
                                    value={blankBoqRow.unit}
                                    onChange={e => setBlankBoqRow({ ...blankBoqRow, unit: e.target.value })}
                                  />
                                </td>
                                <td className="p-2 border w-16 text-center">
                                  <input
                                    className="w-full border px-1 py-0.5 text-sm text-right"
                                    type="number"
                                    value={blankBoqRow.quantity}
                                    onChange={e => setBlankBoqRow({ ...blankBoqRow, quantity: e.target.value })}
                                  />
                                </td>
                                <td className="p-2 border w-20 text-center">
                                  <input
                                    className="w-full border px-1 py-0.5 text-sm text-right"
                                    type="number"
                                    value={blankBoqRow.cost_per_unit}
                                    onChange={e => setBlankBoqRow({ ...blankBoqRow, cost_per_unit: e.target.value })}
                                  />
                                </td>
                                <td className="p-2 border w-20 text-right"></td>
                                <td className="p-2 border text-right"></td>
                              </tr>
                            </tbody>
                            <tfoot className="bg-gray-100 font-semibold">
                              <tr>
                                <td className="p-2 border text-right" colSpan={5}>Total Cost</td>
                                <td className="p-2 border">{boqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0)}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        );
                      })()}
                    </td>
                  </tr>
                ) : null
              ])}
            </tbody>
          </table>
          <div className="mt-8 border-t pt-4">
            <div className="flex justify-end">
              <table className="text-sm font-semibold">
                <tbody>
                  <tr>
                    <td className="text-right pr-8 align-middle">TOTAL</td>
                    <td className="text-right">&#8377; {totalCost.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="text-right pr-8 align-middle">DISCOUNT</td>
                    <td className="text-right">
                      <input
                        type="number"
                        className="border px-1 py-0.5 text-right w-20"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        onBlur={handleDiscountBlur}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="text-right pr-8 align-middle">NET TOTAL</td>
                    <td className="text-right">&#8377; {netTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="text-right pr-8 align-middle">GST @ 
                      <input
                        type="number"
                        className="border px-1 py-0.5 text-right w-12 inline-block mx-1"
                        value={gstPercent}
                        onChange={e => setGstPercent(Number(e.target.value) || 0)}
                        onBlur={handleGstBlur}
                        min={0}
                        max={100}
                      />
                      %
                    </td>
                    <td className="text-right">&#8377; {gst.toFixed(2)}</td>
                  </tr>
                  <tr className="text-lg font-bold">
                    <td className="text-right pr-8 align-middle">GRAND TOTAL</td>
                    <td className="text-right">&#8377; {grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* PDF Export Content End */}
        {/* Terms & Conditions and Bank Details for PDF */}
        <div className="mt-8" style={{ fontSize: 14, maxWidth: 800 }}>
          <div style={{ marginBottom: 16 }}>
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
            <div>Company name: Sign Company</div>
            <div>Account number: 59986534909</div>
            <div>IFSC: IDFB0080184</div>
            <div>SWIFT code: IDFBINBBMUM</div>
            <div>Bank name: IDFC FIRST</div>
            <div>Branch: JEEVAN BIMA NAGAR BRANCH</div>
            <div>UPI ID: signcompany@idfcbank</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div>GSTN: 29BPYPK6641B2Z6</div>
            <div>PAN: BPYPK6641B</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div>Looking forward to a positive response from your side at the earliest.<br/>Thanking You,</div>
            <div style={{ fontWeight: 'bold', fontStyle: 'italic', marginTop: 8 }}>For Sign Company</div>
            <div style={{ fontWeight: 'bold', marginTop: 16 }}>Authorized Signatory</div>
          </div>
          <div style={{ fontSize: 13, marginTop: 24 }}>
            Shed #7, No.120, Malleshpalya Main Road, New Thippasandra Post, Bangalore - 560 075  M +91 9986534902
          </div>
        </div>
        <div className="flex justify-start mt-4">
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-blue-700 text-white rounded shadow hover:bg-blue-800 text-sm"
          >
            ⬇️ Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}