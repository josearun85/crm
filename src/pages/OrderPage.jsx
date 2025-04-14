import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import supabase from '../supabaseClient';
import './OrderPage.css';
import StepModal from '../components/StepModal';

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
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      setLoading(false);
      return;
    }

    setOrder(orderData);

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('name')
      .eq('id', orderData.customer_id)
      .single();

    if (!customerError && customerData) {
      setCustomerName(customerData.name);
    }

    const { data: stepsData, error: stepsError } = await supabase
      .from('order_steps')
      .select('*')
      .eq('order_id', orderData.id);

    if (!stepsError) {
      setSteps(stepsData);
    }

    setLoading(false);
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!order) {
    return <p>Order not found.</p>;
  }

  return (
    <div className="orders-page">
      <h1>Order Details</h1>
      <div className="order-card">
        <h3>{customerName}</h3>
        <p>Status: <strong>{order.status}</strong></p>
        <p>Due Date: {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'N/A'}</p>
        <div className="gantt-bar">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`gantt-step ${step.status}`}
              title={`${step.description}: ${step.status}`}
              onClick={() => setActiveStep(step)}
              style={{
                width: `${100 / steps.length}%`
              }}
            >
              {step.description}
            </div>
          ))}
        </div>
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
