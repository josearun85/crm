import React from 'react';
import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import CreateEnquiryModal from '../components/Enquiries/CreateEnquiryModal';
import { ChatBubbleLeftEllipsisIcon, PlusCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { uploadEnquiryFile, createFileNote } from '../services/enquiriesService';

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
  const [noteCounts, setNoteCounts] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [notesByEnquiry, setNotesByEnquiry] = useState({});
  const [editingNotes, setEditingNotes] = useState({});

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
      .select('id, content, file_url, type, created_at, updated_at, created_by ( id, email )')
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
        const filePath = await uploadEnquiryFile(file, enquiryId);
        const { data: publicUrlData } = supabase.storage.from("crm").getPublicUrl(filePath);
        const fileURL = publicUrlData?.publicUrl;

        const user = await supabase.auth.getUser();
        await createFileNote(enquiryId, file.name, fileURL, user?.data?.user?.id || null);

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
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse">
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
            {enquiries.map((e) => (
              <React.Fragment key={e.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2">{format(new Date(e.date), 'dd-MMM-yyyy')}</td>
                  <td className="p-2 text-blue-600 hover:underline cursor-pointer">
                    {e.customers?.name || '—'}
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
                          
                          // Insert default order steps
                          const defaultSteps = [
                            { type: 'site_visit', step_name: 'Site Visit' },
                            { type: 'design', step_name: 'Design approval' },
                            { type: 'procurement', step_name: 'Cost estimate' },
                            { type: 'production', step_name: 'Template specification' },
                            { type: 'installation', step_name: 'Letter installation' },
                            { type: 'feedback', step_name: 'Final feedback' }
                          ];
                          
                          await supabase.from('order_steps').insert(
                            defaultSteps.map(s => ({
                              order_id: orderId,
                              ...s
                            }))
                          );

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
                      value={e.follow_up_on ? format(new Date(e.follow_up_on), 'yyyy-MM-dd') : ''}
                      onChange={async (ev) => {
                        const value = ev.target.value;
                        await supabase.from('enquiries').update({ follow_up_on: value }).eq('id', e.id);
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
                      {(notesByEnquiry[e.id] || []).map(note => (
                        <div key={note.id} className="mb-2 text-sm text-gray-800 border-b pb-1 flex justify-between">
                      <div>
                        <div className="text-xs text-gray-400 italic">
                          Created: {format(new Date(note.created_at), 'dd-MMM HH:mm')} by {note.created_by?.email || 'Unknown'}
                          {note.updated_at && ` • Updated: ${format(new Date(note.updated_at), 'dd-MMM HH:mm')}`}
                        </div>
                      {(note.content && !editingNotes[note.id]) ? (
                              <>
                                { note.type === 'file' ? (
                                  (() => {
                                    const url = note.file_url;
                                    const fileName = note.content?.replace('File uploaded: ', '');
                                    const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(url);
                                    return (
                                      <div className="flex items-start gap-2">
                                        <div>
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 font-medium hover:underline"
                                          >
                                            {fileName}
                                          </a>
                                          {isImage && (
                                            <img src={url} alt={fileName} className="mt-1 max-w-xs rounded shadow border" />
                                          )}
                                        </div>
                                        <a
                                          href={url}
                                          download
                                          title="Download file"
                                          className="text-gray-500 hover:text-gray-700"
                                        >
                                          ⬇️
                                        </a>
                                      </div>
                                    );
                                  })()
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
                              if (confirm('Delete this note?')) {
                                await supabase.from('notes').delete().eq('id', note.id);
                                refreshNotes(e.id);
                                toast.success('Note deleted');
                                fetchNoteCounts();
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-xs ml-2"
                            title="Delete note"
                          >
                            🗑
                          </button>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
