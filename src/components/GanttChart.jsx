import React from "react";
import { Gantt, ViewMode, Task } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { useEffect, useState } from "react";

const STATUS_COLORS = {
  "closed": "#16a34a",
  "in progress": "#2563eb",
  "hold": "#f97316",
  "delayed": "#dc2626",
  "new": "#e5e7eb"
};

export default function GanttChart({
  tasks,
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

  const styledTasks = tasks.map(task => {
    const baseColor = task.styles?.backgroundColor || STATUS_COLORS[task.status] || STATUS_COLORS["new"];
    const fontColor = ["#2563eb", "#16a34a", "#f97316", "#dc2626"].includes(baseColor)
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

  const handleTaskClick = (task, event) => {
    const idx = parseInt(task.id.split("-").pop());
    const offset = 16;
    const popupWidth = 320;
    const screenMidX = window.innerWidth / 2;

    const adjustedX = mousePos.x < screenMidX
      ? mousePos.x + offset
      : mousePos.x - popupWidth - offset;

    const adjustedY = Math.min(mousePos.y + offset, window.innerHeight - 350);

    console.log("Setting popup position", { x: adjustedX, y: adjustedY, step: steps[idx] });

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
            columnWidth={65}
            onDateChange={onDateChange}
            onSelect={handleTaskClick}
          />
        </div>
      </div>
      <div className="flex flex-wrap text-sm mt-6 gap-4 px-2">
        {Object.entries(STATUS_COLORS).map(([label, color]) => (
          <div className="flex items-center gap-2" key={label}>
            <span className="w-4 h-4 rounded inline-block border" style={{ backgroundColor: color }}></span>
            <span className="capitalize">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
