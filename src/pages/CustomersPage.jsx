import React, { useEffect, useState } from 'react';
import { getCustomers } from '../services/customerService';
import CustomerCard from '../components/CustomerCard';
import AddCustomerModal from '../components/AddCustomerForm';
import './CustomersPage.css';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const data = await getCustomers();
    setCustomers(data);
  };

  const handleAddCustomer = (newCustomer) => {
    setCustomers([...customers, newCustomer]);
  };

  return (
    <div className="customers-page">
      <div className="customers-header">
        <h1>Customers</h1>
        <button onClick={() => setShowModal(true)}>+ Add Customer</button>
      </div>
      <div className="customers-list">
        {customers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
      {showModal && (
        <AddCustomerModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddCustomer}
        />
      )}
    </div>
  );
}
