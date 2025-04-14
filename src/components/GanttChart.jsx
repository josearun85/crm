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
            columnWidth={65}
            onDateChange={onDateChange}
            onSelect={handleTaskClick}
          />
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm mt-6 px-2">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#16a34a] inline-block"></span>
          <span className="text-gray-800 font-medium">Closed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#2563eb] inline-block"></span>
          <span className="text-gray-800 font-medium">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#f97316] inline-block"></span>
          <span className="text-gray-800 font-medium">On Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#dc2626] inline-block"></span>
          <span className="text-gray-800 font-medium">Delayed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#e5e7eb] border border-gray-300 inline-block"></span>
          <span className="text-gray-800 font-medium">New</span>
        </div>
      </div>
    </div>
  );
}
