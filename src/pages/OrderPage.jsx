import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getOrderById, updateStep } from '../services/orderService';
import './OrderPage.css';
import StepModal from '../components/StepModal';
import moment from "moment";
import GanttChart from "../components/GanttChart";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getOrderById(id);
      if (data.due_date) data.due_date = new Date(data.due_date);
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

  const handleDueDateChange = (date) => {
    setOrder(prev => ({ ...prev, due_date: date }));
  };

  const handleStatusChange = (e) => {
    setOrder(prev => ({ ...prev, status: e.target.value }));
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
    })
    .filter(Boolean);

  return (
    <div>
    <div className="orders-page">
      <h1>Order Details</h1>
      <div className="order-card">
        <h3>{customerName}</h3>
        <div className="flex items-center gap-2 mb-2">
          <label>Status:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
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
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#16a34a] inline-block"></span>
          <span>Closed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#2563eb] inline-block"></span>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#f97316] inline-block"></span>
          <span>On Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#dc2626] inline-block"></span>
          <span>Delayed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#e5e7eb] inline-block border"></span>
          <span>New</span>
        </div>
      </div>
    </div>
  );
}
