

import { useEffect, useState } from "react";
import { fetchOrderOverview } from "../services/orderDetailsService";

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

  if (!orderId) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Order Overview</h2>
      {error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : order ? (
        <table className="text-sm border min-w-full">
          <tbody>
            <tr>
              <td className="p-2 border font-medium">Order ID</td>
              <td className="p-2 border">{orderId}</td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Name</td>
              <td className="p-2 border">{order.name || "-"}</td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Status</td>
              <td className="p-2 border">{order.status || "-"}</td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Due Date</td>
              <td className="p-2 border">
                {order.due_date ? new Date(order.due_date).toLocaleDateString() : "-"}
              </td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Fab Type</td>
              <td className="p-2 border">{order.fab_type || "-"}</td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Cost Estimate</td>
              <td className="p-2 border">
                {order.cost_estimate ? `₹${order.cost_estimate}` : "-"}
              </td>
            </tr>
            <tr>
              <td className="p-2 border font-medium">Description</td>
              <td className="p-2 border">{order.description || "-"}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-600">Loading...</p>
      )}
    </div>
  );
}