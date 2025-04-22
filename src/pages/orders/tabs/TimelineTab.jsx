import { useEffect, useState } from "react";
import ModernGantt from "../components/ModernGantt";
import { fetchOrderSteps, insertDefaultOrderSteps } from "../services/orderDetailsService";

export default function TimelineTab({ orderId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSteps() {
      try {
        setLoading(true);
        let data = await fetchOrderSteps(orderId);
        if (data.length === 0) {
          await insertDefaultOrderSteps(orderId);
          data = await fetchOrderSteps(orderId); // re-fetch after insert
        }
        setSteps(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load order steps.");
      } finally {
        setLoading(false);
      }
    }

    loadSteps();
  }, [orderId]);

  return (
    <div className="mt-4">
      {loading ? (
        <p className="text-sm text-gray-500">Loading timeline...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <ModernGantt steps={steps} />
      )}
    </div>
  );
}