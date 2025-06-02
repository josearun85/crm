import React, { useState, useEffect, useRef, forwardRef } from 'react';

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

const UnitInput = forwardRef(function UnitInput({ value, onChange, onBlur, className = "", placeholder = "Unit", onSelectAndMoveRight, ...props }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredUnits, setFilteredUnits] = useState(defaultUnits);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);

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

  useEffect(() => {
    setHighlightedIdx(0);
  }, [filteredUnits, isOpen]);

  useEffect(() => {
    if (isOpen && listRef.current && filteredUnits.length > 0) {
      const el = listRef.current.children[highlightedIdx];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIdx, isOpen, filteredUnits]);

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleSelect = (unit) => {
    onChange({ target: { value: unit } });
    setIsOpen(false);
    if (onSelectAndMoveRight) {
      setTimeout(() => onSelectAndMoveRight(), 0);
    }
  };

  const handleKeyDown = (e) => {
    if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape')) {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
        e.nativeEvent.stopImmediatePropagation();
      }
      if (e.key === 'ArrowDown') {
        setHighlightedIdx(idx => Math.min(idx + 1, filteredUnits.length - 1));
      } else if (e.key === 'ArrowUp') {
        setHighlightedIdx(idx => Math.max(idx - 1, 0));
      } else if (e.key === 'Enter') {
        if (filteredUnits.length > 0) {
          handleSelect(filteredUnits[highlightedIdx]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }
    // Do NOT block arrow keys if dropdown is closed; let parent handle them
  };

  return (
    <div ref={dropdownRef} className="relative">
      <input
        ref={ref}
        type="text"
        value={value || ''}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={(e) => {
          setTimeout(() => setIsOpen(false), 150);
          if (onBlur) onBlur(e);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full border rounded px-1 py-0.5 ${className}`}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="unit-listbox"
        {...props}
      />
      {isOpen && filteredUnits.length > 0 && (
        <div
          ref={listRef}
          id="unit-listbox"
          role="listbox"
          className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b shadow-lg max-h-48 overflow-y-auto z-50"
        >
          {filteredUnits.map((unit, index) => (
            <div
              key={unit}
              role="option"
              aria-selected={index === highlightedIdx}
              tabIndex={-1}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(unit)}
              className={`px-2 py-1 cursor-pointer hover:bg-gray-100 text-xs border-b border-gray-100 last:border-b-0${index === highlightedIdx ? ' bg-yellow-100' : ''}`}
              style={index === highlightedIdx ? { background: '#fefcbf' } : {}}
            >
              {unit}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default UnitInput;