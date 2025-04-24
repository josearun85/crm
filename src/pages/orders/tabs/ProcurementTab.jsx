import { useEffect, useState } from "react";
import { fetchProcurementTasks, markProcurementTaskOrdered, markProcurementTaskReceivedAndUpdateInventory, fetchVendorsByIds, fetchInventoryByMaterials, rebalanceProcurementTasks, ensureProcurementStepsForOrder, fetchBoqItemById, updateBoqItem, fetchInventory } from "../services/orderDetailsService";

export default function ProcurementTab({ orderId }) {
  const [tasks, setTasks] = useState([]);
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [vendorMap, setVendorMap] = useState({});
  const [boqMap, setBoqMap] = useState({});
  const [inventoryMap, setInventoryMap] = useState({});
  const [rebalancing, setRebalancing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editReceivedValue, setEditReceivedValue] = useState(0);

  useEffect(() => {
    if (!orderId || isNaN(Number(orderId))) return;
    // Ensure all procurement tasks have a matching order_step
    ensureProcurementStepsForOrder(Number(orderId)).then(() => {
      fetchProcurementTasks(Number(orderId))
        .then(async (tasks) => {
          setTasks(tasks);
          const vendorIds = [...new Set(tasks.map(t => t.vendor_id).filter(Boolean))];
          if (vendorIds.length) {
            const vendors = await fetchVendorsByIds(vendorIds);
            const vmap = {};
            vendors.forEach(v => { vmap[v.id] = v.name; });
            setVendorMap(vmap);
          } else {
            setVendorMap({});
          }
          const boqIds = tasks.map(t => t.boq_item_id);
          const boqMapObj = {};
          for (const id of boqIds) {
            const boq = await fetchBoqItemById(id);
            if (boq) boqMapObj[id] = boq;
          }
          setBoqMap(boqMapObj);
          const materials = Object.values(boqMapObj).map(b => b.material);
          if (materials.length) {
            const invs = await fetchInventory();
            const invMap = {};
            for (const inv of invs) invMap[inv.material] = inv;
            setInventoryMap(invMap);
          }
        })
        .catch((err) => console.error("Failed to fetch procurement tasks", err));
    });
  }, [orderId, rebalancing]);

  async function handleMarkOrdered(taskId) {
    if (!window.confirm("Mark this procurement as ordered?")) return;
    setLoadingTaskId(taskId);
    try {
      await markProcurementTaskOrdered(taskId);
      setTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, status: "ordered" } : t));
      window.alert("Marked as ordered.");
    } catch (err) {
      window.alert("Failed to mark as ordered: " + err.message);
    }
    setLoadingTaskId(null);
  }

  async function handleEditReceivedQty(boqId, newQty) {
    try {
      await updateBoqItem(boqId, { received_qty: newQty });
      setBoqMap(map => ({ ...map, [boqId]: { ...map[boqId], received_qty: newQty } }));
      window.alert("Received quantity updated.");
      setRebalancing(r => !r);
    } catch (err) {
      window.alert("Failed to update received quantity: " + err.message);
    }
  }

  async function handleMarkReceived(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const boq = boqMap[task.boq_item_id];
    if (!boq) return alert("BOQ not found");
    const maxReceivable = boq.quantity - (boq.received_qty || 0);
    let qty = maxReceivable; // Default to full receipt
    setLoadingTaskId(taskId);
    try {
      await updateBoqItem(boq.id, { received_qty: (boq.received_qty || 0) + qty });
      const inv = inventoryMap[boq.material];
      if (inv) {
        await fetchInventory();
      }
      if (qty === maxReceivable) {
        await markProcurementTaskReceivedAndUpdateInventory(taskId);
        setTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, status: "received", actual_date: new Date().toISOString() } : t));
      }
      window.alert("Inventory and BOQ received quantity updated.");
      setRebalancing(r => !r);
    } catch (err) {
      window.alert("Failed to mark as received: " + err.message);
    }
    setLoadingTaskId(null);
  }

  async function handleRebalance() {
    setRebalancing(true);
    try {
      await rebalanceProcurementTasks(Number(orderId));
      window.alert("Procurement tasks rebalanced with current inventory.");
    } catch (err) {
      window.alert("Failed to rebalance: " + err.message);
    }
    setRebalancing(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Procurement Tasks for Order {orderId}</h2>
        <button
          className="px-3 py-1 bg-yellow-600 text-white rounded text-sm"
          onClick={handleRebalance}
          disabled={rebalancing}
        >
          {rebalancing ? "Rebalancing..." : "Rebalance"}
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-600">No procurement tasks available yet.</p>
      ) : (
        <ul className="text-sm divide-y border rounded">
          {tasks.map((task) => {
            const boq = boqMap[task.boq_item_id] || {};
            const inv = inventoryMap[boq.material] || {};
            return (
              <li key={task.id} className="p-2 space-y-1">
                <div><strong>BOQ ID:</strong> {task.boq_item_id}</div>
                <div><strong>Vendor:</strong> {task.vendor_id ? vendorMap[task.vendor_id] || task.vendor_id : "Unassigned"}</div>
                <div><strong>Status:</strong> {task.status || "N/A"}</div>
                <div><strong>Expected (BOQ):</strong> {boq.quantity}</div>
                <div><strong>Received:</strong> {editingTaskId === task.id ? (
                  <input
                    type="number"
                    min={0}
                    max={boq.quantity}
                    value={editReceivedValue}
                    onChange={e => setEditReceivedValue(Number(e.target.value))}
                    onBlur={() => {
                      handleEditReceivedQty(boq.id, editReceivedValue);
                      setEditingTaskId(null);
                    }}
                    className="border px-1 py-0.5 text-sm w-20"
                  />
                ) : (
                  <span
                    className="cursor-pointer underline text-blue-600"
                    title="Click to edit"
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditReceivedValue(boq.received_qty || 0);
                    }}
                  >
                    {boq.received_qty || 0}
                  </span>
                )}
                </div>
                <div><strong>Inventory:</strong> {inv.available_qty || 0}</div>
                <div>
                  <strong>Expected Date:</strong> {task.expected_date || "-"}<br />
                  <strong>Received Date:</strong> {task.actual_date || "-"}
                </div>
                <div className="flex gap-2 pt-1">
                  {task.status !== "ordered" && task.status !== "received" && (
                    <button
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                      onClick={() => handleMarkOrdered(task.id)}
                      disabled={loadingTaskId === task.id}
                    >
                      {loadingTaskId === task.id ? "..." : "Mark as Ordered"}
                    </button>
                  )}
                  {task.status === "ordered" && task.status !== "received" && (
                    <button
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                      onClick={() => handleMarkReceived(task.id)}
                      disabled={loadingTaskId === task.id}
                    >
                      {loadingTaskId === task.id ? "..." : "Mark as Received"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}