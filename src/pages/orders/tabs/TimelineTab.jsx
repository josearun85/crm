import { useEffect, useState } from "react";
import DhtmlxGantt from "../components/DhtmlxGantt";
import { fetchOrderSteps, insertDefaultOrderSteps, updateOrderStep } from "../services/orderDetailsService";

export default function TimelineTab({ orderId }) {
  const [rawSteps, setRawSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Move loadSteps outside useEffect so it can be passed as a prop
  async function loadSteps() {
    try {
      setLoading(true);
      let data = await fetchOrderSteps(orderId);
      if (data.length === 0) {
        await insertDefaultOrderSteps(orderId);
        data = await fetchOrderSteps(orderId); // re-fetch after insert
      }
      setRawSteps(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load order steps.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSteps();
  }, [orderId]);

  // Helper to format date for dhtmlx-gantt
  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    // Use UTC to avoid timezone shift
    return `${d.getUTCDate()}-${d.getUTCMonth() + 1}-${d.getUTCFullYear()}`;
  };

  // Backend update handler for Gantt drag/edit
  const handleGanttUpdate = async (id, item, newDependencyId) => {
    try {
      // dhtmlx-gantt may give a Date object or a string
      const parseGanttDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) {
          // Use local time to avoid UTC shift
          return val.getFullYear() + "-" +
            String(val.getMonth() + 1).padStart(2, "0") + "-" +
            String(val.getDate()).padStart(2, "0");
        }
        if (typeof val === "string" && val.includes("-")) {
          const parts = val.split("-");
          if (parts[0].length === 4) {
            // Already YYYY-MM-DD
            return val;
          }
          // DD-MM-YYYY to YYYY-MM-DD, treat as local date
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
        return val;
      };
      if (newDependencyId) {
        // Add newDependencyId to dependency_ids of the target step (id)
        const targetStep = rawSteps.find(s => s.id === id);
        let deps = Array.isArray(targetStep?.dependency_ids) ? [...targetStep.dependency_ids] : [];
        console.log("[GANTT] Adding dependency:", {id, newDependencyId, currentDeps: deps});
        const depNum = Number(newDependencyId);
        if (!deps.includes(depNum)) deps.push(depNum);
        // Only keep valid numbers
        deps = deps.filter(x => typeof x === "number" && !isNaN(x));
        console.log("[GANTT] Final deps to save:", deps);
        await updateOrderStep(id, { dependency_ids: deps });
      } else if (item) {
        await updateOrderStep(id, {
          start_date: parseGanttDate(item.start_date),
          duration: item.duration,
          progress: item.progress,
        });
      }
    } catch (err) {
      console.error("Failed to update step from Gantt drag or link:", err);
    }
  };

  // Sort steps by start_date to ensure consistent order
  const sortedSteps = [...rawSteps].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  // Dynamically generate a color for each unique type
  const uniqueTypes = Array.from(new Set(sortedSteps.map(s => (s.type || '').toLowerCase())));
  const palette = [
    '#4f8cff', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#60a5fa', '#facc15', '#10b981', '#f59e42',
    '#6366f1', '#eab308', '#ef4444', '#14b8a6', '#e879f9', '#f43f5e', '#84cc16', '#f97316', '#0ea5e9', '#a3e635'
  ];
  const typeColorMap = {};
  uniqueTypes.forEach((type, idx) => {
    if (type) typeColorMap[type] = palette[idx % palette.length];
  });

  // Build links from dependency_ids
  const links = [];
  sortedSteps.forEach((step) => {
    if (Array.isArray(step.dependency_ids)) {
      step.dependency_ids.forEach((depId) => {
        // Only add link if depId is a valid number and not equal to 0 or self
        if (typeof depId === "number" && !isNaN(depId) && depId !== 0 && depId !== step.id) {
          links.push({
            id: `${step.id}-${depId}`,
            source: depId,
            target: step.id,
            type: "0", // finish-to-start
          });
        }
      });
    }
  });

  // Group steps by type and assign parent-child relationships
  const typeGroups = {};
  sortedSteps.forEach((step) => {
    const type = (step.type || '').toLowerCase();
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(step);
  });

  const idToStep = Object.fromEntries(sortedSteps.map(s => [s.id, s]));
  const parentIds = new Set();
  const childToParent = {};

  Object.values(typeGroups).forEach(group => {
    if (group.length > 1) {
      // Sort by start_date, earliest is parent
      group.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      const parent = group[0];
      parentIds.add(parent.id);
      for (let i = 1; i < group.length; ++i) {
        childToParent[group[i].id] = parent.id;
      }
    }
  });

  // Helper to map sortedSteps to dhtmlx-gantt format
  const ganttData = {
    data: sortedSteps.map((step) => ({
      id: step.id,
      text: step.description,
      start_date: formatDate(step.start_date),
      duration: step.duration || 1,
      progress: step.progress || 0,
      parent: childToParent[step.id] || 0, // 0 for root, else parent id
      type: (step.type || '').toLowerCase(),
    })),
    links,
  };

  return (
    <div className="mt-4">
      {loading || !rawSteps || rawSteps.length === 0 ? (
        <p className="text-sm text-gray-500">Loading timeline...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <DhtmlxGantt 
          tasks={ganttData} 
          onDataUpdate={handleGanttUpdate} 
          typeColorMap={typeColorMap} 
          orderId={orderId} 
          onReload={loadSteps} // Pass the fetch function as a prop
        />
      )}
    </div>
  );
}