import { Gantt } from "wx-react-gantt";
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
    // Group steps by type
    const typeGroups = {};
    const summaryTasks = [];
    const childTasks = [];
    let taskIdCounter = 1000;

    steps.forEach((step, index) => {
      const groupType = step.type || "Uncategorized";
      if (!typeGroups[groupType]) {
        const summaryId = `summary-${groupType}`;
        typeGroups[groupType] = {
          id: summaryId,
          text: groupType,
          start: new Date(),
          end: new Date(),
          duration: 1,
          progress: 0,
          type: "summary",
          parent: 0,
          lazy: false,
        };
        summaryTasks.push(typeGroups[groupType]);
      }

      const start = step.start_date ? new Date(step.start_date) : new Date();
      const end = step.end_date
        ? new Date(step.end_date)
        : step.duration
        ? new Date(start.getTime() + step.duration * 86400000)
        : new Date(start.getTime() + 86400000);

      const child = {
        id: step.id || taskIdCounter++,
        text: step.description || step.status || `Step ${index + 1}`,
        start,
        end,
        duration: step.duration || 1,
        progress: step.progress || 0,
        type: "task",
        parent: typeGroups[groupType].id,
        lazy: false,
      };

      childTasks.push(child);
    });

    // Set summary bounds based on their children
    summaryTasks.forEach(summary => {
      const children = childTasks.filter(t => t.parent === summary.id);
      if (children.length > 0) {
        summary.start = new Date(Math.min(...children.map(c => c.start)));
        summary.end = new Date(Math.max(...children.map(c => c.end)));
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
    }
  };

  const scales = [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    { unit: "day", step: 1, format: "d" },
  ];

  // Handler for creating a new dependency link via drag-and-drop
  const onLinkCreate = async (newLink) => {
    try {
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
      // Try to infer group type from parent summary (e.g., "summary-Design" => "Design")
      const groupType = newTask.parent?.replace("summary-", "") || "Uncategorized";

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
    }
  };

  return (
    <>
      <Gantt
        tasks={tasks}
        links={links}
        scales={scales}
        onTaskChange={onTaskChange}
        onLinkCreate={onLinkCreate}
        onTaskClick={handleTaskClick}
        onTaskAdd={onTaskAdd}
      />
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