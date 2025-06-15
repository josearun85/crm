import React, { useEffect, useState } from "react";
import {

  deleteSignageItem,
  updateSignageItem,
} from "../services/orderDetailsService";
import SignageBoqItemsTable from "./SignageBoqItemsTable";
import { uploadFile } from "../../../services/orderService";
import supabase from '../../../supabaseClient';

export default function SignageItemsTable({
  orderId,
  orderData,
  customerGstin,
  openBoqItemId,
  onBoqClick,
  onSaveBoq,
  onLocalChange,
  onAddBoqRow,
  onDeleteSignageItem,
  onMoveSignageItem
}) {
  


  const handleFieldBlur = async (itemId, field, value) => {
    await updateSignageItem(itemId, { [field]: value });
    // Optionally: trigger recalculation here if needed
    // (No need to call setOrderData or recalc on every keystroke)
  };

  // Helper to get a signed URL for an image (private bucket safe)
  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    async function fetchUrls() {
      const urls = {};
      await Promise.all(orderData.signageItems.map(async (item) => {
        if (item.image_path) {
          const { data, error } = await supabase.storage.from('crm').createSignedUrl(item.image_path, 3600);
          urls[item.id] = !error && data?.signedUrl ? data.signedUrl : null;
        }
      }));
      setImageUrls(urls);
    }
    fetchUrls();
  }, [orderData.signageItems.map(i => i.image_path).join(',')]);

  return (
    <div>
      <table className="min-w-full border text-xs bg-white signage-items-table">
        <thead>
          <tr>
            <th style={{ width: 32, textAlign: 'center' }}>#</th>
            <th style={{ minWidth: 120 }}>Name</th>
            <th style={{ minWidth: 200, width: 400 }}>Description</th>
            <th style={{ width: 70, textAlign: 'center' }}>HSN Code</th>
            <th style={{ width: 70, textAlign: 'center' }}>Qty</th>
            <th style={{ width: 80, textAlign: 'right' }}>Rate</th>
            <th style={{ width: 80, textAlign: 'right' }}>Amount</th>
            <th style={{ width: 70, textAlign: 'center' }}>GST%</th>
            <th style={{ width: 80, textAlign: 'right' }}>GST Amount</th>
            <th style={{ width: 100, textAlign: 'right' }}>Cost After Tax</th>
            <th style={{ width: 60, textAlign: 'center' }}>Actions</th>
            <th style={{ width: 40, textAlign: 'center' }}>BOQ</th>
            <th style={{ width: 60, textAlign: 'center' }}>Move</th>
          </tr>
        </thead>
        <tbody>
          {orderData.signageItems.map((item, idx) => (
            // console.log("Rendering item:", item),
            <React.Fragment key={item.id}>
              <tr className="align-top">
                <td style={{ border: '1px solid #ececec' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #ececec' }}>
                  <input
                    className="w-full border px-2 py-1 text-sm"
                    defaultValue={item.name}
                    onBlur={e => handleFieldBlur(item.id, "name", e.target.value)}
                  />
                </td>
                <td style={{ border: '1px solid #ececec', position: 'relative' }}>
                  <textarea
                    ref={el => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      }
                    }}
                    className="w-full border px-2 py-1 text-sm resize-none"
                    style={{ minHeight: 36, lineHeight: '1.5', overflow: 'hidden' }}
                    defaultValue={item.description}
                    onBlur={e => handleFieldBlur(item.id, "description", e.target.value)}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    rows={1}
                  />
                  <div
                    style={{
                      width: 300,
                      marginTop: 8,
                      position: 'relative',
                    }}
                    onPaste={async e => {
                      const items = e.clipboardData.items;
                      for (let i = 0; i < items.length; i++) {
                        const itemData = items[i];
                        if (itemData.kind === 'file' && itemData.type.startsWith('image/')) {
                          const file = itemData.getAsFile();
                          if (file) {
                            try {
                              // Use a more organized path
                              const filePath = await uploadFile(file, `signage_items/${item.id}`);
                              await handleFieldBlur(item.id, 'image_path', filePath);
                            } catch (err) {
                              alert('Image upload failed: ' + err.message);
                            }
                          }
                        }
                      }
                    }}
                  >
                    {item.image_path && imageUrls[item.id] ? (
                      <img
                        src={imageUrls[item.id]}
                        alt="Screenshot"
                        style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid #ececec', objectFit: 'contain', background: '#fafbfc' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: 50, borderRadius: 8, border: '1px dashed #ececec', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 14 }}>
                        Paste image here
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ border: '1px solid #ececec' }}>
                  <input
                    className="w-full border px-2 py-1 text-sm"
                    defaultValue={item.hsn_code || ""}
                    onBlur={e => handleFieldBlur(item.id, "hsn_code", e.target.value)}
                  />
                </td>
                <td className="text-center" style={{ border: '1px solid #ececec' }}>
                  <input
                    className="w-full border px-2 py-1 text-sm text-center"
                    defaultValue={item.quantity}
                    onBlur={e => handleFieldBlur(item.id, "quantity", e.target.value)}
                  />
                </td>
                <td style={{ border: '1px solid #ececec' }}>{item.rate?.toFixed(2)}</td>
                <td style={{ border: '1px solid #ececec' }}>{item.amount?.toFixed(2)}</td>
                <td className="text-center" style={{ border: '1px solid #ececec' }}>
                  <input
                    className="w-full border px-2 py-1 text-sm text-center"
                    defaultValue={item.gst_percent || ""}
                    onBlur={e => handleFieldBlur(item.id, "gst_percent", e.target.value)}
                  />
                </td>
                <td style={{ border: '1px solid #ececec' }}>{item.gstAmount?.toFixed(2)}</td>
                <td style={{ border: '1px solid #ececec' }}>{item.costAfterTax?.toFixed(2)}</td>
                <td style={{ border: '1px solid #ececec' }}>
                  <button onClick={() => onDeleteSignageItem(item.id)}>🗑️</button>
                </td>
                <td style={{ border: '1px solid #ececec' }}>
                  <a
                    href="#"
                    onClick={e => {
                      e.preventDefault();
                      onBoqClick(item.id);
                    }}
                  >
                    {(item.boqs || []).length}
                  </a>
                </td>
                <td style={{ border: '1px solid #ececec' }}>
                  <button
                       disabled={idx === 0}
                       onClick={() => onMoveSignageItem(item.id, "up")}
                       aria-label="Move up"
                     >
                       ↑
                     </button>
                     <button
                       disabled={idx === orderData.signageItems.length - 1}
                       onClick={() => onMoveSignageItem(item.id, "down")}
                       aria-label="Move down"
                     >
                       ↓
                     </button>
                </td>
              </tr>
              {openBoqItemId === item.id && (
                <tr>
                  <td colSpan={13} style={{ border: '1px solid #ececec' }}>
                    <SignageBoqItemsTable
                      signageItemId={item.id}
                      boqItems={item.boqs}
                      marginPercent={item.margin_percent}
                      onSaveBoq={onSaveBoq}
                      onLocalBoqChange={onLocalChange}
                      ensureBoqForSignageItem={onAddBoqRow}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <style>{`
        .signage-items-table {
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid #ececec;
        }
        .signage-items-table th, .signage-items-table td {
          border: 1px solid #ececec;
          background: #fff;
        }
        .signage-items-table th {
          background: #fafbfc;
        }
      `}</style>
    </div>
  );
}