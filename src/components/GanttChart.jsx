import React from "react";
import { Gantt, ViewMode, Task } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

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
          onSelect={onTaskClick}
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
