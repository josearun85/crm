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
        tasks={tasks}
        viewMode={viewMode}
        listCellWidth="155px"
        columnWidth={65}
        onDateChange={onDateChange}
        onSelect={onTaskClick}
      />
    </div>
  );
}
