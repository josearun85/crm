import { useState, useEffect, useRef } from 'react';

const defaultUnits = [
  'nos',
  'kg',
  'm',
  'cm', 
  'mm',
  'ft',
  'inch',
  'set',
  'box',
  'sheet',
  'trip',
  'km',
  'hour',
  'day',
  'lump sum'
];

export default function UnitInput({ value, onChange, onBlur, className = "", placeholder = "Unit", ...props }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredUnits, setFilteredUnits] = useState(defaultUnits);
  const dropdownRef = useRef(null);

  // Filter units based on input value
  useEffect(() => {
    if (value) {
      const filtered = defaultUnits.filter(unit =>
        unit.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredUnits(filtered);
    } else {
      setFilteredUnits(defaultUnits);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleSelect = (unit) => {
    onChange({ target: { value: unit } });
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filteredUnits.length > 0) {
      e.preventDefault();
      handleSelect(filteredUnits[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        value={value || ''}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={(e) => {
          // Delay closing to allow for click on suggestion
          setTimeout(() => setIsOpen(false), 150);
          if (onBlur) onBlur(e);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full border rounded px-1 py-0.5 ${className}`}
        {...props}
      />
      
      {isOpen && filteredUnits.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b shadow-lg max-h-48 overflow-y-auto z-50">
          {filteredUnits.map((unit, index) => (
            <div
              key={unit}
              onClick={() => handleSelect(unit)}
              className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-xs border-b border-gray-100 last:border-b-0"
            >
              {unit}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}