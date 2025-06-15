import React, { useState } from "react";
import SignageItemsTable from "../components/SignageItemsTable";
import OrderCostingSummary from "../components/OrderCostingSummary";
import {
  addSignageItem,
  fetchSignageItems,
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

  const [openBoqItemId, setOpenBoqItemId] = useState(null);
  const handleBoqClick = (itemId) =>
    setOpenBoqItemId(openBoqItemId === itemId ? null : itemId);

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700 }}>
        Signage Items (Refactored)
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
        onAddBoqRow={handleAddItem}

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