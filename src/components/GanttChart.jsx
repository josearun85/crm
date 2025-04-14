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
    <div className="gantt-wrapper overflow-x-auto">
      <Gantt
        tasks={tasks.map(task => {
          const backgroundColor = task.styles?.backgroundColor || "#e5e7eb";
          const fontColor = ['#16a34a', '#2563eb', '#f97316', '#dc2626'].includes(backgroundColor)
            ? "#fff" : "#000";
          return {
            ...task,
            styles: {
              backgroundColor,
              progressColor: backgroundColor,
              progressSelectedColor: backgroundColor,
              backgroundSelectedColor: backgroundColor,
              fontColor
            }
          };
        })}
        viewMode={viewMode}
        listCellWidth="180px"
        columnWidth={65}
        onDateChange={onDateChange}
        onSelect={onTaskClick}
      />
    </div>
  );
}
