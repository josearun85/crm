import React, { useState, useEffect, useRef } from "react";

export default function SignageBoqItemsTable({
  signageItemId,
  boqItems,
  marginPercent,
  onSaveBoq,
  onLocalBoqChange,
  ensureBoqForSignageItem,
}) {
  const [localBoqs, setLocalBoqs] = useState(() => boqItems.map(b => ({ ...b })));
  const [marginPct, setMarginPct] = useState(marginPercent || 0);
  const [boqTotal, setBoqTotal] = useState(0);
  const [totalWithMargin, setTotalWithMargin] = useState(0);
  const cellRefs = useRef({});
  const columns = ["item", "material", "unit", "quantity", "cost_per_unit"];
const [dirtyRows, setDirtyRows] = useState(new Set());
const [deletedRows, setDeletedRows] = useState(new Set());
  // originalRows for delete detection
  const originalIds = useRef(boqItems.map(b => b.id).filter(Boolean));
  // Only update localBoqs if boqItems actually changed (deep compare by id/length)
  useEffect(() => {
    // Avoid infinite loop: only update if different
    let changed = false;
    if (boqItems.length !== localBoqs.length) changed = true;
    else {
      for (let i = 0; i < boqItems.length; i++) {
        if (!localBoqs[i]) { changed = true; break; }
        // Only compare primitive fields, not functions/refs
        for (const key of Object.keys(boqItems[i])) {
          if (boqItems[i][key] !== localBoqs[i][key]) { changed = true; break; }
        }
        if (changed) break;
      }
    }
    if (changed) {
      setLocalBoqs(boqItems.map(b => ({ ...b })));
    }
    // eslint-disable-next-line
  }, [boqItems]);

  useEffect(() => {
    setMarginPct(marginPercent || 0);
    // eslint-disable-next-line
  }, [marginPercent]);

  // 2️⃣ Recalculate BOQ totals locally
  useEffect(() => {
    const total = localBoqs.reduce(
      (sum, row) => sum + Number(row.quantity || 0) * Number(row.cost_per_unit || 0),
      0
    );
    setBoqTotal(total);
    setTotalWithMargin(total * (1 + marginPct / 100));
  }, [localBoqs, marginPct]);

  // 3️⃣ Bubble up every local change (now only on blur, not on every change)
  const handleBlur = () => {
    if (onLocalBoqChange) {
      onLocalBoqChange(signageItemId, localBoqs, marginPct);
    }
  };

  // Handlers

  const handleChange = (idx, col, val) => {
    setLocalBoqs(bs => {
      const updated = bs.map((row, i) =>
        i === idx ? { ...row, [col]: val } : row
      );
     // mark this row’s id (or index) dirty
     const id = updated[idx].id ?? `new-${idx}`;
     setDirtyRows(d => new Set(d).add(id));
      return updated;
    });
  };

  const handleMarginBlur = e => {
    const pct = Number(e.target.value) || 0;
    setMarginPct(pct);
    handleBlur();
  };

  // Enhanced keyboard navigation: Enter in last cell/row adds a new row via parent
  const handleKeyDown = (e, r, c) => {
    const lastRow = localBoqs.length - 1;
    const lastCol = columns.length - 1;
    let nr = r, nc = c;

    if ((e.key === "Tab" || e.key === "ArrowRight") && !e.shiftKey) {
      e.preventDefault();
      if (c < lastCol) nc++;
      else if (r < lastRow) { nr++; nc = 0; }
      else { // Last cell: move to next row or add new row
        if (ensureBoqForSignageItem) {
          ensureBoqForSignageItem(signageItemId).then(() => {
            setTimeout(() => focusCell(r + 1, 0), 0);
          });
        }
        return;
      }
      focusCell(nr, nc);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (c > 0) nc--;
      else if (r > 0) { nr--; nc = lastCol; }
      focusCell(nr, nc);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (r < lastRow) focusCell(r + 1, c);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (r > 0) focusCell(r - 1, c);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (r === lastRow && c === lastCol && ensureBoqForSignageItem) {
        ensureBoqForSignageItem(signageItemId).then(() => {
          setTimeout(() => focusCell(r + 1, 0), 0);
        });
      } else if (c < lastCol) {
        focusCell(r, c + 1);
      } else if (r < lastRow) {
        focusCell(r + 1, 0);
      }
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && (e.metaKey || e.ctrlKey)) {
      // Delete row with Cmd+Backspace or Ctrl+Backspace
      if (localBoqs.length > 1) {
        setLocalBoqs(bs => bs.filter((_, i) => i !== r));
        setTimeout(() => focusCell(Math.max(0, r - 1), 0), 0);
      }
    } else if (e.key === 'Escape') {
      // Escape cancels edit and blurs
      e.target.blur();
    }
  };

  const focusCell = (r, c) => {
    const key = `${r}_${c}`;
    cellRefs.current[key]?.focus();
  };

  const handleDeleteRow = idx => {
  setLocalBoqs(bs => {
    const [removed] = bs.splice(idx, 1);
   if (removed.id) setDeletedRows(d => new Set(d).add(removed.id));
    return [...bs];
  });
};

  return (
    <div className="mt-2">
      <table className="min-w-full border text-xs bg-white">
        <thead>
          <tr>
            <th className="p-2 border">Item</th>
            <th className="p-2 border">Material</th>
            <th className="p-2 border">Unit</th>
            <th className="p-2 border">Quantity</th>
            <th className="p-2 border">Cost/Unit</th>
            <th className="p-2 border">Total</th>
          </tr>
        </thead>
        <tbody>
          {localBoqs.map((row, idx) => (
            <tr key={row.id ?? idx}>
              {columns.map((col, colIdx) => (
                <td className="p-2 border" key={col}>
                  <input
                    ref={el => (cellRefs.current[`${idx}_${colIdx}`] = el)}
                    className="w-full border px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-400"
                    value={row[col] || ""}
                    onChange={e => handleChange(idx, col, e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={e => handleKeyDown(e, idx, colIdx)}
                    aria-label={`${col} row ${idx + 1}`}
                  />
                </td>
              ))}
              <td className="p-2 border text-right">
                {(Number(row.quantity || 0) * Number(row.cost_per_unit || 0)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td colSpan={3} className="p-2 font-medium">Margin %</td>
            <td colSpan={1} className="p-2">
              <input
                type="number"
                className="w-full border px-1 py-0.5 text-xs"
                value={marginPct}
                onBlur={handleMarginBlur}
                onChange={e => setMarginPct(Number(e.target.value))}
              />
            </td>
            <td className="p-2 text-right font-medium">Total (with margin)</td>
            <td className="p-2 text-right font-medium">
              {totalWithMargin.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="text-right mt-3">
        
        <button
        type="button"                   // ← ADD THIS
         className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
         onClick={async () => {
           console.log("🚀 [SignageBoqItemsTable] Save button clicked:", {
             signageItemId,
             localBoqs,
             marginPct,
           });
           if (onSaveBoq) {
             try {
                          
                              // only send rows the user actually edited
                const edited = localBoqs.filter(row =>
                  dirtyRows.has(row.id ?? `new-${localBoqs.indexOf(row)}`)
                );
                const toDelete = Array.from(deletedRows);
                await onSaveBoq(signageItemId, edited, { marginPct, toDelete });
               
               console.log("✅ [SignageBoqItemsTable] onSaveBoq resolved:");
             } catch (err) {
               console.error("❌ [SignageBoqItemsTable] onSaveBoq threw:", err);
             }
           }
         }}
       >
         Save BOQ
       </button>
      </div>
    </div>
  );
}