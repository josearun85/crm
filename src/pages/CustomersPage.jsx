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
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('customers')
      .select('id,name,phone,email,address,sales_stage,follow_up_on,gstin,pan,orders:orders(id,status,due_date,created_at)');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data);
      console.log('[CustomersPage] Order status for each customer:', data.map(c => ({ customer: c.name, orders: c.orders.map(o => o.status) })));
    }

    setLoading(false);
  };

  const goToGantt = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="customers-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Customers</h1>
        <button
          onClick={() => setShowForm(true)}
          style={{
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          + Add Customer
        </button>
      </div>
      <div style={{ margin: '18px 0 12px 0', maxWidth: 340 }}>
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
        />
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="customers-table">
          <tbody>
            {customers
              .slice() // copy array to avoid mutating state
              .sort((a, b) => {
                // Find latest order date for each customer (fallback to 0 if no orders)
                const aLatest = a.orders && a.orders.length
                  ? Math.max(...a.orders.map(o => o.created_at ? new Date(o.created_at).getTime() : 0))
                  : 0;
                const bLatest = b.orders && b.orders.length
                  ? Math.max(...b.orders.map(o => o.created_at ? new Date(o.created_at).getTime() : 0))
                  : 0;
                return bLatest - aLatest;
              })
              .filter(c => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return (
                  String(c.name || '').toLowerCase().includes(q) ||
                  String(c.phone || '').toLowerCase().includes(q) ||
                  String(c.email || '').toLowerCase().includes(q)
                );
              })
              .map(customer => (
                <tr key={customer.id}>
                  <td style={{ padding: '1rem' }}>
                    <CustomerCard customer={customer} onOrderUpdated={fetchData} onAddOrder={async () => {
                      const dueDate = new Date();
                      dueDate.setDate(dueDate.getDate() + 14);

                      const { data: order, error: orderError } = await supabase
                        .from('orders')
                        .insert([{ customer_id: customer.id, due_date: dueDate.toISOString().slice(0, 10) }])
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
                          status: 'NEW',
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

                      navigate(`/orders/${order.id}`);
                    }} />
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
