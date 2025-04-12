import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import './OrdersPage.css';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, name');

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*');

    if (customerError || orderError) {
      console.error('Error fetching data:', customerError || orderError);
    } else {
      setCustomers(customerData);
      setOrders(orderData);
    }
    setLoading(false);
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown';
  };

  return (
    <div className="orders-page">
      <h1>Orders</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <h3>{getCustomerName(order.customer_id)}</h3>
              <p>Status: <strong>{order.status}</strong></p>
              <p>Due Date: {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'N/A'}</p>
              {/* Gantt preview section */}
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
          ))}
        </div>
      )}
    </div>
  );
}
