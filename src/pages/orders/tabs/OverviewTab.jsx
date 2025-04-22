

export default function OverviewTab({ orderId }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Order Overview</h2>
      <p>This section will show summary info for order #{orderId} including status, dates, and costing.</p>
    </div>
  );
}