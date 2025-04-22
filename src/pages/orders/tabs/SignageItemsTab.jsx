import { useEffect, useState } from "react";
import { fetchSignageItems, fetchBoqItems } from "../services/orderDetailsService";

export default function SignageItemsTab({ orderId }) {
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [boqs, setBoqs] = useState([]);

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
      <h2 className="text-lg font-semibold">Signage Items</h2>
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
              <td className="p-2 border">{item.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
                    <td className="p-2 border">{boq.material}</td>
                    <td className="p-2 border">{boq.quantity}</td>
                    <td className="p-2 border">{boq.unit}</td>
                    <td className="p-2 border">{boq.cost_per_unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}