import React, { useEffect, useState } from "react";
import { fetchPayments, addPayment, updatePayment, deletePayment } from "../services/orderDetailsService";

export default function PaymentsTab({ orderId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to get today's date in yyyy-mm-dd format
  const getToday = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  // Helper to format a date string as yyyy-mm-dd
  const formatDateInput = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr;
  };

  // Add Payment button handler
  const handleAddBlankPayment = async () => {
    try {
      const added = await addPayment(orderId, {
        payment_date: getToday(),
        payment_due_date: null,
        amount: 0,
        payment_mode: "",
        reference: "",
        type: "",
        notes: "",
        paid: false
      });
      setPayments((prev) => [...prev, added]);
    } catch (err) {
      setError(err);
    }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    try {
      await deletePayment(id);
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetchPayments(orderId)
      .then((data) => {
        setPayments(data);
      })
      .catch(setError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [orderId]);

  // Handle input change for any payment row
  const handlePaymentChange = async (id, name, value) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [name]: value } : p))
    );
    // Save to DB immediately
    try {
      const updated = await updatePayment(id, { [name]: value });
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...updated } : p))
      );
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Payments</h2>
      <button
        className="mb-2 px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-500"
        onClick={handleAddBlankPayment}
        type="button"
      >
        + Add Payment
      </button>
      {loading && <div>Loading payments...</div>}
      {error && <div className="text-red-500">Error: {error.message}</div>}
      {!loading && !error && (
        <table className="min-w-full border text-xs">
          <thead>
            <tr>
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Due Date</th>
              <th className="border px-2 py-1">Amount</th>
              <th className="border px-2 py-1">Mode</th>
              <th className="border px-2 py-1">Reference</th>
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1">Notes</th>
              <th className="border px-2 py-1">Paid</th>
              <th className="border px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="border px-2 py-1">
                  <input type="date" name="payment_date" value={formatDateInput(p.payment_date)} onChange={e => handlePaymentChange(p.id, "payment_date", e.target.value)} className="w-full" />
                </td>
                <td className="border px-2 py-1">
                  <input type="date" name="payment_due_date" value={formatDateInput(p.payment_due_date)} onChange={e => handlePaymentChange(p.id, "payment_due_date", e.target.value)} className="w-full" />
                </td>
                <td className="border px-2 py-1">
                  <input type="number" name="amount" value={p.amount || ""} onChange={e => handlePaymentChange(p.id, "amount", e.target.value)} className="w-full" min="0" />
                </td>
                <td className="border px-2 py-1">
                  <select name="payment_mode" value={p.payment_mode || ""} onChange={e => handlePaymentChange(p.id, "payment_mode", e.target.value)} className="w-full">
                    <option value="">Select</option>
                    <option value="upi">UPI</option>
                    <option value="credit card">Credit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="dd">DD</option>
                    <option value="cash">Cash</option>
                  </select>
                </td>
                <td className="border px-2 py-1">
                  <input type="text" name="reference" value={p.reference || ""} onChange={e => handlePaymentChange(p.id, "reference", e.target.value)} className="w-full" placeholder="Reference" />
                </td>
                <td className="border px-2 py-1">
                  <select name="type" value={p.type || ""} onChange={e => handlePaymentChange(p.id, "type", e.target.value)} className="w-full">
                    <option value="">Select</option>
                    <option value="advance">Advance</option>
                    <option value="partial">Partial</option>
                    <option value="final">Final</option>
                  </select>
                </td>
                <td className="border px-2 py-1">
                  <input type="text" name="notes" value={p.notes || ""} onChange={e => handlePaymentChange(p.id, "notes", e.target.value)} className="w-full" placeholder="Notes" />
                </td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={!!p.paid}
                    onChange={e => handlePaymentChange(p.id, "paid", e.target.checked)}
                  />
                </td>
                <td className="border px-2 py-1">
                  <button
                    title="Delete"
                    className="text-red-500 hover:text-red-700 text-base"
                    onClick={() => handleDeletePayment(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={9} className="text-center py-2">No payments found.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
