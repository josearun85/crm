import { useEffect } from "react";

export default function NotesTab({ orderId }) {
  useEffect(() => {
    if (!orderId || isNaN(Number(orderId))) return;
    // Placeholder for future fetchNotes(Number(orderId))
  }, [orderId]);

  return <div className="text-sm text-gray-600">Notes tab coming soon for order {orderId}.</div>;
}