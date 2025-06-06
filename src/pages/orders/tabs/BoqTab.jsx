import { useEffect, useState } from "react";
import { fetchSignageItems, fetchBoqItems, updateBoqItem, fetchVendors, addVendor, fetchInventory, addInventoryEntry, ensureProcurementStepsForOrder, fetchProcurementTasks, createProcurementTaskAndLinkBoq, addFeedNote } from "../services/orderDetailsService";
import supabase from "../../../supabaseClient";
import UnitInput from "../../../components/UnitInput";

export default function BoqTab({ orderId }) {
  const [materials, setMaterials] = useState([]);
  const [rawBoqs, setRawBoqs] = useState([]);
  const [signageItems, setSignageItems] = useState([]);
  const [showProcModal, setShowProcModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [procPlan, setProcPlan] = useState([]); // [{material, quantity, vendor, vendor_id, shortfall, unit}]
  const [inventory, setInventory] = useState({}); // {material: {available_qty, unit}}
  const [loadingProc, setLoadingProc] = useState(false);
  const [procuredBoqIds, setProcuredBoqIds] = useState(new Set());
  const [procurementTasksByBoqId, setProcurementTasksByBoqId] = useState({});
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [marginEdit, setMarginEdit] = useState({}); // { [signageItemId]: { marginPercent, totalWithMargin, lastEdited } }

  const unitOptions = [
    { value: 'nos', label: 'nos' },
    { value: 'kg', label: 'kg' },
    { value: 'm', label: 'm' },
    { value: 'cm', label: 'cm' },
    { value: 'mm', label: 'mm' },
    { value: 'ft', label: 'ft' },
    { value: 'inch', label: 'inch' },
    { value: 'set', label: 'set' },
    { value: 'box', label: 'box' },
    { value: 'sheet', label: 'sheet' },
    { value: 'trip', label: 'trip (logistics)' },
    { value: 'km', label: 'km (logistics)' },
    { value: 'hour', label: 'hour (man hours)' },
    { value: 'day', label: 'day (man hours)' },
    { value: 'lump sum', label: 'lump sum' },
  ];

  useEffect(() => {
    if (!orderId || isNaN(Number(orderId))) return;
    async function loadBoqSummary() {
      try {
        // Fetch all signage items (to ensure we have all signage IDs)
        const items = await fetchSignageItems(Number(orderId));
        setSignageItems(items);
        // Fetch all BOQ entries for the order
        const allBoqs = await fetchBoqItems(Number(orderId));
        setRawBoqs(allBoqs);

        // Reduce BOQ entries by material
        const summaryMap = {};
        for (const boq of allBoqs) {
          const key = boq.material;
          if (!summaryMap[key]) {
            summaryMap[key] = {
              material: boq.material,
              quantity: 0,
              cost_per_unit: boq.cost_per_unit || 0, 
              unit: boq.unit || "",
            };
          }
          summaryMap[key].quantity += Number(boq.quantity || 0);
        }
        const materialList = Object.values(summaryMap).map(m => ({
          ...m,
          total_cost: m.cost_per_unit * m.quantity,
        }));
        setMaterials(materialList);
      } catch (err) {
        console.error(err);
      }
    }
    loadBoqSummary();
  }, [orderId]);

  useEffect(() => {
    async function loadVendors() {
      try {
        const data = await fetchVendors();
        setVendors(data);
      } catch (err) { console.error(err); }
    }
    loadVendors();
  }, []);

  useEffect(() => {
    async function loadInventory() {
      if (!materials.length) return;
      try {
        const data = await fetchInventory();
        const invMap = {};
        for (const row of data) invMap[row.material] = row;
        setInventory(invMap);
      } catch (err) { console.error(err); }
    }
    loadInventory();
  }, [materials]);

  useEffect(() => {
    if (!materials.length) return;
    setProcPlan(
      materials
        .filter(m => m.material && m.material.trim() !== "") // filter out empty material rows
        .map(m => {
          const inv = inventory[m.material];
          const available = inv ? Number(inv.available_qty) : 0;
          const shortfall = Math.max(0, m.quantity - available);
          // If already procured, default procure_qty to 0, else to shortfall
          const alreadyProcured = Array.from(procuredBoqIds).some(
            boqId => {
              // Find all rawBoqs for this material
              return rawBoqs.find(b => b.id === boqId && b.material === m.material);
            }
          );
          return {
            material: m.material,
            unit: m.unit,
            required: m.quantity,
            available,
            shortfall,
            vendor: "",
            vendor_id: null,
            procure_qty: alreadyProcured ? 0 : shortfall,
          };
        })
    );
  }, [materials, inventory, procuredBoqIds, rawBoqs]);

  useEffect(() => {
    // Fetch procurement tasks and build a set of procured BOQ ids
    fetchProcurementTasks(orderId).then(tasks => {
      setProcuredBoqIds(new Set(tasks.map(t => t.boq_item_id)));
    }).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    // Fetch procurement tasks for this order and group by BOQ id
    fetchProcurementTasks(orderId).then(tasks => {
      const map = {};
      for (const t of tasks) {
        if (!map[t.boq_item_id]) map[t.boq_item_id] = [];
        map[t.boq_item_id].push(t);
      }
      setProcurementTasksByBoqId(map);
    });
  }, [orderId]);

  async function handleAddVendor(name) {
    try {
      const data = await addVendor(name);
      setVendors(vendors => [...vendors, data]);
      return data;
    } catch (err) { console.error(err); return null; }
  }

  async function ensureInventory(material, unit) {
    if (inventory[material]) return inventory[material];
    try {
      const data = await addInventoryEntry(material, unit);
      setInventory(inv => ({ ...inv, [material]: data }));
      return data;
    } catch (err) { console.error(err); return null; }
  }

  async function handleCreateProcurement() {
    setLoadingProc(true);
    let hadError = false;
    for (const row of procPlan) {
      // Allow procurement for any row with a positive procure_qty
      if (!row.procure_qty || row.procure_qty <= 0) continue;
      try {
        await ensureInventory(row.material, row.unit);
      } catch (err) {
        console.error("Failed to ensure inventory for", row.material, err);
        alert(`Error ensuring inventory for ${row.material}: ${err.message}`);
        hadError = true;
        continue;
      }
      const boqs = rawBoqs.filter(b => b.material === row.material);
      for (const boq of boqs) {
        try {
          await createProcurementTaskAndLinkBoq(
            boq.id,
            row.vendor_id,
            "not_ordered",
            row.available > 0 ? (row.shortfall < row.required ? "partial" : "shortage") : "shortage"
          );
        } catch (err) {
          console.error("Exception inserting procurement_task and linking BOQ:", err, { boq, row });
          alert(`Exception creating procurement for ${row.material}: ${err.message}`);
          hadError = true;
        }
      }
    }
    try {
      await ensureProcurementStepsForOrder(Number(orderId));
    } catch (err) {
      console.error("Error ensuring procurement steps for Gantt:", err);
      alert(`Error syncing procurement steps for Gantt: ${err.message}`);
      hadError = true;
    }
    fetchProcurementTasks(orderId).then(tasks => {
      setProcuredBoqIds(new Set(tasks.map(t => t.boq_item_id)));
      const map = {};
      for (const t of tasks) {
        if (!map[t.boq_item_id]) map[t.boq_item_id] = [];
        map[t.boq_item_id].push(t);
      }
      setProcurementTasksByBoqId(map);
    });
    setLoadingProc(false);
    setShowProcModal(false);
    if (!hadError) {
      alert("Procurement plan created!");
    } else {
      alert("Procurement plan created with some errors. Please check the console and database.");
    }
  }

  const totalBoqCost = materials.reduce((sum, m) => sum + m.total_cost, 0);

  // Sort rawBoqs by signage item name, then by item
  const signageNameMap = signageItems.reduce((acc, si) => { acc[si.id] = si.name || ''; return acc; }, {});
  const sortedBoqs = rawBoqs
    .filter(boq => boq.material && boq.material.trim() !== "")
    .sort((a, b) => {
      const signageA = signageNameMap[a.signage_item_id] || '';
      const signageB = signageNameMap[b.signage_item_id] || '';
      if (signageA !== signageB) return signageA.localeCompare(signageB);
      const itemA = (a.item || '').toLowerCase();
      const itemB = (b.item || '').toLowerCase();
      return itemA.localeCompare(itemB);
    });

  // Calculate rowspans for signage and item columns
  const rowData = [];
  let prevSignage = null, prevItem = null;
  let signageStart = 0, itemStart = 0;
  for (let i = 0; i < sortedBoqs.length; i++) {
    const boq = sortedBoqs[i];
    const signage = signageNameMap[boq.signage_item_id] || '';
    const item = boq.item || '';
    // If signage changes, finalize previous signage group
    if (signage !== prevSignage) {
      if (i > signageStart) rowData[signageStart].signageRowSpan = i - signageStart;
      signageStart = i;
      prevSignage = signage;
      // New signage always means new item group
      if (i > itemStart) rowData[itemStart].itemRowSpan = i - itemStart;
      itemStart = i;
      prevItem = item;
    } else if (item !== prevItem) {
      // If item changes within same signage, finalize previous item group
      if (i > itemStart) rowData[itemStart].itemRowSpan = i - itemStart;
      itemStart = i;
      prevItem = item;
    }
    rowData.push({ ...boq, signage, item, signageRowSpan: 0, itemRowSpan: 0 });
  }
  // Finalize last signage and item group
  if (rowData.length > 0) {
    rowData[signageStart].signageRowSpan = rowData.length - signageStart;
    rowData[itemStart].itemRowSpan = rowData.length - itemStart;
  }

  // Helper: get total BOQ cost for a signage item
  function getSignageBoqTotal(signageItemId) {
    return rawBoqs.filter(b => b.signage_item_id === signageItemId)
      .reduce((sum, b) => sum + Number(b.quantity) * Number(b.cost_per_unit || 0), 0);
  }

  // Handler for margin % change
  const handleMarginPercentChange = (signageItem, val) => {
    const boqTotal = getSignageBoqTotal(signageItem.id);
    const marginPercent = parseFloat(val) || 0;
    const totalWithMargin = boqTotal * (1 + marginPercent / 100);
    setMarginEdit(edit => ({
      ...edit,
      [signageItem.id]: {
        marginPercent: val,
        totalWithMargin: totalWithMargin.toFixed(2),
        lastEdited: 'margin',
      },
    }));
  };

  // Handler for total change
  const handleTotalWithMarginChange = (signageItem, val) => {
    const boqTotal = getSignageBoqTotal(signageItem.id);
    const totalWithMargin = parseFloat(val) || 0;
    const marginPercent = boqTotal === 0 ? 0 : ((totalWithMargin / boqTotal - 1) * 100);
    setMarginEdit(edit => ({
      ...edit,
      [signageItem.id]: {
        marginPercent: marginPercent.toFixed(2),
        totalWithMargin: val,
        lastEdited: 'total',
      },
    }));
  };

  // Handler to persist margin/total to backend
  const handleMarginBlur = async (signageItem) => {
    const edit = marginEdit[signageItem.id];
    if (!edit) return;
    const updates = {
      margin_percent: parseFloat(edit.marginPercent) || 0,
      total_with_margin: parseFloat(edit.totalWithMargin) || 0,
    };
    await updateSignageItem(signageItem.id, updates);
    // Optionally: refresh signageItems from backend
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">BOQ Summary Across All Signage Items</h2>
      <table className="min-w-full text-xs border">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2 border">S. No.</th>
            <th className="p-2 border">Signage Item</th>
            <th className="p-2 border">Item</th>
            <th className="p-2 border">Material</th>
            <th className="p-2 border">Unit</th>
            <th className="p-2 border">Quantity</th>
            <th className="p-2 border">Cost/Unit</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Procurement</th>
          </tr>
        </thead>
        <tbody>
          {rowData.map((row, idx) => (
            <tr key={row.id} className="hover:bg-yellow-50">
              <td className="p-2 border">{idx + 1}</td>
              {row.signageRowSpan > 0 ? (
                <td className="p-2 border" rowSpan={row.signageRowSpan} style={{ verticalAlign: 'middle' }}>{row.signage}</td>
              ) : null}
              {row.itemRowSpan > 0 ? (
                <td className="p-2 border" rowSpan={row.itemRowSpan} style={{ verticalAlign: 'middle' }}>{row.item}</td>
              ) : null}
              {row.signageRowSpan === 0 && row.itemRowSpan === 0 && (
                <>
                  {/* Render empty cells to keep alignment */}
                  <td className="p-2 border" style={{ display: 'none' }}></td>
                  <td className="p-2 border" style={{ display: 'none' }}></td>
                </>
              )}
              <td className="p-2 border font-medium">{row.material}</td>
              <td className="p-2 border w-16 text-center">
                <UnitInput
                  value={row.unit}
                  onChange={e => {
                    const value = e.target.value;
                    if (row.id) {
                      setRawBoqs(boqs => boqs.map(b => b.id === row.id ? { ...b, unit: value } : b));
                    }
                  }}
                  onBlur={async () => {
                    if (row.id) {
                      // Get the updated unit value from rawBoqs state
                      const updatedBoq = rawBoqs.find(b => b.id === row.id);
                      if (updatedBoq) {
                        await updateBoqItem(row.id, { unit: updatedBoq.unit });
                        // Add feed note for the update
                        const user = await import('../../../supabaseClient').then(m => m.default.auth.getUser());
                        await addFeedNote({
                          type: 'feed',
                          content: `BOQ unit updated to "${updatedBoq.unit}" by ${user?.data?.user?.email || 'Unknown'}`,
                          boq_item_id: row.id,
                          signage_item_id: updatedBoq.signage_item_id,
                          orderId,
                          created_by: user?.data?.user?.id,
                          created_by_name: user?.data?.user?.user_metadata?.full_name || '',
                          created_by_email: user?.data?.user?.email || ''
                        });
                      }
                    }
                  }}
                />
              </td>
              <td className="p-2 border">{row.quantity}</td>
              <td className="p-2 border">{row.cost_per_unit}</td>
              <td className="p-2 border">{(row.quantity * row.cost_per_unit).toFixed(2)}</td>
              <td className="p-2 border text-center">
                {procurementTasksByBoqId[row.id]?.length > 0 ? (
                  <>
                    <span
                      title={
                        procurementTasksByBoqId[row.id][0].status === 'received'
                          ? 'Procurement received, material available'
                          : 'Procurement created'
                      }
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedProcurement(procurementTasksByBoqId[row.id][0])}
                    >
                      {procurementTasksByBoqId[row.id][0].status === 'received' ? '✅' : '🛒'}
                    </span>
                    <span className="ml-1 text-xs text-gray-500">({procurementTasksByBoqId[row.id].length})</span>
                  </>
                ) : (
                  <span title="No procurement">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right font-semibold mt-2 text-base">
        Total BOQ Cost: ₹{totalBoqCost.toFixed(2)}
      </div>

      {/* Margin/Total form for each signage item */}
      {signageItems.map(signageItem => {
        // Only show for signage items that have BOQs
        const boqTotal = getSignageBoqTotal(signageItem.id);
        if (boqTotal === 0) return null;
        // Use local edit state if present, else signageItem fields
        const edit = marginEdit[signageItem.id] || {};
        const marginPercent = edit.lastEdited ? edit.marginPercent : (signageItem.margin_percent ?? '');
        const totalWithMargin = edit.lastEdited ? edit.totalWithMargin : (signageItem.total_with_margin ?? (boqTotal ? boqTotal.toFixed(2) : ''));
        return (
          <div key={signageItem.id} className="flex flex-wrap gap-4 items-center justify-end border p-2 rounded bg-gray-50 mt-2">
            <span className="font-medium mr-2">{signageItem.name || 'Signage Item'}:</span>
            <label className="flex items-center gap-1">
              <span>Margin %</span>
              <input
                type="number"
                className="border px-2 py-1 rounded w-20 text-right"
                value={marginPercent}
                onChange={e => handleMarginPercentChange(signageItem, e.target.value)}
                onBlur={() => handleMarginBlur(signageItem)}
                min={0}
                step={0.01}
              />
            </label>
            <label className="flex items-center gap-1">
              <span>Total (with margin)</span>
              <input
                type="number"
                className="border px-2 py-1 rounded w-28 text-right"
                value={totalWithMargin}
                onChange={e => handleTotalWithMarginChange(signageItem, e.target.value)}
                onBlur={() => handleMarginBlur(signageItem)}
                min={0}
                step={0.01}
              />
            </label>
            <span className="text-gray-500 text-xs">BOQ: ₹{boqTotal.toFixed(2)}</span>
          </div>
        );
      })}

      <button
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() => setShowProcModal(true)}
      >
        Create Procurement Plan
      </button>

      {showProcModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-2xl space-y-4">
            <h3 className="text-lg font-semibold mb-2">Procurement Plan</h3>
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2 border">Material</th>
                  <th className="p-2 border">Unit</th>
                  <th className="p-2 border">Required</th>
                  <th className="p-2 border">In Stock</th>
                  <th className="p-2 border">Shortfall</th>
                  <th className="p-2 border">Procure Qty</th>
                  <th className="p-2 border">Vendor</th>
                </tr>
              </thead>
              <tbody>
                {procPlan.map((row, idx) => (
                  <tr key={row.material}>
                    <td className="p-2 border font-medium">{row.material}</td>
                    <td className="p-2 border">
                      <UnitInput
                        value={row.unit}
                        onChange={e => {
                          const value = e.target.value;
                          setProcPlan(plan => plan.map((p, i) => i === idx ? { ...p, unit: value } : p));
                        }}
                      />
                    </td>
                    <td className="p-2 border">{row.required}</td>
                    <td className="p-2 border">{row.available}</td>
                    <td className="p-2 border">{row.shortfall}</td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        min={0}
                        max={row.shortfall}
                        value={row.procure_qty}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setProcPlan(plan => plan.map((p, i) => i === idx ? { ...p, procure_qty: v } : p));
                        }}
                        className="w-16 border px-1 py-0.5 text-sm"
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        list={`vendor-list-${idx}`}
                        value={row.vendor}
                        onChange={e => {
                          const val = e.target.value;
                          const found = vendors.find(v => v.name === val);
                          if (found) {
                            setProcPlan(plan => plan.map((p, i) => i === idx ? { ...p, vendor: val, vendor_id: found.id } : p));
                          } else {
                            setProcPlan(plan => plan.map((p, i) => i === idx ? { ...p, vendor: val, vendor_id: null } : p));
                          }
                        }}
                        onBlur={async e => {
                          const val = e.target.value;
                          if (val && !vendors.find(v => v.name === val)) {
                            const newVendor = await handleAddVendor(val);
                            if (newVendor) {
                              setProcPlan(plan => plan.map((p, i) => i === idx ? { ...p, vendor: val, vendor_id: newVendor.id } : p));
                            }
                          }
                        }}
                        className="border px-1 py-0.5 text-sm w-32"
                        placeholder="Select or add vendor"
                      />
                      <datalist id={`vendor-list-${idx}`}>
                        {vendors.map(v => (
                          <option key={v.id} value={v.name} />
                        ))}
                      </datalist>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-3 py-1 text-sm bg-gray-200 rounded"
                onClick={() => setShowProcModal(false)}
                disabled={loadingProc}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 text-sm bg-green-600 text-white rounded"
                onClick={handleCreateProcurement}
                disabled={loadingProc}
              >
                {loadingProc ? "Creating..." : "Confirm & Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProcurement && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold mb-2">Procurement Task Details</h3>
            <div className="mb-2">
              <strong>Status:</strong> {selectedProcurement.status || '-'}<br />
              <strong>Vendor:</strong> {vendors.find(v => v.id === selectedProcurement.vendor_id)?.name || '-'}<br />
              <strong>Expected Date:</strong> {selectedProcurement.expected_date || '-'}<br />
              <strong>Received Date:</strong> {selectedProcurement.actual_date || '-'}
            </div>
            <div>
              <h4 className="font-medium mb-1">BOQ Item</h4>
              <table className="min-w-full border text-sm mb-2">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-2 border">Material</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {rawBoqs.filter(b => b.id === selectedProcurement.boq_item_id).map(b => (
                    <tr key={b.id}>
                      <td className="p-2 border">{b.material}</td>
                      <td className="p-2 border">{b.quantity}</td>
                      <td className="p-2 border">{b.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                className="px-3 py-1 text-sm bg-gray-200 rounded"
                onClick={() => setSelectedProcurement(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}