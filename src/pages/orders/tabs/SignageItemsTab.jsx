import { useEffect, useState } from "react";
import { fetchSignageItems, fetchBoqItems, addBoqItem, deleteBoqItem, updateBoqItem, addSignageItem, updateSignageItem, deleteSignageItem } from "../services/orderDetailsService";

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
  const [editingItemId, setEditingItemId] = useState(null);
  const [editedItem, setEditedItem] = useState({});

  useEffect(() => {
    fetchSignageItems(orderId).then(setItems).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    fetchBoqItems(orderId).then(setAllBoqs).catch(console.error);
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
              className={`cursor-pointer ${selectedItemId === item.id ? "bg-yellow-50" : ""}`}
            >
              <td className="p-2 border">
                {editingItemId === item.id ? (
                  <input
                    className="w-full border px-1 py-0.5 text-sm"
                    value={editedItem.name}
                    onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                    onBlur={async () => {
                      const updated = await updateSignageItem(item.id, editedItem);
                      setItems(items.map(it => it.id === item.id ? updated : it));
                      setEditingItemId(null);
                    }}
                  />
                ) : (
                  <span onClick={() => {
                    setEditingItemId(item.id);
                    setEditedItem({ name: item.name, description: item.description, quantity: item.quantity, cost: item.cost });
                  }}>{item.name}</span>
                )}
              </td>
              <td className="p-2 border">
                {editingItemId === item.id ? (
                  <input
                    className="w-full border px-1 py-0.5 text-sm"
                    value={editedItem.description}
                    onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                    onBlur={async () => {
                      const updated = await updateSignageItem(item.id, editedItem);
                      setItems(items.map(it => it.id === item.id ? updated : it));
                      setEditingItemId(null);
                    }}
                  />
                ) : (
                  <span onClick={() => {
                    setEditingItemId(item.id);
                    setEditedItem({ name: item.name, description: item.description, quantity: item.quantity, cost: item.cost });
                  }}>{item.description}</span>
                )}
              </td>
              <td className="p-2 border">
                {editingItemId === item.id ? (
                  <input
                    className="w-full border px-1 py-0.5 text-sm"
                    type="number"
                    value={editedItem.quantity}
                    onChange={(e) => setEditedItem({ ...editedItem, quantity: e.target.value })}
                    onBlur={async () => {
                      const updated = await updateSignageItem(item.id, editedItem);
                      setItems(items.map(it => it.id === item.id ? updated : it));
                      setEditingItemId(null);
                    }}
                  />
                ) : (
                  <span onClick={() => {
                    setEditingItemId(item.id);
                    setEditedItem({ name: item.name, description: item.description, quantity: item.quantity, cost: item.cost });
                  }}>{item.quantity}</span>
                )}
              </td>
              <td className="p-2 border flex justify-between items-center">
                {editingItemId === item.id ? (
                  <input
                    className="w-full border px-1 py-0.5 text-sm"
                    type="number"
                    value={editedItem.cost}
                    onChange={(e) => setEditedItem({ ...editedItem, cost: e.target.value })}
                    onBlur={async () => {
                      const updated = await updateSignageItem(item.id, editedItem);
                      setItems(items.map(it => it.id === item.id ? updated : it));
                      setEditingItemId(null);
                    }}
                  />
                ) : (
                  <span onClick={() => {
                    setEditingItemId(item.id);
                    setEditedItem({ name: item.name, description: item.description, quantity: item.quantity, cost: item.cost });
                  }}>{item.cost}</span>
                )}
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

      {selectedItemId && (
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
                </tr>
              </thead>
              <tbody>
                {boqs.map(boq => (
                  <tr key={boq.id}>
                    <>
                      {["material", "quantity", "unit", "cost_per_unit"].map((field) => (
                        <td key={field} className="p-2 border">
                          <input
                            className="w-full border px-1 py-0.5 text-sm"
                            value={boq[field]}
                            type={field === "quantity" || field === "cost_per_unit" ? "number" : "text"}
                            onChange={(e) => {
                              const updatedBoqs = boqs.map(b => b.id === boq.id ? { ...b, [field]: e.target.value } : b);
                              setBoqs(updatedBoqs);
                            }}
                            onBlur={async (e) => {
                              const updated = await updateBoqItem(boq.id, { ...boq, [field]: e.target.value });
                              setBoqs(boqs.map(b => b.id === boq.id ? updated : b));
                            }}
                          />
                        </td>
                      ))}
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
                    </>
                  </tr>
                ))}
              </tbody>
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
              }}
            >
              Add BOQ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}