import { Gantt, Willow } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import React, { useEffect, useState } from "react";
import { fetchOrderSteps, updateOrderStep, addOrderStep } from "../services/orderDetailsService";
import StepModal from "./StepModal";

export default function ModernGantt({ steps, onRefresh }) {
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!steps || steps.length === 0) {
      console.warn("No steps found for Gantt rendering.");
      setTasks([]);
      setLinks([]);
      return;
    }

    const toIST = (date) => new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const typeColorMap = {
      Design: "#4caf50",
      Procurement: "#2196f3",
      Fabrication: "#ff9800",
      Installation: "#9c27b0",
    };

    const summaryTasks = [];
    const childTasks = [];
    let taskIdCounter = 1000;

    const groupedSteps = steps.reduce((acc, step) => {
      const type = step.type || null;
      if (!type) return acc;
      if (!acc[type]) acc[type] = [];
      acc[type].push(step);
      return acc;
    }, {});

    Object.entries(groupedSteps).forEach(([type, stepsOfType]) => {
      if (!type) return;

      let summaryId = null;
      const showAsGroup = stepsOfType.length > 1;

      if (showAsGroup) {
        summaryId = `summary-${type}`;
        summaryTasks.push({
          id: summaryId,
          text: type,
          start: null,
          end: null,
          duration: 1,
          progress: 0,
          type: "summary",
          parent: null,
          lazy: false,
          color: typeColorMap[type] || "#607d8b",
        });
      }

      stepsOfType.forEach((step, index) => {
        const start = step.start_date ? toIST(new Date(step.start_date)) : toIST(new Date());
        const end = step.end_date
          ? toIST(new Date(step.end_date))
          : step.duration
          ? toIST(new Date(start.getTime() + step.duration * 86400000))
          : toIST(new Date(start.getTime() + 86400000));

        childTasks.push({
          id: step.id || taskIdCounter++,
          text: step.description || `Step ${index + 1}`,
          start,
          end,
          duration: step.duration || 1,
          progress: step.progress || 0,
          type: "task",
          parent: showAsGroup ? summaryId : null,
          lazy: false,
          color: typeColorMap[type] || "#607d8b",
        });
      });
    });

    // Update summary task start/end bounds
    summaryTasks.forEach(summary => {
      const children = childTasks.filter(t => t.parent === summary.id);
      if (children.length > 0) {
        summary.start = toIST(new Date(Math.min(...children.map(c => c.start.getTime()))));
        summary.end = toIST(new Date(Math.max(...children.map(c => c.end.getTime()))));
      }
    });

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

    console.log("Final Gantt Tasks:", [...summaryTasks, ...childTasks]);
    console.log("Final Gantt Links:", deps);
    setTasks([...summaryTasks, ...childTasks]);
    setLinks(deps);
  }, [steps]);

  const onTaskChange = async (task) => {
    // Placeholder for future DB update
    try {
      const updates = {
        start_date: task.start?.toISOString().split("T")[0],
        end_date: task.end?.toISOString().split("T")[0],
        duration: task.duration,
        progress: task.progress,
      };
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

  // Logging tasks and links every render before sending to <Gantt />
  console.log("🚀 Gantt Tasks:", tasks);
  console.log("🔗 Gantt Links:", links);
  return (
    <>
      <Willow>
        <Gantt
          tasks={tasks}
          links={links}
          scales={scales}
          onTaskChange={onTaskChange}
          onLinkCreate={onLinkCreate}
          onTaskClick={handleTaskClick}
          onTaskAdd={onTaskAdd}
        />
      </Willow>
      {showModal && selectedStep && (
        <StepModal
          step={selectedStep}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            onRefresh?.();  // if passed, triggers parent refresh
          }}
        />
      )}
    </>
  );
}