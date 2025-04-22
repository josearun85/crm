import { useEffect, useState } from "react";
import { fetchOrderOverview, updateOrderDetails } from "../services/orderDetailsService";

export default function OverviewTab({ orderId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId || isNaN(Number(orderId))) return;
    fetchOrderOverview(Number(orderId))
      .then(setOrder)
      .catch((err) =>
        setError(err && err.message ? err.message : "Failed to load order overview")
      );
  }, [orderId]);

  const handleChange = (field, value) => {
    const updated = { ...order, [field]: value };
    setOrder(updated);
    updateOrderDetails(orderId, { [field]: value })
      .then(() => console.log(`${field} updated`))
      .catch((err) => console.error("Update failed", err));
  };

  const statusColor = {
    pending: "text-yellow-600",
    approved: "text-green-600",
    rejected: "text-red-600",
  };

  if (!orderId) return null;

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">Order Overview</h2>
      {error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : order ? (
        <table className="text-sm border w-full">
          <tbody>
            <tr>
              <td className="p-2 border font-medium">Order ID</td>
              <td className="p-2 border">{orderId}</td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Name</td>
              <td className="p-2 border">
                <input
                  className="w-full border rounded p-1"
                  value={order.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Status</td>
              <td className="p-2 border">
                <select
                  className={`w-full p-1 rounded border ${statusColor[order.status] || ""}`}
                  value={order.status || "pending"}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Due Date</td>
              <td className="p-2 border">
                <input
                  type="date"
                  className="w-full border rounded p-1"
                  value={order.due_date?.split("T")[0] || ""}
                  onChange={(e) => handleChange("due_date", e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Fab Type</td>
              <td className="p-2 border">
                <input
                  className="w-full border rounded p-1"
                  value={order.fab_type || ""}
                  onChange={(e) => handleChange("fab_type", e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Cost Estimate</td>
              <td className="p-2 border">
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded p-1"
                  value={order.cost_estimate || ""}
                  onChange={(e) => handleChange("cost_estimate", parseFloat(e.target.value))}
                />
              </td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Description</td>
              <td className="p-2 border">
                <textarea
                  className="w-full border rounded p-1"
                  value={order.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-600">Loading...</p>
      )}
    </div>
  );
}