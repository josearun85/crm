import { useEffect, useState } from "react";
import { fetchSignageItems, fetchBoqItems, addBoqItem, deleteBoqItem, updateBoqItem, addSignageItem } from "../services/orderDetailsService";

export default function SignageItemsTab({ orderId }) {
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [boqs, setBoqs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", quantity: "", cost: "" });
  const [newBoq, setNewBoq] = useState({ material: "", quantity: "", unit: "", cost_per_unit: "" });
  const [editingBoqId, setEditingBoqId] = useState(null);
  const [editedBoq, setEditedBoq] = useState({});

  useEffect(() => {
    fetchSignageItems(orderId).then(setItems).catch(console.error);
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
              <td className="p-2 border">{item.name}</td>
              <td className="p-2 border">{item.description}</td>
              <td className="p-2 border">{item.quantity}</td>
              <td className="p-2 border flex justify-between items-center">
                {item.cost}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    alert("TODO: Open edit modal");
                  }}
                  className="ml-2 text-blue-500 cursor-pointer"
                >
                  ✎
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    alert("TODO: Trigger delete");
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
                    {editingBoqId === boq.id ? (
                      <>
                        {["material", "quantity", "unit", "cost_per_unit"].map((field) => (
                          <td key={field} className="p-2 border">
                            <input
                              className="w-full border px-1 py-0.5 text-sm"
                              value={editedBoq[field]}
                              type={field === "quantity" || field === "cost_per_unit" ? "number" : "text"}
                              onChange={(e) =>
                                setEditedBoq({ ...editedBoq, [field]: e.target.value })
                              }
                            />
                          </td>
                        ))}
                        <td className="p-2 border text-right space-x-2">
                          <button
                            className="text-green-600 text-sm"
                            onClick={async () => {
                              const updated = await updateBoqItem(boq.id, editedBoq);
                              setBoqs(boqs.map(b => b.id === boq.id ? updated : b));
                              setEditingBoqId(null);
                            }}
                          >
                            💾
                          </button>
                          <button
                            className="text-gray-600 text-sm"
                            onClick={() => setEditingBoqId(null)}
                          >
                            ✖
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border">{boq.material}</td>
                        <td className="p-2 border">{boq.quantity}</td>
                        <td className="p-2 border">{boq.unit}</td>
                        <td className="p-2 border flex justify-between items-center">
                          {boq.cost_per_unit}
                          <span
                            onClick={() => {
                              setEditingBoqId(boq.id);
                              setEditedBoq({
                                material: boq.material,
                                quantity: boq.quantity,
                                unit: boq.unit,
                                cost_per_unit: boq.cost_per_unit,
                              });
                            }}
                            className="ml-2 text-blue-500 cursor-pointer"
                          >
                            ✎
                          </span>
                          <span
                            onClick={async () => {
                              await deleteBoqItem(boq.id);
                              setBoqs(boqs.filter(b => b.id !== boq.id));
                            }}
                            className="ml-2 text-red-500 cursor-pointer"
                          >
                            🗑
                          </span>
                        </td>
                      </>
                    )}
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
                />
              ))}
            </div>
            <button
              className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm"
              onClick={async () => {
                const boq = await addBoqItem(selectedItemId, newBoq);
                setBoqs([...boqs, boq]);
                setNewBoq({ material: "", quantity: "", unit: "", cost_per_unit: "" });
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