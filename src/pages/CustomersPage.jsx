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
              <tr key={customer.id}>
                <td colSpan="6" style={{ padding: 0 }}>
                  <CustomerCard customer={customer} />
                </td>
              </tr>
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
