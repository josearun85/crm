import { useEffect, useState } from "react";
import { fetchSignageItems, fetchBoqItems, updateBoqItem } from "../services/orderDetailsService";

export default function BoqTab({ orderId }) {
  const [materials, setMaterials] = useState([]);
  const [rawBoqs, setRawBoqs] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [signageItems, setSignageItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedRow, setEditedRow] = useState(null);

useEffect(() => {
  if (!orderId || isNaN(Number(orderId))) return;
  async function loadBoqSummary() {
    try {
      // Fetch all signage items (to ensure we have all signage IDs)
      const items = await fetchSignageItems(Number(orderId));
      setSignageItems(items);
      // Fetch all BOQ entries for the order
      const allBoqs = await fetchBoqItems(Number(orderId));
      setRawBoqs(allBoqs);

      // Reduce BOQ entries by material
      const summaryMap = {};
      for (const boq of allBoqs) {
        const key = boq.material;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            material: boq.material,
            quantity: 0,
            cost_per_unit: boq.cost_per_unit || 0,
            unit: boq.unit || "",
          };
        }
        summaryMap[key].quantity += Number(boq.quantity || 0);
      }
      const materialList = Object.values(summaryMap).map(m => ({
        ...m,
        total_cost: m.cost_per_unit * m.quantity,
      }));
      setMaterials(materialList);
    } catch (err) {
      console.error(err);
    }
  }
  loadBoqSummary();
}, [orderId]);

  const totalBoqCost = materials.reduce((sum, m) => sum + m.total_cost, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">BOQ Summary Across All Signage Items</h2>
      <table className="min-w-full text-sm border">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2 border">Material</th>
            <th className="p-2 border">Unit</th>
            <th className="p-2 border">Total Quantity</th>
            <th className="p-2 border">Cost/Unit</th>
            <th className="p-2 border">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {materials.map(m => (
            <tr key={m.material} className="hover:bg-yellow-50 cursor-pointer"
                onClick={() => {
                  setSelectedMaterial(m.material);
                  setBreakdown(rawBoqs.filter(b => b.material === m.material));
                }}
            >
              <td className="p-2 border font-medium">{m.material}</td>
              <td className="p-2 border">{m.unit}</td>
              <td className="p-2 border">{m.quantity}</td>
              <td className="p-2 border">{m.cost_per_unit}</td>
              <td className="p-2 border">{m.total_cost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right font-semibold mt-2">
        Total BOQ Cost: ₹{totalBoqCost.toFixed(2)}
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Click on a material above to view which signage items use it.
      </p>

      {selectedMaterial && breakdown.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-medium mb-1">
            Breakdown for {selectedMaterial}
          </h3>
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">Signage Item Name</th>
                <th className="p-2 border">Quantity</th>
                <th className="p-2 border">Unit</th>
                <th className="p-2 border">Cost/Unit</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border"></th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b, i) => (
                <tr key={i}>
                  <td className="p-2 border">
                    {signageItems.find(s => s.id === b.signage_item_id)?.name || b.signage_item_id}
                  </td>
                  <td className="p-2 border">
                    {editingIndex === i ? (
                      <input
                        className="w-full border px-1 py-0.5 text-sm"
                        type="number"
                        value={editedRow.quantity}
                        onChange={(e) => setEditedRow({ ...editedRow, quantity: Number(e.target.value) })}
                      />
                    ) : (
                      b.quantity
                    )}
                  </td>
                  <td className="p-2 border">{b.unit}</td>
                  <td className="p-2 border">
                    {editingIndex === i ? (
                      <input
                        className="w-full border px-1 py-0.5 text-sm"
                        type="number"
                        value={editedRow.cost_per_unit}
                        onChange={(e) => setEditedRow({ ...editedRow, cost_per_unit: Number(e.target.value) })}
                      />
                    ) : (
                      b.cost_per_unit
                    )}
                  </td>
                  <td className="p-2 border">
                    {(b.quantity * b.cost_per_unit).toFixed(2)}
                  </td>
                  <td className="p-2 border text-right">
                    {editingIndex === i ? (
                      <>
                        <button
                          className="text-green-600 text-sm mr-2"
                          onClick={async () => {
                            await updateBoqItem(b.id, {
                              quantity: editedRow.quantity,
                              cost_per_unit: editedRow.cost_per_unit,
                            });
                            const updated = [...breakdown];
                            updated[i] = { ...b, ...editedRow };
                            setBreakdown(updated);
                            setEditingIndex(null);
                          }}
                        >
                          💾
                        </button>
                        <button className="text-gray-600 text-sm" onClick={() => setEditingIndex(null)}>✖</button>
                      </>
                    ) : (
                      <button
                        className="text-blue-600 text-sm"
                        onClick={() => {
                          setEditingIndex(i);
                          setEditedRow({ quantity: b.quantity, cost_per_unit: b.cost_per_unit });
                        }}
                      >
                        ✎
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}