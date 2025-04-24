import React, { useEffect, useRef } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import gantt from "dhtmlx-gantt";
import { addOrderStep } from "../services/orderDetailsService";

export default function DhtmlxGantt({ tasks, onDataUpdate, typeColorMap = {}, orderId }) {
  const ganttContainer = useRef(null);

  // Inject dynamic styles for type colors
  useEffect(() => {
    const styleId = "gantt-type-colors";
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    let css = "";
    Object.entries(typeColorMap).forEach(([type, color]) => {
      css += `.gantt_task_line--${type} { background-color: ${color} !important; }\n`;
    });
    styleTag.innerHTML = css;
    return () => {
      if (styleTag) styleTag.remove();
    };
  }, [typeColorMap]);

  // Handler for adding a new step (to be called from your + button logic)
  const handleAddStep = async (parentStep) => {
    try {
      await addOrderStep(orderId, {
        type: parentStep?.type || "design",
        description: "New Step",
        start_date: new Date().toISOString().slice(0, 10),
        duration: 1,
        status: "not started",
        delayed: false,
        files: [],
        comments: [],
        dependency_ids: []
      });
      // Optionally, trigger a refresh of tasks/steps here
    } catch (err) {
      console.error("Failed to add step:", err);
    }
  };

  useEffect(() => {
    gantt.init(ganttContainer.current);
    // Color tasks by type
    gantt.templates.task_class = function (start, end, task) {
      return task.type ? `gantt_task_line--${task.type}` : "";
    };

    // Listen for link deletion
    gantt.attachEvent("onAfterLinkDelete", async function(id, link) {
      // Remove the dependency from the target step's dependency_ids
      try {
        // link.source = dependency, link.target = step
        // Fetch the current dependencies for the target step
        const targetStep = tasks.data.find(t => t.id === link.target);
        let deps = Array.isArray(targetStep?.dependency_ids) ? [...targetStep.dependency_ids] : [];
        deps = deps.filter(depId => depId !== link.source && depId !== Number(link.source));
        // Update in DB
        const { updateOrderStep } = await import("../services/orderDetailsService");
        await updateOrderStep(link.target, { dependency_ids: deps });
        if (typeof onReload === 'function') onReload();
      } catch (err) {
        console.error("Failed to update dependencies after link delete:", err);
      }
      return true;
    });

    gantt.parse(tasks);
    gantt.eachTask(function(task){ task.$open = true; });
    gantt.render();

    // Attach event for data update (drag, resize, etc.)
    if (onDataUpdate) {
      gantt.attachEvent("onAfterTaskUpdate", function(id, item) {
        onDataUpdate(id, item);
      });
      gantt.attachEvent("onAfterTaskDrag", function(id, mode, e){
        const item = gantt.getTask(id);
        onDataUpdate(id, item);
        return true;
      });
    }
    // Listen for link creation
    if (typeof onDataUpdate === 'function') {
      gantt.attachEvent("onAfterLinkAdd", function(id, link) {
        // link.source, link.target
        if (onDataUpdate) onDataUpdate(link.target, null, link.source);
        return true;
      });
    }
    // Listen for new task creation via the + button
    gantt.attachEvent("onTaskCreated", function(task) {
      handleAddStep(task);
      // Prevent dhtmlx-gantt from adding the task itself (we handle it via backend)
      return false;
    });
    return () => {
      gantt.clearAll();
    };
  }, [tasks, onDataUpdate]);

  return (
    <div
      ref={ganttContainer}
      style={{ width: "100%", height: "500px" }}
    ></div>
  );
}
