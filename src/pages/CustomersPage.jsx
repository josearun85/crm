import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import CustomerCard from '../components/CustomerCard';
import AddCustomerForm from '../components/AddCustomerForm';
import './CustomersPage.css';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('customers')
      .select('id,name,phone,email,sales_stage,follow_up_on,orders(id,status,due_date)');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data);
    }

    setLoading(false);
  };

  const goToGantt = (orderId) => {
    // Navigation logic to order gantt view
    console.log("Navigate to order:", orderId);
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
                <tr onClick={() => setSelectedCustomerId(
                  selectedCustomerId === customer.id ? null : customer.id
                )}>
                  <td>{customer.name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.email}</td>
                  <td>{customer.sales_stage}</td>
                  <td>{customer.orders?.filter(o => o.status !== 'completed').length || 0}</td>
                  <td>{customer.follow_up_on}</td>
                </tr>
                {selectedCustomerId === customer.id && customer.orders?.some(o => o.status !== 'completed') && (
                  <tr>
                    <td colSpan="6">
                      <div className="order-list">
                        {customer.orders
                          .filter(order => order.status !== 'completed')
                          .map(order => (
                            <div key={order.id} onClick={() => goToGantt(order.id)} style={{ cursor: 'pointer', padding: '4px 0' }}>
                              <strong>Order #{order.id}</strong> – {order.status} (Due: {order.due_date})
                            </div>
                          ))
                        }
                      </div>
                    </td>
                  </tr>
                )}
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
