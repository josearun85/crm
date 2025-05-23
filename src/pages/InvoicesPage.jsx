import React, { useEffect, useMemo, useState } from 'react';
import supabase from '../supabaseClient';
import InvoiceList from '../components/InvoiceList';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import './InvoicesPage.css';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Tab and pagination state
  const [activeTab, setActiveTab] = useState('drafts');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Filtered invoice lists for each tab
  const draftInvoices = useMemo(() => invoices.filter(inv => inv.status === 'Draft'), [invoices]);
  const pendingInvoices = useMemo(() => invoices.filter(inv => inv.status === 'Confirmed' && inv.payment_status !== 'Paid'), [invoices]);
  const pastInvoices = useMemo(() => invoices.filter(inv => inv.status !== 'Draft' && (inv.status !== 'Confirmed' || inv.payment_status === 'Paid')), [invoices]);

  // Pagination logic for pending and past
  const paginatedPending = useMemo(() => pendingInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [pendingInvoices, page]);
  const paginatedPast = useMemo(() => pastInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [pastInvoices, page]);
  const totalPendingPages = Math.ceil(pendingInvoices.length / PAGE_SIZE);
  const totalPastPages = Math.ceil(pastInvoices.length / PAGE_SIZE);

  // Reset page to 1 when tab changes
  useEffect(() => { setPage(1); }, [activeTab]);

  // Fetch all invoices, reverse chronological order
  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Handler to create a new draft invoice
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

  // Handler to remove deleted invoice from UI
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
        <>
          {activeTab === 'drafts' && <InvoiceList invoices={draftInvoices} onDelete={handleDeleteInvoice} onReorder={fetchInvoices} />}
          {activeTab === 'pending' && <>
            <InvoiceList invoices={pendingInvoices} onDelete={handleDeleteInvoice} />
            {totalPendingPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 8 }}>
                <button onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</button>
                <span>Page {page} of {totalPendingPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={page === totalPendingPages}>Next</button>
              </div>
            )}
          </>}
          {activeTab === 'past' && <>
            <InvoiceList invoices={paginatedPast} onDelete={handleDeleteInvoice} />
            {totalPastPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 8 }}>
                <button onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</button>
                <span>Page {page} of {totalPastPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={page === totalPastPages}>Next</button>
              </div>
            )}
          </>}
        </>
      )}
    </div>
  );
}
