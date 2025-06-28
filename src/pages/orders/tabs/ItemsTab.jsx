import React, { useState } from "react";
import SignageItemsTable from "../components/SignageItemsTable";
import OrderCostingSummary from "../components/OrderCostingSummary";
import {
  addSignageItem,
  fetchSignageItems,
  addBoqItem,
  fetchBoqItems,
} from "../services/orderDetailsService";

export default function ItemsTab({
  orderId,
  orderData,
  setOrderData,
  customerGstin,
  gstBillablePercent,
  onLocalBoqChange,
  onSaveBoq,
  discount,
  onDiscountChange,
  setCustomerGstin,
  customerPan,
  setCustomerPan,
  setGstBillablePercent,
  onDeleteSignageItem,
  onMoveSignageItem
}) {
  // Add blank signage item
  const handleAddItem = async () => {
    if (!orderId) return;
    await addSignageItem(orderId, {
      name: "",
      description: "",
      hsn_code: "",
      quantity: 1,
    });
    const updatedItems = await fetchSignageItems(orderId);
    setOrderData((prev) => ({ ...prev, signageItems: updatedItems }));
  };

  // Insert right after handleAddItem
const handleAddBoqRow = async (signageItemId) => {
  if (!orderId || !signageItemId) return;

  // 1️⃣  persist an empty BOQ row
  const blank = await addBoqItem(signageItemId, {
    signage_item_id: signageItemId,
    item: "",
    material: "",
    unit: "",
    quantity: 1,
    cost_per_unit: 0,
  });

  // 2️⃣  inject it into React state so the table updates immediately
  setOrderData((prev) => ({
    ...prev,
    signageItems: prev.signageItems.map((si) =>
      si.id === signageItemId
        ? { ...si, boqs: [...(si.boqs ?? []), blank] }
        : si
    ),
    signageBoqItems: [...prev.signageBoqItems, blank],
  }));
};
  

  const [openBoqItemId, setOpenBoqItemId] = useState(null);
  const handleBoqClick = (itemId) =>
    setOpenBoqItemId(openBoqItemId === itemId ? null : itemId);

  return (
    <div style={{ padding: 15 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700 }}>
        Signage Items
      </h2>

      {/* + Add Item button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <button
          onClick={handleAddItem}
          style={{
            backgroundColor: "#facc15",
            color: "#000",
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
          }}
        >
          + Add Item
        </button>
      </div>

      {/* BOQ Table */}
      <SignageItemsTable
        orderId={orderId}
        orderData={orderData}
        setOrderData={setOrderData}
        customerGstin={customerGstin}
        gstBillablePercent={gstBillablePercent}
        setCustomerGstin={setCustomerGstin}
        customerPan={customerPan}
        setCustomerPan={setCustomerPan}
        setGstBillablePercent={setGstBillablePercent}

        /* BOQ‐toggle props */
        openBoqItemId={openBoqItemId}
        onBoqClick={handleBoqClick}

        /* your existing handlers */
        onLocalChange={onLocalBoqChange}
        onSaveBoq={onSaveBoq}

        /* add‐row now maps to onAddBoqRow */
        // onAddBoqRow={handleAddItem}
        onAddBoqRow={handleAddBoqRow}
        onDeleteSignageItem={onDeleteSignageItem}
        onMoveSignageItem={onMoveSignageItem}
      />

      {/* Order Summary – right aligned */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 24,
        }}
      >
        <OrderCostingSummary
          orderData={orderData}
          onDiscountChange={onDiscountChange}
        />
      </div>
    </div>
  );
}