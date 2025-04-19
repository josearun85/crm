import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { format } from 'date-fns';
import CreateEnquiryModal from '../components/Enquiries/CreateEnquiryModal';

const statusColors = {
  new: 'bg-blue-200',
  in_progress: 'bg-yellow-200',
  converted: 'bg-green-200',
  closed: 'bg-gray-300',
  dropped: 'bg-red-200',
};

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchEnquiries = async () => {
    const { data, error } = await supabase
      .from('enquiries')
      .select(`
        id, date, channel, description, status, converted_at, order_id,
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
            </tr>
          </thead>
          <tbody>
            {enquiries.map((e) => (
              <tr key={e.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{format(new Date(e.date), 'dd-MMM-yyyy')}</td>
                <td className="p-2 text-blue-600 hover:underline cursor-pointer">
                  {e.customers?.name || '—'}
                </td>
                <td className="p-2">{e.channel}</td>
                <td className="p-2">{e.description}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded ${statusColors[e.status]}`}>{e.status}</span>
                </td>
                <td className="p-2">{e.converted_at ? format(new Date(e.converted_at), 'dd-MMM-yyyy') : '—'}</td>
                <td className="p-2">{e.order_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
