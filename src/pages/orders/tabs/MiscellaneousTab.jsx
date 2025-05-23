import React, { useEffect, useState } from "react";
import { fetchSignageItems, fetchBoqItems } from "../services/orderDetailsService";

export default function MiscellaneousTab({ orderId, gstBillablePercent, setGstBillablePercent }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalSignageValue, setTotalSignageValue] = useState(0);
  const [localPercent, setLocalPercent] = useState(gstBillablePercent || "");
  const [saving, setSaving] = useState(false);
  const [lastEdited, setLastEdited] = useState(null); // 'amount' or 'percent'

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    // Fetch total signage value
    async function fetchTotal() {
      const items = await fetchSignageItems(orderId);
      const allBoqs = await fetchBoqItems(orderId);
      const total = items.reduce((sum, item) => {
        const itemCost = allBoqs.filter(b => b.signage_item_id === item.id).reduce((boqSum, b) => boqSum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
        return sum + itemCost;
      }, 0);
      setTotalSignageValue(total);
    }
    fetchTotal().finally(() => setLoading(false));
  }, [orderId]);

  // Only update local state from props if orderId changes
  useEffect(() => {
    setLocalPercent(gstBillablePercent || "");
  }, [orderId, gstBillablePercent]);

  // Track if user is actively editing the amount field
  const [editingAmount, setEditingAmount] = useState(false);

  // Calculate amount on the fly from percent and signage value
  const calculatedAmount = localPercent && !isNaN(localPercent) && totalSignageValue
    ? ((parseFloat(localPercent) / 100) * totalSignageValue).toFixed(2)
    : "";

  // Track local amount for editing
  const [localAmount, setLocalAmount] = useState(calculatedAmount);

  // Keep localAmount in sync with percent edits, unless user is editing amount
  useEffect(() => {
    if (!editingAmount && lastEdited !== 'amount') {
      setLocalAmount(calculatedAmount);
    }
    // eslint-disable-next-line
  }, [localPercent, totalSignageValue, calculatedAmount]);

  // When switching order or percent from parent, reset localAmount
  useEffect(() => {
    setLocalAmount(calculatedAmount);
    setEditingAmount(false);
    // eslint-disable-next-line
  }, [orderId, gstBillablePercent]);

  const handlePercentChange = (val) => {
    setLastEdited('percent');
    setLocalPercent(val);
    setEditingAmount(false);
    // Update amount field immediately
    if (val === '' || isNaN(val)) {
      setLocalAmount('');
    } else {
      setLocalAmount(((parseFloat(val) / 100) * totalSignageValue).toFixed(2));
    }
  };
  const handleAmountChange = (val) => {
    setLastEdited('amount');
    setEditingAmount(true);
    setLocalAmount(val);
    // Convert amount to percent and update localPercent
    if (val === '' || isNaN(val)) {
      setLocalPercent('');
      return;
    }
    const pct = totalSignageValue === 0 ? 0 : ((parseFloat(val) / totalSignageValue) * 100).toFixed(2);
    setLocalPercent(pct);
  };
  const handleAmountBlur = () => {
    setEditingAmount(false);
    setLocalAmount(calculatedAmount); // Snap to calculated value after editing
  };

  const handleSave = async () => {
    setSaving(true);
    let percentToSave = localPercent;
    if (percentToSave === "" || isNaN(percentToSave)) {
      setSaving(false);
      return;
    }
    await setGstBillablePercent(percentToSave);
    try {
      // Wait a moment to ensure percent is saved before fetching
      await new Promise(res => setTimeout(res, 300));
      const { fetchSignageItems, fetchBoqItems, fetchPayments, addPayment, updatePayment, deletePayment } = await import("../services/orderDetailsService");
      // Recalculate signage value to match what PaymentsTab uses
      const items = await fetchSignageItems(orderId);
      const allBoqs = await fetchBoqItems(orderId);
      const signageValue = items.reduce((sum, item) => {
        const itemCost = allBoqs.filter(b => b.signage_item_id === item.id).reduce((boqSum, b) => boqSum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
        return sum + itemCost;
      }, 0);
      const payments = await fetchPayments(orderId);
      const autoCash = payments.find(p => p.notes === "auto-cash-non-gst" && p.payment_mode === "cash");
      const gstPortion = (Number(percentToSave) / 100) * signageValue;
      const nonGstAmount = signageValue - gstPortion;
      if (Number(percentToSave) === 100) {
        if (autoCash) await deletePayment(autoCash.id);
      } else if (Number(percentToSave) < 100 && nonGstAmount > 0) {
        if (autoCash) {
          await updatePayment(autoCash.id, { amount: nonGstAmount });
        } else {
          await addPayment(orderId, {
            payment_date: new Date().toISOString().slice(0, 10),
            amount: nonGstAmount,
            payment_mode: "cash",
            reference: "",
            type: "",
            notes: "auto-cash-non-gst",
            paid: false
          });
        }
      }
    } catch (err) {
      console.error("Auto payment logic failed", err);
    }
    setSaving(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Miscellaneous</h2>
      <p className="mb-2 text-sm text-gray-700">Specify what part of the total order value you want covered under GST bills. You can enter either a percentage or a fixed amount. This will be used for invoice/estimate purposes.</p>
      <div className="mb-2 text-sm text-gray-700">Total Signage Items Value: <span className="font-semibold">₹ {totalSignageValue.toLocaleString()}</span></div>
      {error && <div className="text-red-500 mb-2">{error.message}</div>}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">GST Billable Amount (₹)</label>
        <input
          type="number"
          className="border px-2 py-1 rounded w-full"
          value={editingAmount ? localAmount : calculatedAmount}
          onChange={e => handleAmountChange(e.target.value)}
          onBlur={handleAmountBlur}
          placeholder="e.g. 20000"
          min="0"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">GST Billable Percent (%)</label>
        <input
          type="number"
          className="border px-2 py-1 rounded w-full"
          value={localPercent === null || localPercent === undefined ? "" : localPercent}
          onChange={e => handlePercentChange(e.target.value)}
          placeholder="e.g. 50"
          min="0"
          max="100"
        />
      </div>
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
