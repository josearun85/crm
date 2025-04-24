import { useEffect, useState, useRef, useCallback } from "react";
import supabase from "../supabaseClient";

const PAGE_SIZE = 30;

export default function FeedPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const loader = useRef();

  // Fetch notes with pagination
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("id, user_id, content, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      setLoading(false);
      return;
    }
    setNotes(prev => [...prev, ...(data || [])]);
    setHasMore(data && data.length === PAGE_SIZE);
    setLoading(false);
  }, [offset]);

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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Feeds</h1>
      <ul>
        {notes.map(note => (
          <li key={note.id} className="mb-4 border-b pb-2">
            <div className="text-sm text-gray-500">
              <span>User: {note.user_id}</span> &middot;{" "}
              <span>{new Date(note.created_at).toLocaleString()}</span>
            </div>
            <div className="text-base">{note.content}</div>
          </li>
        ))}
      </ul>
      {loading && <p>Loading...</p>}
      <div ref={loader} style={{ height: 1 }} />
      {!hasMore && <p className="text-center text-gray-400 mt-4">No more events</p>}
    </div>
  );
}