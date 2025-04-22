


const tabs = [
  { key: "overview", label: "Overview" },
  { key: "items", label: "Signage Items" },
  { key: "boq", label: "BOQ" },
  { key: "timeline", label: "Timeline" },
  { key: "procurement", label: "Procurement" },
  { key: "files", label: "Files" },
  { key: "notes", label: "Notes" },
];

export default function TabNav({ currentTab, onTabChange }) {
  return (
    <div className="flex gap-4 border-b pb-2 text-sm font-medium">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`px-3 py-2 border-b-2 ${
            key === currentTab
              ? "border-yellow-500 text-yellow-600"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}