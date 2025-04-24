import { useEffect, useState } from "react";
import { fetchInventory, addInventoryEntry } from "./orders/services/orderDetailsService";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newInv, setNewInv] = useState({ material: "", unit: "", available_qty: "" });
  const [editingRowId, setEditingRowId] = useState(null);

  useEffect(() => {
    fetchInventory().then(setInventory).finally(() => setLoading(false));
  }, []);

  async function handleAddInventory(e) {
    e.preventDefault();
    if (!newInv.material || !newInv.unit) return;
    await addInventoryEntry(newInv.material, newInv.unit);
    setShowAdd(false);
    setNewInv({ material: "", unit: "", available_qty: "" });
    setLoading(true);
    fetchInventory().then(setInventory).finally(() => setLoading(false));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>
      <button
        className="mb-4 bg-green-600 text-white px-4 py-2 rounded"
        onClick={() => setShowAdd(s => !s)}
      >
        + Add Inventory
      </button>
      {showAdd && (
        <form className="mb-4 flex gap-2 items-end" onSubmit={handleAddInventory}>
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Material"
            value={newInv.material}
            onChange={e => setNewInv({ ...newInv, material: e.target.value })}
            required
          />
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Unit"
            value={newInv.unit}
            onChange={e => setNewInv({ ...newInv, unit: e.target.value })}
            required
          />
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Available Qty"
            type="number"
            value={newInv.available_qty}
            onChange={e => setNewInv({ ...newInv, available_qty: e.target.value })}
            min={0}
          />
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" type="submit">Add</button>
        </form>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 border">Material</th>
              <th className="p-2 border">Available Qty</th>
              <th className="p-2 border">Unit</th>
              <th className="p-2 border">Last Updated</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((row) => (
              <tr key={row.id}>
                {editingRowId === row.id ? (
                  <>
                    <td className="p-2 border">
                      <input
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={row.material}
                        onChange={e => setInventory(inv => inv.map(r => r.id === row.id ? { ...r, material: e.target.value } : r))}
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        className="border rounded px-2 py-1 text-sm w-full"
                        type="number"
                        value={row.available_qty}
                        onChange={e => setInventory(inv => inv.map(r => r.id === row.id ? { ...r, available_qty: e.target.value } : r))}
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={row.unit}
                        onChange={e => setInventory(inv => inv.map(r => r.id === row.id ? { ...r, unit: e.target.value } : r))}
                      />
                    </td>
                    <td className="p-2 border">{row.last_updated}</td>
                    <td className="p-2 border">
                      <button
                        className="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2"
                        onClick={async () => {
                          await window.supabase
                            .from("inventory")
                            .update({
                              material: row.material,
                              available_qty: row.available_qty,
                              unit: row.unit,
                              last_updated: new Date().toISOString().slice(0, 10)
                            })
                            .eq("id", row.id);
                          setEditingRowId(null);
                          setLoading(true);
                          fetchInventory().then(setInventory).finally(() => setLoading(false));
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-300 text-black px-2 py-1 rounded text-xs"
                        onClick={() => setEditingRowId(null)}
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 border" onClick={() => setEditingRowId(row.id)}>{row.material}</td>
                    <td className="p-2 border" onClick={() => setEditingRowId(row.id)}>{row.available_qty}</td>
                    <td className="p-2 border" onClick={() => setEditingRowId(row.id)}>{row.unit}</td>
                    <td className="p-2 border">{row.last_updated}</td>
                    <td className="p-2 border">
                      <button
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                        onClick={() => setEditingRowId(row.id)}
                      >
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
