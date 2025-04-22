


export default function OrderHeader({ orderId }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold">Order #{orderId}</h1>
      {/* Later: fetch and show customer name, status, dates etc. */}
    </div>
  );
}