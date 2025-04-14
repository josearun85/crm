import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import CustomerCard from '../components/CustomerCard';
import './CustomersPage.css';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('customers')
      .select('*, orders(*)');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data);
    }

    setLoading(false);
  };

  return (
    <div className="customers-page">
      <h1>Customers</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="customers-list">
          {customers.map(customer => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}
