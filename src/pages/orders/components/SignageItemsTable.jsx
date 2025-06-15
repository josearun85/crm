import React, { useEffect, useState } from "react";
import {

  deleteSignageItem,
  updateSignageItem,
} from "../services/orderDetailsService";
import SignageBoqItemsTable from "./SignageBoqItemsTable";

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

  return (
    <div>
      <table className="min-w-full border text-xs bg-white">
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Description</th><th>HSN Code</th><th>Qty</th><th>Rate</th>
            <th>Amount</th><th>GST%</th><th>GST Amount</th><th>Cost After Tax</th>
            <th>Actions</th><th>BOQ</th><th>Move</th>
          </tr>
        </thead>
        <tbody>
          {orderData.signageItems.map((item, idx) => (
            // console.log("Rendering item:", item),
            <React.Fragment key={item.id}>
              <tr>
                <td>{idx + 1}</td>
                <td>
                  <input
                    className="w-full border px-1 py-0.5 text-xs"
                    defaultValue={item.name}
                    onBlur={e => handleFieldBlur(item.id, "name", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="w-full border px-1 py-0.5 text-xs"
                    defaultValue={item.description}
                    onBlur={e => handleFieldBlur(item.id, "description", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="w-full border px-1 py-0.5 text-xs"
                    defaultValue={item.hsn_code || ""}
                    onBlur={e => handleFieldBlur(item.id, "hsn_code", e.target.value)}
                  />
                </td>
                <td className="text-center">
                  <input
                    className="w-full border px-1 py-0.5 text-xs text-center"
                    defaultValue={item.quantity}
                    onBlur={e => handleFieldBlur(item.id, "quantity", e.target.value)}
                  />
                </td>
                <td>{item.rate?.toFixed(2)}</td>
                <td>{item.amount?.toFixed(2)}</td>
                <td className="text-center">
                  <input
                    className="w-full border px-1 py-0.5 text-xs text-center"
                    defaultValue={item.gst_percent || ""}
                    onBlur={e => handleFieldBlur(item.id, "gst_percent", e.target.value)}
                  />
                </td>
                <td>{item.gstAmount?.toFixed(2)}</td>
                <td>{item.costAfterTax?.toFixed(2)}</td>
                <td>
                  <button onClick={() => onDeleteSignageItem(item.id)}>🗑️</button>
                </td>
                <td>
                  <a
                    href="#"
                    onClick={e => {
                      e.preventDefault();
                      onBoqClick(item.id);
                    }}
                  >
                    {(item.boqs || []).length}-
                  </a>
                </td>
                <td>
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
                  <td colSpan={13}>
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
    </div>
  );
}