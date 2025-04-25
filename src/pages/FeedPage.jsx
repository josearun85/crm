import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

const PAGE_SIZE = 30;

export default function FeedPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const loader = useRef();
  const navigate = useNavigate();

  // Fetch notes with pagination
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("notes")
      .select("id, created_by_email, content, created_at, enquiry_id, order_id, order_step_id, customer_id, signage_item_id, boq_item_id, inventory_id, invoice_id, procurement_task_id, vendor_id")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (search) {
      query = query.ilike('content', `%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      setLoading(false);
      return;
    }
    setNotes(prev => offset === 0 ? (data || []) : [...prev, ...(data || [])]);
    setHasMore(data && data.length === PAGE_SIZE);
    setLoading(false);
  }, [offset, search]);

  // Initial and paginated fetch
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setOffset(prev => prev + PAGE_SIZE);
        }
      },
      { threshold: 1 }
    );
    if (loader.current) observer.observe(loader.current);
    return () => observer.disconnect();
  }, [loading, hasMore]);

  // Reset offset when search changes
  useEffect(() => {
    setOffset(0);
  }, [search]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Feeds</h1>
      <input
        className="border rounded px-2 py-1 mb-4 w-full"
        placeholder="Search feed..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <ul>
        {notes.map(note => (
          <li key={note.id} className="mb-4 border-b pb-2">
            <div className="text-sm text-gray-500">
              <span>User: {note.created_by_email || 'Unknown'}</span> &middot;{" "}
              <span>{new Date(note.created_at).toLocaleString()}</span>
            </div>
            <div className="text-base flex items-center gap-2">
              {/* Source badge */}
              {note.order_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">Order</span>
              ) : note.enquiry_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200">Enquiry</span>
              ) : note.order_step_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Order Step</span>
              ) : note.customer_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 border border-purple-200">Customer</span>
              ) : note.signage_item_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-pink-100 text-pink-700 border border-pink-200">Signage</span>
              ) : note.boq_item_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">BOQ</span>
              ) : note.inventory_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700 border border-teal-200">Inventory</span>
              ) : note.invoice_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 border border-orange-200">Invoice</span>
              ) : note.procurement_task_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">Procurement</span>
              ) : note.vendor_id ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 border border-red-200">Vendor</span>
              ) : null}
              {/* Note content, clickable if enquiry_id */}
              {note.enquiry_id ? (
                <a
                  href="#"
                  className="text-blue-600 hover:underline cursor-pointer"
                  onClick={e => {
                    e.preventDefault();
                    navigate(`/enquiries?highlight=${note.enquiry_id}`);
                  }}
                >
                  {note.content}
                </a>
              ) : (
                note.content
              )}
            </div>
          </li>
        ))}
      </ul>
      {loading && <p>Loading...</p>}
      <div ref={loader} style={{ height: 1 }} />
      {!hasMore && <p className="text-center text-gray-400 mt-4">No more events</p>}
    </div>
  );
}