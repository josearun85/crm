import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import InvoiceList from '../components/InvoiceList';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import './InvoicesPage.css';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [confirmedNumbers, setConfirmedNumbers] = useState([]); // <-- new
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('drafts');

  // Move fetchInvoices to top-level so it's available everywhere
  const fetchInvoices = async () => {
    setLoading(true);
    let query = supabase.from('invoices').select('*');
    if (activeTab === 'drafts') {
      query = query.eq('status', 'Draft');
    } else if (activeTab === 'pending') {
      query = query.eq('status', 'Confirmed');
    } else if (activeTab === 'past') {
      query = query.neq('status', 'Draft');
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setInvoices(data || []);
    // If Drafts tab, also fetch confirmed invoice numbers
    if (activeTab === 'drafts') {
      const { data: confirmed, error: confErr } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('status', 'Confirmed');
      if (!confErr && confirmed) {
        setConfirmedNumbers(confirmed.map(inv => inv.invoice_number).filter(n => /^\d+$/.test(n)).map(n => parseInt(n, 10)));
      } else {
        setConfirmedNumbers([]);
      }
    } else {
      setConfirmedNumbers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeTab]);

  const handleCreateInvoice = () => setShowCreateModal(true);

  const handleModalCreate = async (invoiceData) => {
    setShowCreateModal(false);
    const { data, error } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single();
    if (error) {
      alert('Error creating invoice: ' + error.message);
      return;
    }
    setInvoices((prev) => [data, ...prev]);
  };

  const handleDeleteInvoice = (id) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  return (
    <div className="invoices-page-wrapper" style={{ fontSize: '0.93rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="invoice-tabs">
          <button
            className={activeTab === 'drafts' ? 'active' : ''}
            onClick={() => setActiveTab('drafts')}
          >
            Drafts
          </button>
          <button
            className={activeTab === 'pending' ? 'active' : ''}
            onClick={() => setActiveTab('pending')}
          >
            Pending Payment
          </button>
          <button
            className={activeTab === 'past' ? 'active' : ''}
            onClick={() => setActiveTab('past')}
          >
            Past Invoices
          </button>
        </div>
        <button
          onClick={handleCreateInvoice}
          style={{ background: '#1976d2', color: 'white', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}
        >
          + Create Invoice
        </button>
      </div>
      {showCreateModal && (
        <CreateInvoiceModal
          onCreate={handleModalCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {loading ? (
        <p>Loading invoices...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <InvoiceList invoices={invoices} confirmedNumbers={confirmedNumbers} onDelete={handleDeleteInvoice} onReorder={fetchInvoices} />
      )}
    </div>
  );
}
