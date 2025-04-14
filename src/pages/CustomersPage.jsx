import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import CustomerCard from '../components/CustomerCard';
import AddCustomerForm from '../components/AddCustomerForm';
import './CustomersPage.css';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('customers')
      .select('id,name,phone,email,sales_stage,follow_up_on,orders:orders(id,status,due_date)');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data);
    }

    setLoading(false);
  };

  const goToGantt = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  const createOrderWithSteps = async (customerId) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{ customer_id: customerId, due_date: dueDate.toISOString().slice(0, 10) }])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return;
    }

    const stepNames = [
      'Site Visit',
      'Design approval',
      'Cost estimate',
      'Advance payment',
      'Letter cutting order',
      'Template specification',
      'Letter fixing preparation',
      'Letter placement'
    ];

    const today = new Date();
    const steps = stepNames.map((name, index) => {
      const start = new Date(today);
      start.setDate(start.getDate() + index * 2);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return {
        order_id: order.id,
        description: name,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        status: 'OPEN',
        delayed: false,
        files: [],
        comments: []
      };
    });

    const { error: stepError } = await supabase.from('order_steps').insert(steps);
    if (stepError) {
      console.error('Error inserting default steps:', stepError);
      return;
    }

    goToGantt(order.id);
  };

  return (
    <div className="customers-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Customers</h1>
        <button onClick={() => setShowForm(true)}>+ Add Customer</button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Sales Stage</th>
              <th>Orders</th>
              <th>Follow Up</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <React.Fragment key={customer.id}>
                <tr>
                  <td>{customer.name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.sales_stage}</td>
                  <td>{customer.orders?.length || 0}</td>
                  <td>{customer.follow_up_on || '-'}</td>
                </tr>
                {customer.orders?.map(order => {
                  const statusColorMap = {
                    NEW: '#fff9c4',
                    HOLD: '#ffe0b2',
                    CLOSED: '#c8e6c9',
                    DELAYED: '#ffcdd2',
                  };
                  const bgColor = statusColorMap[order.status] || '#f5f5f5';

                  return (
                    <tr key={`order-${order.id}`}>
                      <td colSpan="6" style={{ paddingLeft: '2rem' }}>
                        <div
                          style={{
                            backgroundColor: bgColor,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '10px'
                          }}
                        >
                          <div
                            style={{ fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                            onClick={() => goToGantt(order.id)}
                          >
                            Order #{order.id} – {order.status}
                          </div>
                          <div style={{ fontSize: '0.85rem', marginTop: '4px', color: '#333' }}>
                            Due: {order.due_date}<br />
                            Current Step: <em>(fetching...)</em>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan="6" style={{ paddingLeft: '2rem' }}>
                    <button
                      onClick={() => createOrderWithSteps(customer.id)}
                      style={{
                        background: '#2196f3',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        marginTop: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      + Add Order
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
      <AddCustomerForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCustomerAdded={fetchData}
      />
    </div>
  );
}
