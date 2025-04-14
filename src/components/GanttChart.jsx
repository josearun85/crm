import React from "react";
import { Gantt, ViewMode, Task } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

export default function GanttChart({
  tasks,
  onDateChange,
  onTaskClick,
  viewMode = ViewMode.Day
}) {
  return (
    <div className="gantt-wrapper">
      <Gantt
        tasks={tasks.map(task => ({
          ...task,
          styles: {
            backgroundColor: task.styles?.backgroundColor || "#e5e7eb",
            progressColor: task.styles?.backgroundColor || "#e5e7eb",
            progressSelectedColor: task.styles?.backgroundColor || "#e5e7eb",
            backgroundSelectedColor: task.styles?.backgroundColor || "#e5e7eb"
          }
        }))}
        viewMode={viewMode}
        listCellWidth="155px"
        columnWidth={65}
        onDateChange={onDateChange}
        onSelect={onTaskClick}
      />
    </div>
  );
}
