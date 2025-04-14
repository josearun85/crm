import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import CustomerCard from '../components/CustomerCard';
import AddCustomerForm from '../components/AddCustomerForm';
import './CustomersPage.css';

export default function CustomersPage() {
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
      .select('id,name,phone,email,orders(id,status,due_date)');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data);
    }

    setLoading(false);
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
        <div className="customers-list">
          {customers.map(customer => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
      <AddCustomerForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCustomerAdded={fetchData}
      />
    </div>
  );
}
