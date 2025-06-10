import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase from '../supabaseClient';
import CustomerCard from '../components/CustomerCard';
import AddCustomerForm from '../components/AddCustomerForm';
import './CustomersPage.css';

export default function CustomersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const customerRefs = useRef({});

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch all notes for all orders after customers are loaded
  const [orderNotesMap, setOrderNotesMap] = useState({}); // { orderId: latestNoteDate }
  useEffect(() => {
    async function fetchOrderNotesForAllOrders() {
      if (!customers || customers.length === 0) return;
      const allOrderIds = customers.flatMap(c => c.orders?.map(o => o.id) || []);
      if (allOrderIds.length === 0) return;
      const { data: notes, error } = await supabase
        .from('notes')
        .select('order_id, created_at')
        .in('order_id', allOrderIds)
        .order('created_at', { ascending: false });
      if (error) return;
      // Map: orderId -> latest created_at
      const map = {};
      notes.forEach(note => {
        if (!map[note.order_id] || new Date(note.created_at) > new Date(map[note.order_id])) {
          map[note.order_id] = note.created_at;
        }
      });
      setOrderNotesMap(map);
    }
    fetchOrderNotesForAllOrders();
  }, [customers]);

  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('customers')
      .select('id,name,phone,email,address,sales_stage,follow_up_on,gstin,pan,about,primary_stakeholder,secondary_stakeholder,primary_phone,secondary_phone,primary_email,secondary_email,referral_source,orders:orders(id,status,due_date,created_at)');

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

  const scrollToCustomer = (customerId) => {
    setSelectedCustomer(customerId);
    const element = customerRefs.current[customerId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Sort customers by last update (latest feed note or order updated_at)
  const getCustomerLastUpdate = (customer) => {
    if (!customer.orders || customer.orders.length === 0) return null;
    let latest = null;
    customer.orders.forEach(order => {
      const feedDate = orderNotesMap[order.id];
      const updated = [order.updated_at, feedDate].filter(Boolean).map(d => new Date(d));
      const orderLatest = updated.length ? new Date(Math.max(...updated)) : null;
      if (!latest || (orderLatest && orderLatest > latest)) latest = orderLatest;
    });
    return latest;
  };

  // Sort customers by last update descending (most recent first), but customers with no orders always at the bottom
  const sortedCustomers = [...customers].sort((a, b) => {
    // Customers with no orders go to the bottom
    if ((!a.orders || a.orders.length === 0) && (!b.orders || b.orders.length === 0)) return 0;
    if (!a.orders || a.orders.length === 0) return 1;
    if (!b.orders || b.orders.length === 0) return -1;
    // Both have orders, sort by last update
    const aDate = getCustomerLastUpdate(a);
    const bDate = getCustomerLastUpdate(b);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return bDate - aDate;
  });

  const filteredCustomers = sortedCustomers
    .slice() // copy array to avoid mutating state
    .filter(c => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.phone || '').toLowerCase().includes(q) ||
        String(c.email || '').toLowerCase().includes(q)
      );
    });

  return (
    <div className="customers-page">
      <div className="customers-layout">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="left-panel-header">
            <h2>Customers</h2>
           
          </div>
          
          <div className="search-container">
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="customer-list">
            {loading ? (
              <p>Loading...</p>
            ) : (
              sortedCustomers.map(customer => (
                <div
                  key={customer.id}
                  className={`customer-list-item ${selectedCustomer === customer.id ? 'selected' : ''}`}
                  onClick={() => scrollToCustomer(customer.id)}
                >
                  <div className="customer-name">{customer.name}</div>
                  <div className="customer-info">
                    {customer.phone && <span>{customer.phone}</span>}
                    {customer.email && <span>{customer.email}</span>}
                  </div>
                  {customer.sales_stage && <span className="sales-stage">{customer.sales_stage}</span>}
                  {customer.orders && customer.orders.length > 0 && (
                    <div className="order-count">{customer.orders.length} order{customer.orders.length !== 1 ? 's' : ''}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="right-panel-header">
            <h1>Customer Details</h1>
          </div>
          
          <div className="customer-cards">
            {loading ? (
              <p>Loading...</p>
            ) : (
              filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  ref={el => customerRefs.current[customer.id] = el}
                  className="customer-card-container"
                >
                  <CustomerCard 
                    customer={customer} 
                    onOrderUpdated={fetchData} 
                    onAddOrder={async () => {
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
                    }} 
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AddCustomerForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCustomerAdded={fetchData}
      />
    </div>
  );
}
