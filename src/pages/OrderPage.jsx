import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import supabase from '../supabaseClient';
import './OrderPage.css';

export default function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);

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
          {order.steps && order.steps.map((step, index) => (
            <div
              key={index}
              className={`gantt-step ${step.status}`}
              title={`${step.name}: ${step.status}`}
              style={{
                width: `${100 / order.steps.length}%`
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
