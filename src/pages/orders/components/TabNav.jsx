const tabs = [
  { key: "items", label: "Signage Items" },
  { key: "items-refactored", label: "Signage Items (New)" }, // Add new tab for refactored version
  { key: "estimate", label: "Estimate" }, // New Estimate tab
  { key: "invoice", label: "Invoice" },   // New Invoice tab
  { key: "boq", label: "BOQ" },
  { key: "timeline", label: "Timeline" },
  { key: "procurement", label: "Procurement" },
  { key: "payments", label: "Payments" },
  { key: "files", label: "Files" },
  { key: "notes", label: "Notes" },
  { key: "miscellaneous", label: "Miscellaneous" }, // Added Miscellaneous tab
];

export default function TabNav({ currentTab, onTabChange }) {
  return (
    <div className="flex flex-col bg-white no-print">
      <div className="flex gap-2 pb-2 text-sm font-medium bg-white">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-[10px] py-[6px] rounded-[4px] font-medium transition-colors
              ${key === currentTab
                ? 'bg-[#f6d251] text-black font-semibold z-10'
                : 'bg-white text-black hover:bg-[#f6d251]'}
            `}
            style={{ border: 'none', outline: 'none' }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative h-[4px] w-full mt-[-8px]">
        <div className="absolute left-0 right-0 h-[4px] bg-[#f6d251] w-full rounded-b" style={{ zIndex: 0 }} />
      </div>
    </div>
  );
}