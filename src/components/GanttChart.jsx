import React from "react";
import { Gantt, ViewMode, Task } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { useEffect, useState } from "react";

const STATUS_COLORS = {
  "closed": "#16a34a",      // green
  "in progress": "#2563eb", // blue
  "hold": "#ea580c",        // orange
  "delayed": "#dc2626",     // red
  "new": "#9ca3af"          // gray
};

export default function GanttChart({
  tasks,
  steps,
  setActiveStep,
  onDateChange,
  onTaskClick,
  viewMode = ViewMode.Day
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const statusAliasMap = {
    open: "in progress",
    closed: "closed",
    hold: "hold"
  };

  const today = new Date();

  const styledTasks = tasks.map(task => {
    const normalizedStatus = task.status?.toLowerCase?.() || "new";
    const statusKey = statusAliasMap[normalizedStatus] || normalizedStatus;

    const isClosed = statusKey === "closed";
    const isDelayed = !isClosed && new Date(task.end) < today;

    const finalStatus = isDelayed ? "delayed" : statusKey;
    const baseColor = STATUS_COLORS[finalStatus] || STATUS_COLORS["new"];
    const fontColor = ["#2563eb", "#16a34a", "#ea580c", "#dc2626"].includes(baseColor)
      ? "#ffffff"
      : "#000000";

    return {
      ...task,
      styles: {
        backgroundColor: baseColor,
        progressColor: baseColor,
        progressSelectedColor: baseColor,
        backgroundSelectedColor: baseColor,
        fontColor
      }
    };
  });

  const handleTaskNameEdit = (taskId, newName) => {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const updated = [...tasks];
      updated[idx].name = newName;
      onTaskClick && onTaskClick(updated[idx]); // optional callback
    }
  };

  const handleTaskClick = (task, event) => {
    const idx = parseInt(task.id.split("-").pop());
    const offset = 16;
    const popupWidth = 320;
    const screenMidX = window.innerWidth / 2;

    const adjustedX = mousePos.x < screenMidX
      ? mousePos.x + offset
      : mousePos.x - popupWidth - offset;

    const adjustedY = Math.min(mousePos.y + offset, window.innerHeight - 350);

    // console.log("Setting popup position", { x: adjustedX, y: adjustedY, step: steps[idx] });

    setActiveStep({ ...steps[idx], popupPosition: { x: adjustedX, y: adjustedY } });
  };

  return (
    <div className="gantt-wrapper">
      <div className="overflow-x-auto border rounded bg-white">
        <div className="relative">
          <Gantt
            tasks={styledTasks}
            viewMode={viewMode}
            listCellWidth="200px"
            onDateChange={onDateChange}
            onSelect={handleTaskClick}
            TaskListHeader={() => <div style={{ padding: 10, fontWeight: 'bold' }}>Name</div>}
            TaskListTable={({ rowHeight, tasks }) => (
              <div>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    style={{ height: rowHeight, padding: "6px 10px", borderBottom: "1px solid #eee", cursor: "pointer" }}
                    onDoubleClick={() => {
                      const newName = prompt("Edit task name:", task.name);
                      if (newName !== null && newName.trim() !== "") {
                        handleTaskNameEdit(task.id, newName.trim());
                      }
                    }}
                  >
                    {task.name}
                  </div>
                ))}
              </div>
            )}
          />
        </div>
      </div>
     
    </div>
  );
}
