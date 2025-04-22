import { Gantt } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import React, { useEffect, useState } from "react";
import { fetchOrderSteps, updateOrderStep } from "../services/orderDetailsService";



export default function ModernGantt({ steps }) {
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);

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

  return <Gantt tasks={tasks} links={links} scales={scales} onTaskChange={onTaskChange} />;
}