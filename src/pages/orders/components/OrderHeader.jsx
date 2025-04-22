import { useEffect, useState } from "react";
import { fetchOrderOverview } from "../services/orderDetailsService";

export default function OrderHeader({ orderId }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    fetchOrderOverview(orderId).then(setOrder).catch(console.error);
  }, [orderId]);

  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold">
        Order #{orderId}
        {order?.name ? ` — ${order.name}` : ""}
      </h1>
      <div className="text-sm text-gray-600 space-x-4 mt-1">
        {order?.status && <span>Status: {order.status}</span>}
        {order?.due_date && <span>Due: {new Date(order.due_date).toLocaleDateString()}</span>}
        {order?.fab_type && <span>Fab Type: {order.fab_type}</span>}
      </div>
    </div>
  );
}