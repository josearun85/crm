import React from "react";
import { Gantt, ViewMode } from "gantt-task-react";
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
      name: task.name,
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

    setActiveStep({ ...steps[idx], popupPosition: { x: adjustedX, y: adjustedY } });
  };

  return (
    <div className="gantt-wrapper" style={{ maxWidth: '100vw' }}>
      <div className="task-list-mobile" style={{ display: 'none' }}>
        {steps.map((step, index) => {
          return (
            <div key={index} style={{ margin: '10px 0', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <strong>{step.description}</strong>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto border rounded bg-white">
        <div className="relative">
          <Gantt
            tasks={styledTasks}
            viewMode={viewMode}
            columnWidth={70}
            listCellWidth="300px"
            onDateChange={onDateChange}
            onSelect={handleTaskClick}
          />
        </div>
      </div>

      <style>
        {`
          .gantt .gantt-table .gantt-table-header,
          .gantt .gantt-table .gantt-table-content {
            font-size: 11px;
          }

          @media (max-width: 768px) {
            .task-list-mobile {
              display: block;
            }
            .gantt-wrapper .overflow-x-auto {
              display: none;
            }
            .gantt .gantt-table .gantt-table-header div:nth-child(2),
            .gantt .gantt-table .gantt-table-header div:nth-child(3),
            .gantt .gantt-table .gantt-table-content .gantt-table-row div:nth-child(2),
            .gantt .gantt-table .gantt-table-content .gantt-table-row div:nth-child(3) {
              display: none !important;
            }

            .gantt .gantt-table .gantt-table-header,
            .gantt .gantt-table .gantt-table-content .gantt-table-row {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}
