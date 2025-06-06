import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, updateStep, deleteOrder, deleteOrderFiles, updateOrder } from '../services/orderService';
import './OrderPage.css';
import StepModal from '../components/StepModal';
import moment from "moment";
import GanttChart from "../components/GanttChart";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addFeedNote } from "./orders/services/orderDetailsService";
import MiscellaneousTab from "./orders/tabs/MiscellaneousTab";
import SignageItemsTab from "./orders/tabs/SignageItemsTab";

export default function OrderPage() {
  
  const { id: rawId } = useParams();
  const id = parseInt(rawId, 10);
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [typedId, setTypedId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getOrderById(id);
      if (data && typeof data === 'object') {
        if (data.due_date) data.due_date = new Date(data.due_date);
        setOrder({
          id: data.id,
          status: data.status || "new",
          due_date: data.due_date,
          customer_id: data.customer_id
        });
        setCustomerName(data.customer_name);
        setSteps(data.steps || []);
      } else {
        console.warn('[OrderPage] Unexpected response format:', data);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      console.log('[OrderPage] Finished loading order with ID:', id);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    console.log("heelo")
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (!order?.id || !order.due_date) return;
    const patch = {
      status: order.status,
      due_date: order.due_date.toISOString().slice(0, 10),
    };
    updateOrder(order.id, patch).catch(err => {
      console.error('Failed to update order:', err);
    });
  }, [order]);

  const handleDueDateChange = async (date) => {
    setOrder(prev => ({ ...prev, due_date: date }));
    const user = await import('../supabaseClient').then(m => m.default.auth.getUser());
    await addFeedNote({
      type: 'feed',
      content: `Order due date changed to ${date.toLocaleDateString()} by ${user?.data?.user?.email || 'Unknown'}`,
      order_id: order.id,
      created_by: user?.data?.user?.id,
      created_by_name: user?.data?.user?.user_metadata?.full_name || '',
      created_by_email: user?.data?.user?.email || ''
    });
  };

  const handleStatusChange = async (e) => {
    setOrder(prev => ({ ...prev, status: e.target.value }));
    const user = await import('../supabaseClient').then(m => m.default.auth.getUser());
    await addFeedNote({
      type: 'feed',
      content: `Order status changed to ${e.target.value} by ${user?.data?.user?.email || 'Unknown'}`,
      order_id: order.id,
      created_by: user?.data?.user?.id,
      created_by_name: user?.data?.user?.user_metadata?.full_name || '',
      created_by_email: user?.data?.user?.email || ''
    });
  };

  const handleDateChange = async (task) => {
    const idx = steps.findIndex((_, i) => `${order.id}-step-${i}` === task.id);
    if (idx === -1) return;

    const step = steps[idx];
    const patch = {
      start_date: task.start.toISOString(),
      end_date: task.end.toISOString()
    };

    await updateStep(step.id, patch);

    const updatedSteps = [...steps];
    updatedSteps[idx] = { ...step, ...patch };
    setSteps(updatedSteps);
  };

  const handleTaskClick = (task, event) => {
    const idx = parseInt(task.id.split("-").pop());
    const offset = 16;
    const popupWidth = 320;
    const screenMidX = window.innerWidth / 2;

    const adjustedX = mousePos.x < screenMidX
      ? mousePos.x + offset
      : mousePos.x - popupWidth - offset;

    const adjustedY = Math.min(mousePos.y + offset, window.innerHeight - 350);

    setActiveStep({ ...steps[idx], popupPosition: { x: adjustedX, y: adjustedY } });
  };

  useEffect(() => {
    if (!order?.id) return;
    let cancelled = false;
    async function ensureDraftInvoice() {
      try {
        const supabaseClient = await import('../supabaseClient').then(m => m.default);
        // Fetch order to get customer_id
        const { data: orderData, error: orderError } = await supabaseClient
          .from('orders')
          .select('id, customer_id')
          .eq('id', order.id)
          .single();
        if (orderError || !orderData) return;
        // Only check for existing draft invoice for this order
        const { data: invoices, error: fetchError } = await supabaseClient
          .from('invoices')
          .select('id, order_id, status')
          .eq('order_id', order.id)
          .eq('status', 'Draft');
        if (fetchError) return; // fail silently
        if (!invoices || invoices.length === 0) {
          const { error: insertError } = await supabaseClient
            .from('invoices')
            .insert([{ order_id: order.id, customer_id: orderData.customer_id, status: 'Draft', created_at: new Date().toISOString() }]);
          if (insertError) return; // fail silently
        }
      } catch (err) {
        // fail silently
      }
    }
    ensureDraftInvoice();
    return () => { cancelled = true; };
  }, [order?.id]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!order) {
    console.log('[OrderPage] Order object is null:', order);
    return <p>Order not found.</p>;
  }

  const validatedTasks = steps
    .map((step, index) => {
      if (!step || typeof step !== 'object') {
        console.log('Skipped invalid step object at index', index);
        return null;
      }

      const parsedStart = moment(step.start_date);
      const parsedEnd = moment(step.end_date);

      if (!parsedStart.isValid() || !parsedEnd.isValid()) {
        console.log('Invalid date range in step:', step);
        return null;
      }

      const start = parsedStart.toDate();
      const end = parsedEnd.toDate();
      if (!(end > start)) {
        console.log('End date is not after start date in step:', step);
        return null;
      }

      const task = {
        id: `${order.id}-step-${index}`,
        name: step.description,
        start,
        end,
        progress: 0,
        type: "task",
        status: step.status || 'new',
        styles: {
          backgroundColor:
            step.status === "closed" ? "#16a34a" :
            step.status === "in progress" ? "#2563eb" :
            step.status === "hold" ? "#f97316" :
            step.status === "delayed" ? "#dc2626" :
            "#e5e7eb"
        }
      };

      return task;
    })
    .filter(Boolean);

  return (
    <div>
    <div className="orders-page">
      <h1>Order Details</h1>
      <div className="order-card" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <button onClick={() => setMenuOpen(prev => !prev)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>⋮</button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: '2rem', right: 0, background: '#fff', border: '1px solid #ccc', padding: '0.5rem', borderRadius: '4px', zIndex: 10, width: '220px' }}>
              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Delete Order
                </button>
              ) : (
                <>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    Type <strong>{order.id}</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    value={typedId}
                    onChange={(e) => setTypedId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                  <button
                    disabled={typedId !== String(order.id)}
                    onClick={async () => {
                      try {
                        const user = await import('../supabaseClient').then(m => m.default.auth.getUser());
                        await deleteOrderFiles(order.id);
                        await deleteOrder(order.id);
                        await addFeedNote({
                          type: 'feed',
                          content: `Order deleted by ${user?.data?.user?.email || 'Unknown'}`,
                          order_id: order.id,
                          created_by: user?.data?.user?.id,
                          created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                          created_by_email: user?.data?.user?.email || ''
                        });
                        navigate('/');
                      } catch (err) {
                        alert('Failed to delete order: ' + err.message);
                      }
                    }}
                    style={{
                      backgroundColor: typedId === String(order.id) ? '#dc2626' : '#ccc',
                      color: '#fff',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: typedId === String(order.id) ? 'pointer' : 'not-allowed',
                      width: '100%'
                    }}
                  >
                    Confirm Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <h3>{customerName}</h3>
        <div className="flex items-center gap-2 mb-2">
          <label>Status:</label>
          <select
            className={`border rounded px-2 py-1 text-sm ${
              order.status === "closed"
                ? "bg-green-100 text-green-800"
                : order.status === "in progress"
                ? "bg-blue-100 text-blue-800"
                : order.status === "hold"
                ? "bg-orange-100 text-orange-800"
                : order.status === "delayed"
                ? "bg-red-100 text-red-800"
                : "bg-gray-200 text-gray-700"
            }`}
            value={order.status}
            onChange={handleStatusChange}
          >
            <option value="new">New</option>
            <option value="in progress">In Progress</option>
            <option value="hold">On Hold</option>
            <option value="delayed">Delayed</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <label>Due Date:</label>
          <DatePicker
            selected={order.due_date}
            onChange={handleDueDateChange}
            dateFormat="dd/MM/yyyy"
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <GanttChart
          tasks={validatedTasks}
          steps={steps}
          setActiveStep={setActiveStep}
          onDateChange={handleDateChange}
          onTaskClick={handleTaskClick}
        />
      </div>
      {activeStep && (
        <StepModal
          step={activeStep}
          onClose={() => setActiveStep(null)}
          onSave={fetchData}
        />
      )}
    </div>
    <div className="flex flex-wrap text-sm mt-6 gap-4">
      <MiscellaneousTab orderId={order.id} />
      <SignageItemsTab orderId={order.id} />
    </div>
  </div>
  );
}