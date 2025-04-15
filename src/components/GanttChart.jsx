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
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editedName, setEditedName] = useState("");

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
      name: editingTaskId === task.id ? (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={() => {
            const idx = tasks.findIndex(t => t.id === task.id);
            if (idx !== -1 && editedName.trim()) {
              const updated = [...tasks];
              updated[idx].name = editedName.trim();
              onTaskClick && onTaskClick(updated[idx]);
            }
            setEditingTaskId(null);
          }}
          onInput={(e) => setEditedName(e.currentTarget.textContent)}
          className="border px-2 text-xs"
          style={{ width: "90%" }}
        >
          {editedName}
        </div>
      ) : (
        <span
          className="cursor-pointer text-sm"
          onDoubleClick={() => handleTaskNameEdit(task.id)}
        >
          {task.name}
        </span>
      ),
      nameEditable: true,
      styles: {
        backgroundColor: baseColor,
        progressColor: baseColor,
        progressSelectedColor: baseColor,
        backgroundSelectedColor: baseColor,
        fontColor
      }
    };
  });

  const handleTaskNameEdit = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditedName(task.name);
      setEditingTaskId(taskId);
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

    setActiveStep({ ...steps[idx], popupPosition: { x: adjustedX, y: adjustedY } });
  };

  return (
    <div className="gantt-wrapper">
      <div className="overflow-x-auto border rounded bg-white">
        <div className="relative">
          <Gantt
            tasks={styledTasks}
            viewMode={viewMode}
            columnWidth={70}
            listCellWidth="300px"
            onDateChange={onDateChange}
            onSelect={(task, e) => {
              if (e.detail === 2) {
                handleTaskNameEdit(task.id);
              } else {
                handleTaskClick(task, e);
              }
            }}
            onExpanderClick={(task) => handleTaskNameEdit(task.id)}
          />
        </div>
      </div>
      <style>
        {`
          .gantt .gantt-table .gantt-table-header,
          .gantt .gantt-table .gantt-table-content {
            font-size: 11px;
          }
        `}
      </style>
    </div>
  );
}
