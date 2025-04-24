import { useEffect, useState } from "react";
import { fetchVendors, fetchProcurementTasks, fetchBoqItemById } from "./orders/services/orderDetailsService";

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const v = await fetchVendors();
      setVendors(v);
      // Fetch all procurement tasks
      const allProcurements = [];
      for (const vendor of v) {
        const tasks = await fetchProcurementTasksForVendor(vendor.id);
        allProcurements.push(...tasks.map(t => ({ ...t, vendor })));
      }
      setProcurements(allProcurements);
      setLoading(false);
    }
    load();
  }, []);

  // Helper to fetch procurement tasks for a vendor
  async function fetchProcurementTasksForVendor(vendorId) {
    const { data, error } = await window.supabase
      .from("procurement_tasks")
      .select("*")
      .eq("vendor_id", vendorId);
    if (error) return [];
    const withBoq = await Promise.all(
      (data || []).map(async (task) => {
        const boq = await fetchBoqItemById(task.boq_item_id);
        return { ...task, boq };
      })
    );
    return withBoq;
  }

  // Filtering and sorting logic
  let filtered = procurements.filter(p => {
    const vendorName = p.vendor?.name?.toLowerCase() || "";
    const material = p.boq?.material?.toLowerCase() || "";
    const status = p.status?.toLowerCase() || "";
    const procurementId = p.id?.toLowerCase() || "";
    const searchText = search.toLowerCase();
    return (
      (!searchText || vendorName.includes(searchText) || material.includes(searchText) || status.includes(searchText) || procurementId.includes(searchText)) &&
      (!statusFilter || status === statusFilter)
    );
  });

  filtered = filtered.sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];
    if (sortKey === "vendor") {
      aVal = a.vendor?.name || "";
      bVal = b.vendor?.name || "";
    } else if (sortKey === "material") {
      aVal = a.boq?.material || "";
      bVal = b.boq?.material || "";
    } else if (sortKey === "expected_date" || sortKey === "actual_date") {
      aVal = a[sortKey] || "";
      bVal = b[sortKey] || "";
    }
    if (aVal === undefined) aVal = "";
    if (bVal === undefined) bVal = "";
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Vendors & Procurement</h1>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Search vendor, material, status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="not_ordered">Not Ordered</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
        </select>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full border text-sm mb-4">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 border cursor-pointer" onClick={() => handleSort("vendor")}>Vendor {sortKey === "vendor" && (sortAsc ? "▲" : "▼")}</th>
              <th className="p-2 border cursor-pointer" onClick={() => handleSort("material")}>Material {sortKey === "material" && (sortAsc ? "▲" : "▼")}</th>
              <th className="p-2 border cursor-pointer" onClick={() => handleSort("quantity")}>Quantity {sortKey === "quantity" && (sortAsc ? "▲" : "▼")}</th>
              <th className="p-2 border cursor-pointer" onClick={() => handleSort("unit")}>Unit {sortKey === "unit" && (sortAsc ? "▲" : "▼")}</th>
              <th className="p-2 border cursor-pointer" onClick={() => handleSort("status")}>Status {sortKey === "status" && (sortAsc ? "▲" : "▼")}</th>
              <th className="p-2 border cursor-pointer" onClick={() => handleSort("expected_date")}>Expected Date {sortKey === "expected_date" && (sortAsc ? "▲" : "▼")}</th>
              <th className="p-2 border cursor-pointer" onClick={() => handleSort("actual_date")}>Received Date {sortKey === "actual_date" && (sortAsc ? "▲" : "▼")}</th>
              <th className="p-2 border cursor-pointer" onClick={() => handleSort("id")}>Procurement ID {sortKey === "id" && (sortAsc ? "▲" : "▼")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-2 text-gray-400">No procurements found</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">{p.vendor?.name || '-'}</td>
                  <td className="p-2 border">{p.boq?.material || '-'}</td>
                  <td className="p-2 border">{p.boq?.quantity || '-'}</td>
                  <td className="p-2 border">{p.boq?.unit || '-'}</td>
                  <td className="p-2 border">{p.status || '-'}</td>
                  <td className="p-2 border">
                    <input
                      type="date"
                      value={p.expected_date || ''}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        await window.supabase
                          .from("procurement_tasks")
                          .update({ expected_date: newDate })
                          .eq("id", p.id);
                      }}
                      className="border rounded px-1 py-0.5 text-sm w-32"
                    />
                  </td>
                  <td className="p-2 border">{p.actual_date || '-'}</td>
                  <td className="p-2 border text-xs text-gray-500">
                    {p.id ? (p.id.length > 8 ? p.id.slice(-8) : p.id) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
