import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getOrderById, updateStep } from '../services/orderService';
import './OrderPage.css';
import StepModal from '../components/StepModal';
import moment from "moment";
import GanttChart from "../components/GanttChart";

export default function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getOrderById(id);
      setOrder({
        id: data.id,
        status: data.status,
        due_date: data.due_date,
        customer_id: data.customer_id
      });
      setCustomerName(data.customer_name);
      setSteps(data.steps || []);
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setLoading(false);
    }
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
    const x = event?.clientX || window.innerWidth / 2;
    const y = event?.clientY || window.innerHeight / 2;
    console.log("Modal click position", { x, y, step: steps[idx] });
    setActiveStep({ ...steps[idx], popupPosition: { x, y } });
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!order) {
    return <p>Order not found.</p>;
  }

  const validatedTasks = steps
    .map((step, index) => {
      const parsedStart = moment(step.start_date);
      const parsedEnd = moment(step.end_date);
      if (!parsedStart.isValid() || !parsedEnd.isValid()) return null;

      const start = parsedStart.toDate();
      const end = parsedEnd.toDate();
      if (!(end > start)) return null;

      return {
        id: `${order.id}-step-${index}`,
        name: step.description,
        start,
        end,
        progress: 0,
        type: "task",
        status: step.status || 'new', // add this
        styles: {
          backgroundColor:
            step.status === "closed" ? "#16a34a" :
            step.status === "in progress" ? "#2563eb" :
            step.status === "hold" ? "#f97316" :
            step.status === "delayed" ? "#dc2626" :
            "#e5e7eb"
        }
      };
    })
    .filter(Boolean);

  return (
    <div className="orders-page">
      <h1>Order Details</h1>
      <div className="order-card">
        <h3>{customerName}</h3>
        <p>Status: <strong>{order.status}</strong></p>
        <p>Due Date: {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'N/A'}</p>
        <GanttChart
          tasks={validatedTasks}
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
  );
}
