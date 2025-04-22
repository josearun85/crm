import { useEffect, useState } from "react";
import { fetchSignageItems, fetchBoqItems } from "../services/orderDetailsService";

export default function BoqTab({ orderId }) {
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    async function loadBoqSummary() {
      try {
        // Fetch all signage items (to ensure we have all signage IDs)
        const items = await fetchSignageItems(orderId);
        // Fetch all BOQ entries for the order
        const allBoqs = await fetchBoqItems(orderId);

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
            <tr key={m.material}>
              <td className="p-2 border">{m.material}</td>
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
    </div>
  );
}