import { useEffect, useState } from "react";
import { fetchSignageItems, fetchBoqItems, addBoqItem, deleteBoqItem, updateBoqItem, addSignageItem, updateSignageItem, deleteSignageItem, fetchProcurementTasks, ensureFabricationStepsForSignageItems } from "../services/orderDetailsService";

export default function SignageItemsTab({ orderId }) {
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [boqs, setBoqs] = useState([]);
  const [allBoqs, setAllBoqs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", quantity: "", cost: "" });
  const [newBoq, setNewBoq] = useState({ material: "", quantity: "", unit: "", cost_per_unit: "" });
  const [editingBoqId, setEditingBoqId] = useState(null);
  const [editedBoq, setEditedBoq] = useState({});
  const [showBoqForItemId, setShowBoqForItemId] = useState(null);
  const [procuredBoqIds, setProcuredBoqIds] = useState(new Set());
  const [procurementTasksByBoqId, setProcurementTasksByBoqId] = useState({});
  const [selectedProcurement, setSelectedProcurement] = useState(null);

  useEffect(() => {
    ensureFabricationStepsForSignageItems(orderId).catch(console.error);
    fetchSignageItems(orderId).then(setItems).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    fetchBoqItems(orderId).then(setAllBoqs).catch(console.error);
    // Fetch procurement tasks and build a set of procured BOQ ids
    fetchProcurementTasks(orderId).then(tasks => {
      setProcuredBoqIds(new Set(tasks.map(t => t.boq_item_id)));
    }).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (selectedItemId) {
      fetchBoqItems(orderId).then(all => 
        setBoqs(all.filter(b => b.signage_item_id === selectedItemId))
      );
    } else {
      setBoqs([]);
    }
  }, [selectedItemId, orderId]);

  useEffect(() => {
    if (!selectedItemId) return;
    fetchProcurementTasks(orderId).then(tasks => {
      const map = {};
      for (const t of tasks) {
        if (!map[t.boq_item_id]) map[t.boq_item_id] = [];
        map[t.boq_item_id].push(t);
      }
      setProcurementTasksByBoqId(map);
    });
  }, [orderId, selectedItemId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Signage Items</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded"
        >
          + Add Item
        </button>
      </div>
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Description</th>
            <th className="p-2 border">Quantity</th>
            <th className="p-2 border">Cost</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr
              key={item.id}
              onClick={() =>
                setSelectedItemId(selectedItemId === item.id ? null : item.id)
              }
              className={`cursor-pointer ${showBoqForItemId === item.id ? "bg-yellow-50" : ""}`}
            >
              {/* Name */}
              <td className="p-2 border">
                <input
                  className="w-full border px-1 py-0.5 text-sm"
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    setItems(items.map(it => it.id === item.id ? { ...it, name: e.target.value } : it))
                  }
                  onBlur={async () => {
                    await updateSignageItem(item.id, item);
                  }}
                />
              </td>
              {/* Description */}
              <td className="p-2 border">
                <input
                  className="w-full border px-1 py-0.5 text-sm"
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    setItems(items.map(it => it.id === item.id ? { ...it, description: e.target.value } : it))
                  }
                  onBlur={async () => {
                    await updateSignageItem(item.id, item);
                  }}
                />
              </td>
              {/* Quantity */}
              <td className="p-2 border">
                <input
                  className="w-full border px-1 py-0.5 text-sm"
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    setItems(items.map(it => it.id === item.id ? { ...it, quantity: e.target.value } : it))
                  }
                  onBlur={async () => {
                    await updateSignageItem(item.id, item);
                  }}
                />
              </td>
              {/* Cost */}
              <td className="p-2 border flex justify-between items-center">
                <input
                  className="w-full border px-1 py-0.5 text-sm"
                  type="number"
                  value={item.cost}
                  onChange={(e) =>
                    setItems(items.map(it => it.id === item.id ? { ...it, cost: e.target.value } : it))
                  }
                  onBlur={async () => {
                    await updateSignageItem(item.id, item);
                  }}
                />
                <span
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = confirm("Are you sure you want to delete this item?");
                    if (confirmed) {
                      await deleteSignageItem(item.id);
                      setItems(items.filter(it => it.id !== item.id));
                    }
                  }}
                  className="ml-2 text-red-500 cursor-pointer"
                >
                  🗑
                </span>
                <span
                  className="ml-2 text-blue-600 underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBoqForItemId(showBoqForItemId === item.id ? null : item.id);
                    setSelectedItemId(showBoqForItemId === item.id ? null : item.id);
                  }}
                >
                  View BOQ
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Add Signage Item</h3>
            <div className="space-y-2">
              {["name", "description", "quantity", "cost"].map((field) => (
                <input
                  key={field}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  type={field === "quantity" || field === "cost" ? "number" : "text"}
                  value={newItem[field]}
                  onChange={(e) =>
                    setNewItem({ ...newItem, [field]: e.target.value })
                  }
                />
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-3 py-1 text-sm bg-gray-200 rounded"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                onClick={async () => {
                  try {
                    const finalOrderId = Number(orderId);
                    console.log("Saving signage item for order:", finalOrderId);
                    if (!finalOrderId || isNaN(finalOrderId)) {
                      throw new Error("Invalid order ID");
                    }
                    const created = await addSignageItem(finalOrderId, {
                      ...newItem,
                      quantity: Number(newItem.quantity),
                      cost: Number(newItem.cost),
                    });
                    setItems([...items, created]);
                    setNewItem({ name: "", description: "", quantity: "", cost: "" });
                    setShowAddModal(false);
                  } catch (err) {
                    console.error("Failed to add signage item", err);
                    alert(`Error: ${err.message}`);
                  }
                }}
              >
                Saver
              </button>
            </div>
          </div>
        </div>
      )}

      {showBoqForItemId && (
        <div className="mt-6 border rounded p-4 bg-gray-50">
          <h3 className="font-medium mb-2">BOQ for selected item</h3>
          {boqs.length === 0 ? (
            <p className="text-sm text-gray-500">No BOQ entries found.</p>
          ) : (
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2 border">Material</th>
                  <th className="p-2 border">Quantity</th>
                  <th className="p-2 border">Unit</th>
                  <th className="p-2 border">Cost/Unit</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Procurement</th>
                  <th className="p-2 border"></th>
                </tr>
              </thead>
              <tbody>
                {boqs.map((boq) => (
                  <tr key={boq.id}>
                    <td className="p-2 border">
                      <input
                        className="w-full border px-1 py-0.5 text-sm"
                        value={boq.material}
                        onChange={e => {
                          const updated = { ...boq, material: e.target.value };
                          setBoqs(boqs.map(b => b.id === boq.id ? updated : b));
                        }}
                        onBlur={() => {
                          const match = allBoqs.find(b => b.material === boq.material && b.id !== boq.id);
                          if (match) {
                            setBoqs(boqs.map(b => b.id === boq.id ? { ...b, unit: match.unit, cost_per_unit: match.cost_per_unit } : b));
                          }
                          updateBoqItem(boq.id, boq);
                        }}
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        className="w-full border px-1 py-0.5 text-sm"
                        type="number"
                        value={boq.quantity}
                        onChange={e => {
                          const updated = { ...boq, quantity: e.target.value };
                          setBoqs(boqs.map(b => b.id === boq.id ? updated : b));
                        }}
                        onBlur={() => updateBoqItem(boq.id, boq)}
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        className="w-full border px-1 py-0.5 text-sm"
                        value={boq.unit}
                        onChange={e => {
                          const updated = { ...boq, unit: e.target.value };
                          setBoqs(boqs.map(b => b.id === boq.id ? updated : b));
                        }}
                        onBlur={() => updateBoqItem(boq.id, boq)}
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        className="w-full border px-1 py-0.5 text-sm"
                        type="number"
                        value={boq.cost_per_unit}
                        onChange={e => {
                          const updated = { ...boq, cost_per_unit: e.target.value };
                          setBoqs(boqs.map(b => b.id === boq.id ? updated : b));
                        }}
                        onBlur={() => updateBoqItem(boq.id, boq)}
                      />
                    </td>
                    <td className="p-2 border">{(boq.quantity * boq.cost_per_unit).toFixed(2)}</td>
                    <td className="p-2 border text-center">
                      {procurementTasksByBoqId[boq.id]?.length > 0 ? (
                        <>
                          <span
                            title={
                              procurementTasksByBoqId[boq.id][0].status === 'received'
                                ? 'Procurement received, material available'
                                : 'Procurement created'
                            }
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedProcurement(procurementTasksByBoqId[boq.id][0])}
                          >
                            {procurementTasksByBoqId[boq.id][0].status === 'received' ? '✅' : '🛒'}
                          </span>
                          <span className="ml-1 text-xs text-gray-500">({procurementTasksByBoqId[boq.id].length})</span>
                        </>
                      ) : (
                        <span title="No procurement">—</span>
                      )}
                    </td>
                    <td className="p-2 border text-right">
                      <span
                        onClick={async () => {
                          const confirmed = confirm("Delete this BOQ entry?");
                          if (confirmed) {
                            await deleteBoqItem(boq.id);
                            setBoqs(boqs.filter(b => b.id !== boq.id));
                          }
                        }}
                        className="ml-2 text-red-500 cursor-pointer"
                      >
                        🗑
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="p-2 border text-right" colSpan={4}>Total Cost</td>
                  <td className="p-2 border">{boqs.reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Add BOQ Entry</h4>
            <div className="grid grid-cols-4 gap-2">
              {["material", "quantity", "unit", "cost_per_unit"].map((field) => (
                <input
                  key={field}
                  className="border p-1 rounded text-sm"
                  placeholder={field.replace("_", " ")}
                  type={field === "quantity" || field === "cost_per_unit" ? "number" : "text"}
                  value={newBoq[field]}
                  onChange={(e) => setNewBoq({ ...newBoq, [field]: e.target.value })}
                  onBlur={
                    field === "material"
                      ? () => {
                          const match = allBoqs.find(b => b.material === newBoq.material);
                          if (match) {
                            setNewBoq(prev => ({
                              ...prev,
                              unit: match.unit,
                              cost_per_unit: match.cost_per_unit,
                            }));
                          }
                        }
                      : undefined
                  }
                />
              ))}
            </div>
            <button
              className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm"
              onClick={async () => {
                const boq = await addBoqItem(selectedItemId, newBoq);
                setBoqs([...boqs, boq]);
                setNewBoq({ material: "", quantity: "", unit: "", cost_per_unit: "" });

                const updatedBoqs = [...allBoqs, boq];
                setAllBoqs(updatedBoqs);

                // Cost propagation
                const costDiffItems = updatedBoqs.filter(
                  b => b.material === boq.material &&
                  b.id !== boq.id &&
                  b.cost_per_unit !== boq.cost_per_unit
                );

                if (costDiffItems.length > 0) {
                  alert(`Updating ${costDiffItems.length} other entries with new cost/unit`);
                  for (const b of costDiffItems) {
                    await updateBoqItem(b.id, { cost_per_unit: boq.cost_per_unit });
                  }
                  const refreshedBoqs = updatedBoqs.map(b =>
                    b.material === boq.material
                      ? { ...b, cost_per_unit: boq.cost_per_unit }
                      : b
                  );
                  setAllBoqs(refreshedBoqs);
                  setBoqs(refreshedBoqs.filter(b => b.signage_item_id === selectedItemId));
                }

                // Unit propagation
                const unitDiffItems = updatedBoqs.filter(
                  b => b.material === boq.material &&
                  b.id !== boq.id &&
                  b.unit !== boq.unit
                );
                if (unitDiffItems.length > 0) {
                  alert(`Updating ${unitDiffItems.length} other entries with new unit`);
                  for (const b of unitDiffItems) {
                    await updateBoqItem(b.id, { unit: boq.unit });
                  }
                  const refreshedBoqs = updatedBoqs.map(b =>
                    b.material === boq.material ? { ...b, unit: boq.unit } : b
                  );
                  setAllBoqs(refreshedBoqs);
                  setBoqs(refreshedBoqs.filter(b => b.signage_item_id === selectedItemId));
                }
              }}
            >
              Add BOQ
            </button>
          </div>
        </div>
      )}

      {selectedProcurement && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold mb-2">Procurement Task Details</h3>
            <div className="mb-2">
              <strong>Status:</strong> {selectedProcurement.status || '-'}<br />
              <strong>Vendor:</strong> {selectedProcurement.vendor_id || '-'}<br />
              <strong>Expected Date:</strong> {selectedProcurement.expected_date || '-'}<br />
              <strong>Received Date:</strong> {selectedProcurement.actual_date || '-'}
            </div>
            <div>
              <h4 className="font-medium mb-1">BOQ Item</h4>
              <table className="min-w-full border text-sm mb-2">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-2 border">Material</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {boqs.filter(b => b.id === selectedProcurement.boq_item_id).map(b => (
                    <tr key={b.id}>
                      <td className="p-2 border">{b.material}</td>
                      <td className="p-2 border">{b.quantity}</td>
                      <td className="p-2 border">{b.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                className="px-3 py-1 text-sm bg-gray-200 rounded"
                onClick={() => setSelectedProcurement(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}