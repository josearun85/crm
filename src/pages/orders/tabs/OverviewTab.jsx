import { useEffect, useState } from "react";
import { fetchOrderOverview, updateOrderDetails, addFeedNote } from "../services/orderDetailsService";

export default function OverviewTab({ orderId,orderData, overview, }) {
  
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [editBuffer, setEditBuffer] = useState({});
  // setOrder(orderData)

  useEffect(() => {
    if (!orderId || isNaN(Number(orderId))) return;
    fetchOrderOverview(Number(orderId))
      .then(setOrder)
      .catch((err) =>
        setError(err && err.message ? err.message : "Failed to load order overview")
      );
  }, [orderId]);

  // Helper to update local buffer on change
  const handleFieldChange = (field, value) => {
    setEditBuffer((prev) => ({ ...prev, [field]: value }));
  };

  // Helper to save on blur if changed
  const handleFieldBlur = async (field, label) => {
    if (!order) return;
    const newValue = editBuffer[field];
    if (newValue !== undefined && newValue !== order[field]) {
      try {
        await updateOrderDetails(orderId, { [field]: newValue });
        setOrder((prev) => ({ ...prev, [field]: newValue }));
        await addFeedNote({
          type: "feed",
          content: `${label} updated`,
          order_id: orderId,
        });
      } catch (err) {
        setError(`Failed to update ${label.toLowerCase()}`);
      }
    }
  };

  const statusColor = {
    pending: "text-yellow-600",
    approved: "text-green-600",
    rejected: "text-red-600",
  };

  if (!orderId) return null;

  return (
    <div className="space-y-4 max-w-xl relative">
      {/* Watermark logo */}
      <img
        src="/logo.jpeg"
        alt="Logo watermark"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '320px',
          height: 'auto',
          opacity: 0.08,
          filter: 'grayscale(1) brightness(1.2)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
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
                    value={editBuffer.name !== undefined ? editBuffer.name : orderData.name || ""}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    onBlur={() => handleFieldBlur("name", "Name")}
                  />
                </td>
              </tr>
              <tr>
                <td className="p-2 border font-medium">Status</td>
                <td className="p-2 border">
                  <select
                    className={`w-full p-1 rounded border ${statusColor[order.status] || ""}`}
                    value={editBuffer.status !== undefined ? editBuffer.status : order.status || "pending"}
                    onChange={(e) => handleFieldChange("status", e.target.value)}
                    onBlur={() => handleFieldBlur("status", "Status")}
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
                    value={editBuffer.due_date !== undefined ? editBuffer.due_date : order.due_date?.split("T")[0] || ""}
                    onChange={(e) => handleFieldChange("due_date", e.target.value)}
                    onBlur={() => handleFieldBlur("due_date", "Due Date")}
                  />
                </td>
              </tr>
              <tr>
                <td className="p-2 border font-medium">Fab Type</td>
                <td className="p-2 border">
                  <input
                    className="w-full border rounded p-1"
                    value={editBuffer.fab_type !== undefined ? editBuffer.fab_type : order.fab_type || ""}
                    onChange={(e) => handleFieldChange("fab_type", e.target.value)}
                    onBlur={() => handleFieldBlur("fab_type", "Fab Type")}
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
                    value={editBuffer.cost_estimate !== undefined ? editBuffer.cost_estimate : order.cost_estimate || ""}
                    onChange={(e) => handleFieldChange("cost_estimate", e.target.value)}
                    onBlur={() => handleFieldBlur("cost_estimate", "Cost Estimate")}
                  />
                </td>
              </tr>
              <tr>
                <td className="p-2 border font-medium">Description</td>
                <td className="p-2 border">
                  <textarea
                    className="w-full border rounded p-1"
                    value={editBuffer.description !== undefined ? editBuffer.description : order.description || ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    onBlur={() => handleFieldBlur("description", "Description")}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-600">Loading...</p>
        )}
      </div>
    </div>
  );
}