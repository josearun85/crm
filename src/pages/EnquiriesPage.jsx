import React from 'react';
import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import CreateEnquiryModal from '../components/Enquiries/CreateEnquiryModal';
import { ChatBubbleLeftEllipsisIcon, PlusCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { uploadEnquiryFile, createFileNote, deleteEnquiryFile } from '../services/enquiriesService';
import { addFeedNote } from "./orders/services/orderDetailsService";

const statusColors = {
  new: 'bg-blue-200',
  in_progress: 'bg-yellow-200',
  converted: 'bg-green-200',
  closed: 'bg-gray-300',
  dropped: 'bg-red-200',
};

export default function EnquiriesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [noteCounts, setNoteCounts] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [notesByEnquiry, setNotesByEnquiry] = useState({});
  const [editingNotes, setEditingNotes] = useState({});
  const [search, setSearch] = useState("");

  // Get highlight param from URL
  const params = new URLSearchParams(location.search);
  const highlightId = params.get('highlight');

  const fetchNoteCounts = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('enquiry_id');

    if (!error && data) {
      const countMap = {};
      data.forEach(({ enquiry_id }) => {
        countMap[enquiry_id] = (countMap[enquiry_id] || 0) + 1;
      });
      setNoteCounts(countMap);
    }
  };

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
    fetchNoteCounts();
  }, []);

  const toggleNotes = (enquiryId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [enquiryId]: !prev[enquiryId]
    }));
    if (!notesByEnquiry[enquiryId]) {
      refreshNotes(enquiryId);
    }
  };

  const refreshNotes = async (enquiryId) => {
    const { data, error } = await supabase
      .from('notes')
    .select('id, content, file_url, file_path, type, created_at, updated_at, created_by_email')
      .eq('enquiry_id', enquiryId)
      .order('created_at', { ascending: false });
    if (!error) {
      setNotesByEnquiry(prev => ({ ...prev, [enquiryId]: data }));
    }
  };

  const handleAddNote = async (enquiryId) => {
    const user = await supabase.auth.getUser();
    const { data: newNote, error } = await supabase.from('notes').insert([{
      enquiry_id: enquiryId,
      content: '',
      type: 'internal',
      created_by: user?.data?.user?.id || null
    }]).select().single();

    if (!error && newNote) {
      setExpandedNotes(prev => ({ ...prev, [enquiryId]: true }));
      refreshNotes(enquiryId);
      fetchNoteCounts();
    } else {
      toast.error('Failed to create note');
    }
  };

  const handleUploadFileLocal = async (enquiryId) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { filePath, fileUrl } = await uploadEnquiryFile(file, enquiryId);

        const user = await supabase.auth.getUser();
        await createFileNote(
          enquiryId,
          file.name,
          filePath,
          user?.data?.user?.id || null,
          user?.data?.user?.email || null,
          fileUrl
        );
        await addFeedNote({
          type: 'feed',
          content: `File uploaded by ${user?.data?.user?.email || 'Unknown'}: ${file.name}`,
          enquiry_id: enquiryId,
          created_by: user?.data?.user?.id,
          created_by_name: user?.data?.user?.user_metadata?.full_name || '',
          created_by_email: user?.data?.user?.email || ''
        });
        toast.success("File uploaded");
        refreshNotes(enquiryId);
        fetchNoteCounts();
      } catch (err) {
        console.error("File upload failed", err);
        toast.error("File upload failed");
      }
    };
    input.click();
  };


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Enquiries</h1>
      <button onClick={() => setShowModal(true)} className="mb-4 bg-blue-600 text-white px-4 py-2 rounded">
        + Create Enquiry
      </button>
      <CreateEnquiryModal show={showModal} onClose={() => setShowModal(false)} onCreated={() => fetchEnquiries()} />
      <div style={{ display: 'inline-block', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 32, margin: '0 auto' }}>
        <div style={{ margin: '0 0 12px 0', maxWidth: 340 }}>
          <input
            type="text"
            placeholder="Search enquiries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
          />
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Description</th>
                <th className="p-2">Channel</th>
                <th className="p-2">Status</th>
                <th className="p-2">Converted</th>
                <th className="p-2">Order ID</th>
                <th className="p-2">Follow-up</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {enquiries
                .filter(e => {
                  const q = search.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    e.customers?.name?.toLowerCase().includes(q) ||
                    e.description?.toLowerCase().includes(q) ||
                    e.channel?.toLowerCase().includes(q) ||
                    e.status?.toLowerCase().includes(q)
                  );
                })
                .map((e) => (
                  <React.Fragment key={e.id}>
                    <tr
                      className={`border-b hover:bg-gray-50 ${highlightId == e.id ? 'bg-yellow-100 border-l-8 border-yellow-400 shadow-2xl' : ''}`}
                      ref={el => {
                        if (highlightId == e.id && el) {
                          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                        }
                      }}
                    >
                      <td className="p-2">{format(new Date(e.date), 'dd-MMM-yyyy')}</td>
                      <td className="p-2 text-blue-600 hover:underline cursor-pointer">
                        {e.customers?.id ? (
                          <span
                            style={{ cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
                            onClick={() => navigate(`/customers?selected=${e.customers.id}`)}
                            title="View customer details"
                          >
                            {e.customers.name}
                          </span>
                        ) : (
                          e.customers?.name || '—'
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          className="w-full border border-gray-200 rounded px-2 py-1"
                          defaultValue={e.description || ''}
                          onBlur={async (ev) => {
                            const value = ev.target.value;
                            if (value !== e.description) {
                              await supabase.from('enquiries').update({ description: value }).eq('id', e.id);
                              const user = await supabase.auth.getUser();
                              await addFeedNote({
                                type: 'feed',
                                content: `Description updated by ${user?.data?.user?.email || 'Unknown'}`,
                                enquiry_id: e.id,
                                created_by: user?.data?.user?.id,
                                created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                created_by_email: user?.data?.user?.email || ''
                              });
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
                        <select
                          value={e.status}
                          onChange={async (ev) => {
                            const newStatus = ev.target.value;
                            let orderId = e.order_id;
                            const user = await supabase.auth.getUser();
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
                              
                              // Insert only the design step
                              const designStep = {
                                order_id: orderId,
                                type: 'design',
                                description: 'Design',
                                status: 'pending',
                                start_date: new Date().toISOString().slice(0, 10),
                                end_date: new Date().toISOString().slice(0, 10)
                              };
                              await supabase.from('order_steps').insert([designStep]);

                              await supabase.from('enquiries').update({
                                status: newStatus,
                                converted_at: new Date().toISOString(),
                                order_id: orderId
                              }).eq('id', e.id);

                              await addFeedNote({
                                type: 'feed',
                                content: `Enquiry converted to order by ${user?.data?.user?.email || 'Unknown'}`,
                                enquiry_id: e.id,
                                order_id: orderId,
                                created_by: user?.data?.user?.id,
                                created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                created_by_email: user?.data?.user?.email || ''
                              });

                              fetchEnquiries();
                              navigate(`/orders-v2/${orderId}`);
                            } else {
                              await supabase.from('enquiries').update({ status: newStatus }).eq('id', e.id);
                              await addFeedNote({
                                type: 'feed',
                                content: `Status changed to ${newStatus} by ${user?.data?.user?.email || 'Unknown'}`,
                                enquiry_id: e.id,
                                order_id: e.order_id || null,
                                created_by: user?.data?.user?.id,
                                created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                                created_by_email: user?.data?.user?.email || ''
                              });
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
                      <td className="p-2">
                        {e.order_id ? (
                          <a
                            href={`/orders-v2/${e.order_id}`}
                            className="text-blue-600 hover:underline"
                            title="View Order"
                          >
                            {e.order_id}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          className="border border-gray-200 rounded px-2 py-1"
                          value={e.follow_up_on ? format(new Date(e.follow_up_on), 'yyyy-MM-dd') : ''}
                          onChange={async (ev) => {
                            const value = ev.target.value;
                            // Convert empty string to null to avoid database errors
                            const followUpDate = value === '' ? null : value;
                            await supabase.from('enquiries').update({ follow_up_on: followUpDate }).eq('id', e.id);
                            const user = await supabase.auth.getUser();
                            await addFeedNote({
                              type: 'feed',
                              content: `Follow-up date updated by ${user?.data?.user?.email || 'Unknown'}`,
                              enquiry_id: e.id,
                              created_by: user?.data?.user?.id,
                              created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                              created_by_email: user?.data?.user?.email || ''
                            });
                            fetchEnquiries();
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col sm:flex-row gap-1 items-start sm:items-center">
                          <button
                            title="Toggle Notes"
                            onClick={() => toggleNotes(e.id)}
                            className="flex items-center gap-1 text-gray-600"
                          >
                            <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
                            <span>{noteCounts[e.id] || 0}</span>
                          </button>
                          <button title="Add Note" onClick={() => handleAddNote(e.id)}>
                            <PlusCircleIcon className="h-5 w-5 text-blue-500 hover:text-blue-700" />
                          </button>
                          <button title="Upload File" onClick={() => handleUploadFileLocal(e.id)}>
                            <ArrowUpTrayIcon className="h-5 w-5 text-green-500 hover:text-green-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedNotes[e.id] && (
                      <tr className="bg-gray-50">
                        <td colSpan="9" className="p-3">
                          <div className="text-xs text-gray-500 mb-1">Most recent first</div>
                          {(notesByEnquiry[e.id] || []).length === 0 && <div className="text-gray-400 italic">No notes yet</div>}
                          <div>
                            {(notesByEnquiry[e.id] || []).map(note => (
                              <div key={note.id} className="mb-2 text-sm text-gray-800 border-b pb-1 flex justify-between">
                                <div>
                                  <div className="text-xs text-gray-400 italic">
                                    Created: {format(new Date(note.created_at), 'dd-MMM HH:mm')} by {note.created_by_email || 'Unknown'}
                                    {note.updated_at && ` • Updated: ${format(new Date(note.updated_at), 'dd-MMM HH:mm')}`}
                                  </div>
                                  {(note.content && !editingNotes[note.id]) ? (
                                    <>
                                      { note.type === 'file' ? (
                                        <div className="flex items-start gap-2">
                                          <div>
                                            <a
                                              href={note.file_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-blue-600 font-medium hover:underline"
                                            >
                                              {note.content.replace('File uploaded: ', '')}
                                            </a>
                                            {/(.png|jpe?g|gif|bmp|webp)$/i.test(note.file_url) && (
                                              <img src={note.file_url} alt={note.content} className="mt-1 max-w-xs rounded shadow border" />
                                            )}
                                          </div>
                                          <a
                                            href={note.file_url}
                                            download
                                            title="Download file"
                                            className="text-gray-500 hover:text-gray-700"
                                          >
                                            ⬇️
                                          </a>
                                        </div>
                                      ) : (
                                        <div className="mt-1">{note.content}</div>
                                      )}
                                      { note.type !== 'file' && (
                                        <button
                                          onClick={() => setEditingNotes(prev => ({ ...prev, [note.id]: true }))}
                                          className="text-sm text-blue-600 hover:underline ml-1"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <textarea
                                        defaultValue={note.content}
                                        className="w-full border rounded px-2 py-1 text-sm mt-1"
                                        ref={(el) => note._ref = el}
                                      />
                                      <button
                                        onClick={async () => {
                                          const newContent = note._ref?.value;
                                          const user = await supabase.auth.getUser();
                                          const { error } = await supabase.from('notes')
                                            .update({ content: newContent, created_by: user?.data?.user?.id || null })
                                            .eq('id', note.id);
                                          if (error) {
                                            console.error('Failed to update note:', error);
                                            toast.error('Note update failed');
                                          } else {
                                            toast.success('Note updated');
                                            setEditingNotes(prev => ({ ...prev, [note.id]: false }));
                                            refreshNotes(e.id);
                                          }
                                        }}
                                        className="text-sm text-blue-600 hover:underline ml-1"
                                      >
                                        Save Edits
                                      </button>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={async () => {
                                    if (note.type === 'file') {
                                      console.log("Clicked delete on note:", note.id, note.type, note.file_path);
                                    }
                                    if (confirm('Delete this note?')) {
                                      try {
                                        if (note.type === 'file' && note.file_path) {
                                          await deleteEnquiryFile(note.file_path);
                                          console.log("File deleted:", note.file_path);
                                        }
                                        await supabase.from('notes').delete().eq('id', note.id);
                                        refreshNotes(e.id);
                                        toast.success('Note deleted');
                                        fetchNoteCounts();
                                      } catch (err) {
                                        console.error("Error deleting note or file:", err);
                                        toast.error("Failed to delete note or file");
                                      }
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 text-xs ml-2"
                                  title="Delete note"
                                >
                                  🗑
                                </button>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
