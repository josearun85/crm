import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import CreateEnquiryModal from '../components/Enquiries/CreateEnquiryModal';

const statusColors = {
  new: 'bg-blue-200',
  in_progress: 'bg-yellow-200',
  converted: 'bg-green-200',
  closed: 'bg-gray-300',
  dropped: 'bg-red-200',
};

export default function EnquiriesPage() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchEnquiries = async () => {
    const { data, error } = await supabase
      .from('enquiries')
      .select(`
        id, date, channel, description, status, converted_at, order_id, follow_up_on,
        customers ( id, name )
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching enquiries:', error);
    } else {
      setEnquiries(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Enquiries</h1>
      <button onClick={() => setShowModal(true)} className="mb-4 bg-blue-600 text-white px-4 py-2 rounded">
        + Create Enquiry
      </button>
      <CreateEnquiryModal show={showModal} onClose={() => setShowModal(false)} onCreated={() => fetchEnquiries()} />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Channel</th>
              <th className="p-2">Description</th>
              <th className="p-2">Status</th>
              <th className="p-2">Converted</th>
              <th className="p-2">Order ID</th>
              <th className="p-2">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((e) => (
              <tr key={e.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{format(new Date(e.date), 'dd-MMM-yyyy')}</td>
                <td className="p-2 text-blue-600 hover:underline cursor-pointer">
                  {e.customers?.name || '—'}
                </td>
                <td className="p-2">
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1"
                    defaultValue={e.channel || ''}
                    onBlur={async (ev) => {
                      const value = ev.target.value;
                      if (value !== e.channel) {
                        await supabase.from('enquiries').update({ channel: value }).eq('id', e.id);
                        fetchEnquiries();
                      }
                    }}
                    onKeyDown={async (ev) => {
                      if (ev.key === 'Enter') ev.target.blur();
                    }}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1"
                    defaultValue={e.description || ''}
                    onBlur={async (ev) => {
                      const value = ev.target.value;
                      if (value !== e.description) {
                        await supabase.from('enquiries').update({ description: value }).eq('id', e.id);
                        fetchEnquiries();
                      }
                    }}
                    onKeyDown={async (ev) => {
                      if (ev.key === 'Enter') ev.target.blur();
                    }}
                  />
                </td>
                <td className="p-2">
                  <select
                    value={e.status}
                    onChange={async (ev) => {
                      const newStatus = ev.target.value;
                      let orderId = e.order_id;
                      if (newStatus === 'converted' && !e.converted_at) {
                        // Fetch customer_id for this enquiry
                        const { data: enquiryDetail, error: enquiryError } = await supabase
                          .from('enquiries')
                          .select('customer_id')
                          .eq('id', e.id)
                          .single();

                        if (enquiryError || !enquiryDetail) {
                          alert('Failed to fetch enquiry details');
                          return;
                        }

                        // Create order with both enquiry_id and customer_id
                        const { data: orderData, error: orderErr } = await supabase
                          .from('orders')
                          .insert({
                            enquiry_id: e.id,
                            customer_id: enquiryDetail.customer_id,
                            status: 'pending',
                            gst_percent: 18
                          })
                          .select()
                          .single();

                        if (orderErr || !orderData) {
                          console.error('Order insert error:', orderErr);
                          alert(orderErr?.message || 'Failed to create order');
                          return;
                        }

                        orderId = orderData.id;

                        await supabase.from('enquiries').update({
                          status: newStatus,
                          converted_at: new Date().toISOString(),
                          order_id: orderId
                        }).eq('id', e.id);

                        fetchEnquiries();
                        navigate(`/orders/${orderId}`);
                      } else {
                        await supabase.from('enquiries').update({ status: newStatus }).eq('id', e.id);
                        fetchEnquiries();
                      }
                    }}
                    className={`px-2 py-1 rounded ${statusColors[e.status]}`}
                  >
                    {Object.keys(statusColors).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">{e.converted_at ? format(new Date(e.converted_at), 'dd-MMM-yyyy') : '—'}</td>
                <td className="p-2">{e.order_id || '—'}</td>
                <td className="p-2">
                  <input
                    type="date"
                    className="border border-gray-200 rounded px-2 py-1"
                    defaultValue={e.follow_up_on ? new Date(e.follow_up_on).toISOString().split('T')[0] : ''}
                    onBlur={async (ev) => {
                      const value = ev.target.value || null;
                      const current = e.follow_up_on ? new Date(e.follow_up_on).toISOString().split('T')[0] : '';
                      if (value !== current) {
                        await supabase.from('enquiries').update({ follow_up_on: value }).eq('id', e.id);
                        fetchEnquiries();
                      }
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
