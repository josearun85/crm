import { useEffect, useState } from "react";
import { fetchProcurementTasks } from "../services/orderDetailsService";

export default function ProcurementTab({ orderId }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!orderId || isNaN(Number(orderId))) return;
    fetchProcurementTasks(Number(orderId))
      .then(setTasks)
      .catch((err) => console.error("Failed to fetch procurement tasks", err));
  }, [orderId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Procurement Tasks for Order {orderId}</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-600">No procurement tasks available yet.</p>
      ) : (
        <ul className="text-sm divide-y border rounded">
          {tasks.map((task) => (
            <li key={task.id} className="p-2 space-y-1">
              <div><strong>BOQ ID:</strong> {task.boq_item_id}</div>
              <div><strong>Vendor:</strong> {task.vendor_id || "Unassigned"}</div>
              <div><strong>Status:</strong> {task.status || "N/A"}</div>
              <div><strong>Inventory:</strong> {task.inventory_status || "-"}</div>
              <div>
                <strong>Expected:</strong> {task.expected_date || "-"}<br />
                <strong>Received:</strong> {task.actual_date || "-"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}