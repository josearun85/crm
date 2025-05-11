import { useEffect, useState } from "react";
import { fetchOrderOverview, updateOrderDetails, addFeedNote, fetchSignageItems, fetchBoqItems } from "../services/orderDetailsService";

export default function OrderHeader({ orderId, customerGstin, setCustomerGstin, customerPan, setCustomerPan }) {
  const [order, setOrder] = useState(null);
  const [editBuffer, setEditBuffer] = useState({});
  const [error, setError] = useState(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [netTotal, setNetTotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [gstPercent, setGstPercent] = useState(18);
  const [gst, setGst] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    fetchOrderOverview(orderId).then(order => {
      setOrder(order);
      // If cost_estimate is empty, set it to totalCost (from order if available)
      if ((!order.cost_estimate || Number(order.cost_estimate) === 0) && order.total_cost) {
        setEditBuffer(buf => ({ ...buf, cost_estimate: order.total_cost }));
      }
    }).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    async function fetchGrandTotal() {
      // Fetch signage items and BOQ items to compute grand total
      const items = await fetchSignageItems(orderId);
      const allBoqs = await fetchBoqItems(orderId);
      let totalCost = items.reduce((sum, item) => {
        const itemCost = allBoqs
          .filter(b => b.signage_item_id === item.id)
          .reduce((boqSum, b) => boqSum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
        return sum + itemCost;
      }, 0);
      // Fetch discount and gst_percent from order
      const orderOverview = await fetchOrderOverview(orderId);
      const discountVal = Number(orderOverview.discount) || 0;
      const gstVal = Number(orderOverview.gst_percent) || 18;
      const net = totalCost - discountVal;
      const gstAmount = net * (gstVal / 100);
      setDiscount(discountVal);
      setGstPercent(gstVal);
      setNetTotal(net);
      setGst(gstAmount);
      setGrandTotal(net + gstAmount);
    }
    fetchGrandTotal();
  }, [orderId]);

  const handleFieldChange = (field, value) => {
    setEditBuffer((prev) => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = async (field, label) => {
    if (!order) return;
    const newValue = editBuffer[field];
    if (newValue !== undefined && newValue !== order[field]) {
      try {
        await updateOrderDetails(orderId, { [field]: newValue });
        setOrder((prev) => ({ ...prev, [field]: newValue }));
        await addFeedNote({
          type: "feed",
          content: `${label} updated`,
          order_id: orderId,
        });
      } catch (err) {
        setError(`Failed to update ${label.toLowerCase()}`);
      }
    }
  };

  const statusColor = {
    new: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    hold: "bg-orange-100 text-orange-800",
    delayed: "bg-red-100 text-red-800",
    closed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-300 text-gray-500 line-through",
  };

  return (
    <>
      <div className="mb-4 w-full max-w-[900px] mx-auto bg-white rounded-xl shadow border border-gray-200 flex flex-row items-start justify-between px-6 py-3" style={{ minHeight: 0 }}>
        {/* Left: Title and client/job info */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-3xl md:text-4xl font-extrabold text-gray-400 tracking-tight mb-4" style={{ letterSpacing: 2, alignSelf: 'flex-start' }}>ESTIMATE</span>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm font-medium text-gray-700 mt-2">
            <div>CLIENT:</div>
            <div className="truncate font-semibold">{order?.customer_name || '-'}</div>
            <div>JOB NAME:</div>
            <div className="truncate relative group font-semibold">
              {editBuffer._editingJobName ? (
                <input
                  className="border rounded p-1 w-full text-xs bg-gray-50 focus:bg-white focus:border-yellow-400 transition"
                  value={editBuffer.name !== undefined ? editBuffer.name : order?.name || ''}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  onBlur={() => { handleFieldBlur('name', 'Job Name'); handleFieldChange('_editingJobName', false); }}
                  autoFocus
                />
              ) : (
                <span
                  className="cursor-pointer group-hover:underline group-hover:text-yellow-700"
                  onClick={() => handleFieldChange('_editingJobName', true)}
                  title="Click to edit job name"
                >
                  {order?.name || '-'}
                  <span className="ml-1 text-gray-400 group-hover:inline hidden">✏️</span>
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Center: Prominent Logo */}
        <div className="flex flex-col items-center justify-center min-w-[180px] mx-4 h-full" style={{ justifyContent: 'center' }}>
          <img src="/logo.png" alt="Company Logo" className="w-36 h-36 object-contain rounded-full border-4 border-yellow-400 shadow-lg" style={{ display: 'block', margin: 'auto' }} />
        </div>
        {/* Right: Editable fields and meta */}
        <div className="flex flex-col gap-1 min-w-[220px] items-end">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs w-full text-right items-end justify-end">
            <div className="font-medium">EST NO</div>
            <div className="pr-4">{order ? `${order.id}.${new Date(order?.due_date || Date.now()).getFullYear()}` : '-'}</div>
            <div className="font-medium">Date</div>
            <div className="pr-4">{order?.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
            <div className="font-medium">Status</div>
            <div className="pr-4">
              <select
                className={`p-1 rounded border font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-xs w-full text-right ${statusColor[editBuffer.status !== undefined ? editBuffer.status : order?.status || "new"]}`}
                style={{ fontFamily: 'inherit', minWidth: 90 }}
                value={editBuffer.status !== undefined ? editBuffer.status : order?.status || "new"}
                onChange={e => handleFieldChange("status", e.target.value)}
                onBlur={() => handleFieldBlur("status", "Status")}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="hold">On Hold</option>
                <option value="delayed">Delayed</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="font-medium">Due Date</div>
            <div className="pr-4">
              <input
                type="date"
                className="border rounded p-1 bg-gray-50 focus:bg-white focus:border-yellow-400 transition text-xs w-full text-right"
                value={editBuffer.due_date !== undefined ? editBuffer.due_date : order?.due_date?.split("T")[0] || ""}
                onChange={e => handleFieldChange("due_date", e.target.value)}
                onBlur={() => handleFieldBlur("due_date", "Due Date")}
              />
            </div>
            <div className="font-medium">Fab Type</div>
            <div className="pr-4">
              <input
                className="border rounded p-1 w-full bg-gray-50 focus:bg-white focus:border-yellow-400 transition text-xs text-right"
                value={editBuffer.fab_type !== undefined ? editBuffer.fab_type : order?.fab_type || ""}
                onChange={e => handleFieldChange("fab_type", e.target.value)}
                onBlur={() => handleFieldBlur("fab_type", "Fab Type")}
                placeholder="Fab Type"
              />
            </div>
            <div className="font-medium">GSTIN</div>
            <div className="pr-4">
              <input
                className="border rounded p-1 w-full bg-gray-50 focus:bg-white focus:border-yellow-400 transition text-xs text-right"
                value={customerGstin}
                onChange={e => setCustomerGstin(e.target.value)}
                onBlur={async (e) => {
                  const newValue = e.target.value.trim();
                  if (order?.customer?.id && newValue !== (order?.customer?.gstin || '')) {
                    await import("../services/orderDetailsService").then(m => m.updateCustomerDetails(order.customer.id, { gstin: newValue }));
                  }
                }}
                placeholder="GSTIN"
              />
            </div>
            <div className="font-medium">PAN</div>
            <div className="pr-4">
              <input
                className="border rounded p-1 w-full bg-gray-50 focus:bg-white focus:border-yellow-400 transition text-xs text-right"
                value={customerPan}
                onChange={e => setCustomerPan(e.target.value)}
                onBlur={async (e) => {
                  const newValue = e.target.value.trim();
                  if (order?.customer?.id && newValue !== (order?.customer?.pan || '')) {
                    await import("../services/orderDetailsService").then(m => m.updateCustomerDetails(order.customer.id, { pan: newValue }));
                  }
                }}
                placeholder="PAN"
              />
            </div>
            <div className="font-medium">PO Number</div>
            <div className="pr-4">
              <input
                className="border rounded p-1 w-full bg-gray-50 focus:bg-white focus:border-yellow-400 transition text-xs text-right"
                value={editBuffer.po_number !== undefined ? editBuffer.po_number : order?.po_number || ""}
                onChange={e => handleFieldChange("po_number", e.target.value)}
                onBlur={() => handleFieldBlur("po_number", "PO Number")}
                placeholder="PO Number"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="w-full max-w-[900px] mx-auto">
        <textarea
          className="w-full border rounded p-2 text-xs resize-none overflow-hidden bg-gray-50 focus:bg-white focus:border-yellow-400 transition mb-2"
          value={editBuffer.description !== undefined ? editBuffer.description : order?.description || ""}
          onChange={e => handleFieldChange("description", e.target.value)}
          onBlur={() => handleFieldBlur("description", "Description")}
          placeholder="Order Description"
          style={{ minHeight: 28, height: 'auto' }}
        />
        {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
      </div>
    </>
  );
}