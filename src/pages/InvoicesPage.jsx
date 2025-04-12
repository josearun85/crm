import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import supabase from '../supabaseClient';
import './InvoicesPage.css';

export default function InvoicesPage() {
  const { id } = useParams(); // invoice ID from URL
  const printRef = useRef();
  const [invoice, setInvoice] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const handlePrint = () => window.print();
  const handleEmail = () => alert('This would trigger email functionality.');

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (invoiceError) {
        console.error('Invoice fetch error:', invoiceError);
        setLoading(false);
        return;
      }

      setInvoice(invoiceData);

      const [{ data: customerData }, { data: orderData }] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('id', invoiceData.customer_id)
          .single(),
        supabase
          .from('orders')
          .select('id, name')
          .eq('id', invoiceData.order_id)
          .single()
      ]);

      setCustomer(customerData);
      setOrder(orderData);
      setLoading(false);
    };

    fetchInvoice();
  }, [id]);

  if (loading || !invoice || !customer || !order) return <p>Loading...</p>;

  const {
    items = [],
    date,
    due_date,
    subtotal,
    tax,
    total,
    id: invoiceId,
    gst_breakup = {}
  } = invoice;

  return (
    <div className="invoice-wrapper">
      <div className="invoice-toolbar">
        <button onClick={handlePrint}>🖨️ Print / PDF</button>
        <button onClick={handleEmail}>📧 Email to Customer</button>
      </div>

      <div className="invoice" ref={printRef}>
        <header>
          <h1>Sign Company</h1>
          <p>123 Banner Street, Bangalore</p>
          <p>GSTIN: 29ABCDE1234F2Z5</p>
          <p>PAN: ABCDE1234F</p>
          <p>+91 98765 43210 | info@citysigns.in</p>
        </header>

        <section className="invoice-details">
          <div>
            <h2>Invoice To:</h2>
            <p><strong>{customer.name}</strong></p>
            <p>{customer.email}</p>
            <p>{customer.phone}</p>
            <p>GSTIN: {customer.gstin || 'N/A'}</p>
            <p>PAN: {customer.pan || 'N/A'}</p>
          </div>
          <div>
            <h2>Invoice #{invoiceId}</h2>
            <p>Order: {order.name || order.id}</p>
            <p>Date: {new Date(date).toLocaleDateString()}</p>
            <p>Due: {new Date(due_date).toLocaleDateString()}</p>
          </div>
        </section>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.description}</td>
                <td>{item.qty}</td>
                <td>₹ {item.rate}</td>
                <td>₹ {item.qty * item.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="invoice-total">
          <p><strong>Subtotal:</strong> ₹ {subtotal}</p>
          {gst_breakup?.cgst && (
            <>
              <p><strong>CGST (9%):</strong> ₹ {gst_breakup.cgst}</p>
              <p><strong>SGST (9%):</strong> ₹ {gst_breakup.sgst}</p>
            </>
          )}
          {gst_breakup?.igst && (
            <p><strong>IGST (18%):</strong> ₹ {gst_breakup.igst}</p>
          )}
          <p><strong>Tax Total:</strong> ₹ {tax}</p>
          <h3><strong>Grand Total:</strong> ₹ {total}</h3>
        </section>

        <footer>
          <p>Thank you for your business!</p>
        </footer>
      </div>
    </div>
  );
}