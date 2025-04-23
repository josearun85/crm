import { Gantt, Willow } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import React, { useEffect, useState, useRef } from "react";
import {updateOrderStep, addOrderStep } from "../services/orderDetailsService";
import StepModal from "./StepModal";



export default function ModernGantt({ steps, onRefresh }) {
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [taskTypes, setTaskTypes] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const apiRef = useRef(null);

  useEffect(() => {
    setIsReady(false);
    console.log("📦 Raw Steps:", steps);

    if (!steps || steps.length === 0) {
      console.warn("No steps found for Gantt rendering.");
      setTasks([]);
      setLinks([]);
      return;
    }

    const toIST = (date) => {
      console.log("Converting to IST:", date);

      if (!date) return null;
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) return null;
      date = parsedDate;
      console.log("Converting to IST:", date);
      const utc = date.getTime() + date.getTimezoneOffset() * 60000;
      return new Date(utc + 19800000); // offset for IST
    };

  // Dynamically generate typeColorMap based on unique step types
  const uniqueTypes = steps && steps.length > 0
    ? [...new Set(steps.map(step => step.type).filter(Boolean))]
    : [];
  const predefinedColors = [
    "#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#607d8b", "#e91e63", "#00bcd4"
  ];
  const typeColorMap = {};
  const allTasks = [];

  uniqueTypes.forEach((type, idx) => {
    typeColorMap[type] = predefinedColors[idx % predefinedColors.length];
  });
steps.forEach((step) => {
  console.log(step);
  const start = toIST(step.start_date);
  const end = toIST(step.end_date);
  // if (!start || !end) return;

  allTasks.push({
    id: step.id,
    text: step.description,
    start,
    end,
    duration: step.duration || 1,
    progress: step.progress || 0,
    type: step.type,
    color: typeColorMap[step.type],
  });
});

// Recompute start and end dates based on duration and previous task's end date
for (let i = 0; i < allTasks.length; i++) {
  const task = allTasks[i];
  if (!(task.start instanceof Date) || isNaN(task.start)) {
    if (i === 0) {
      task.start = new Date();
    } else {
      task.start = new Date(allTasks[i - 1].end);
    }
  }
  if (!(task.duration && !isNaN(task.duration))) {
    task.duration = 1;
  }
  if (!(task.end instanceof Date) || isNaN(task.end)) {
    task.end = new Date(task.start.getTime() + task.duration * 86400000);
  }
  // Ensure end is after start
  if (task.end <= task.start) {
    task.end = new Date(task.start.getTime() + task.duration * 86400000);
  }
}

    const generatedTaskTypes = Object.entries(typeColorMap).map(([key]) => ({
      id: key.toLowerCase(),
      label: key,
    }));
    setTaskTypes(generatedTaskTypes);

    

    const deps = steps
      .filter(step => Array.isArray(step.dependency_ids))
      .flatMap(step =>
        step.dependency_ids.map(dep => ({
          id: `${step.id}-${dep}`,
          source: dep,
          target: step.id,
          type: "e2e",
        }))
      );

    console.log("✅ Final Gantt Tasks:", allTasks);
    console.log("🔗 Final Gantt Links:", deps);
    setTasks(allTasks);
    setLinks(deps);
    setIsReady(true);

  
  }, [steps]);

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.on("add-link", (data) => {
        setLink(data.link);
      });

      apiRef.current.on("update-task", async (ev) => {
        console.log("📝 Gantt Task Updated (event)", ev);
        onTaskChange(ev);
      });

      apiRef.current.on("drag-task", async (ev) => {
        console.log("📦 Dragged task:", ev);
        onTaskChange(ev);
      });

      apiRef.current.on("delete-task", async (ev) => {
        console.log("🗑️ Deleted task:", ev);
        try {
          await updateOrderStep(ev.id, { deleted: true }); // Optional flag if soft-delete is needed
          onRefresh?.(); // Refresh view
        } catch (err) {
          console.error("❌ Failed to delete task", err);
        }
      });
    }

  }, [apiRef.current]);

  const onTaskChange = async (task) => {
    // Placeholder for future DB update
    try {
      const updates = {
        start_date: task.start instanceof Date ? task.start.toISOString().split("T")[0] : null,
        end_date: task.end instanceof Date ? task.end.toISOString().split("T")[0] : null,
        duration: Number(task.duration) || 1,
        progress: Number(task.progress) || 0,
      };
      console.log("🔄 Updating Task:", updates);
      console.log("✅ Update sent to backend:", task.id, updates);
      await updateOrderStep(task.id, updates);
    } catch (err) {
      console.error("Failed to update task", err);
      alert("Failed to update task. Please try again.");
    }
  };

  const scales = [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    { unit: "day", step: 1, format: "d" },
  ];

  // Handler for creating a new dependency link via drag-and-drop
  const onLinkCreate = async (newLink) => {
    try {
      if (newLink.source === newLink.target) {
        alert("Circular dependency not allowed.");
        return;
      }
      const target = steps.find(s => s.id === newLink.target);
      if (!target) return;

      const existingDeps = Array.isArray(target.dependency_ids) ? target.dependency_ids : [];
      const updatedDeps = [...new Set([...existingDeps, newLink.source])];

      await updateOrderStep(target.id, { dependency_ids: updatedDeps });
    } catch (err) {
      console.error("Failed to create link", err);
    }
  };

  const handleTaskClick = (task) => {
    const step = steps.find(s => s.id === task.id);
    if (step) {
      setSelectedStep(step);
      setShowModal(true);
    }
  };

  // Handler for new task creation via Gantt's built-in "Add" button
  const onTaskAdd = async (newTask) => {
    try {
      // Try to infer group type from parent summary (e.g., find summary task by id)
      const summary = tasks.find(t => t.id === newTask.parent && t.type === "summary");
      const groupType = summary?.text || null;

      const today = new Date();
      const end = new Date(today.getTime() + 2 * 86400000); // default 2-day task

      // Try to infer order_id from newTask, fallback to selectedStep if available
      const orderId = newTask.order_id || selectedStep?.order_id || steps[0]?.order_id;

      await addOrderStep(orderId, {
        description: newTask.text || "New Task",
        start_date: today.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        duration: 2,
        progress: 0,
        type: groupType,
        status: "new",
      });

      onRefresh?.(); // trigger re-fetch of steps
    } catch (err) {
      console.error("Failed to add new task:", err);
      alert("Failed to add new task. Please try again.");
    }
  };

  return (
    <>
      {!isReady ? (
        <p className="text-sm text-gray-400">Preparing tasks...</p>
      ) : (
        <Willow>
          <Gantt
            ref={apiRef}
            tasks={tasks}
            links={links}
            scales={scales}
            taskTypes={taskTypes}
          />
        </Willow>
      )}
      {showModal && selectedStep && (
        <StepModal
          step={selectedStep}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}