import { useState, useEffect, useRef } from 'react'
import supabase from '../supabaseClient'

export default function SalesStageSelect({ value, onChange, name = "sales_stage", placeholder = "Select Sales Stage" }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dbStages, setDbStages] = useState([])
  const [filteredOptions, setFilteredOptions] = useState([])
  const dropdownRef = useRef(null)

  // Default sales funnel stages
  const defaultStages = [
    'Lead',
    'Qualified Lead',
    'Initial Contact',
    'Needs Assessment',
    'Proposal Sent',
    'Negotiation',
    'Contract Review',
    'Closed Won',
    'Closed Lost',
    'Follow Up',
    'Quotation Pending',
    'Site Visit Scheduled',
    'Design Phase',
    'Approval Pending',
    'Production',
    'Installation',
    'Payment Pending',
    'Completed'
  ]

  // Fetch unique sales stages from database
  useEffect(() => {
    const fetchSalesStages = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('sales_stage')
          .not('sales_stage', 'is', null)
          .not('sales_stage', 'eq', '')

        if (!error && data) {
          const uniqueStages = [...new Set(data.map(item => item.sales_stage).filter(Boolean))]
          setDbStages(uniqueStages)
        }
      } catch (error) {
        console.error('Error fetching sales stages:', error)
      }
    }

    fetchSalesStages()
  }, [])

  // Combine and filter options
  useEffect(() => {
    const allStages = [...new Set([...defaultStages, ...dbStages])]
    const filtered = allStages.filter(stage =>
      stage.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredOptions(filtered)
  }, [searchTerm, dbStages])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (stage) => {
    onChange({ target: { name, value: stage } })
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleInputClick = () => {
    setIsOpen(!isOpen)
    setSearchTerm('')
  }

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
    // Also update the actual value for custom entries
    onChange({ target: { name, value: e.target.value } })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault()
      handleSelect(filteredOptions[0])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={isOpen ? searchTerm : value}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      />
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((stage, index) => (
              <div
                key={index}
                onClick={() => handleSelect(stage)}
                style={{
                  padding: '0.5rem',
                  cursor: 'pointer',
                  borderBottom: index < filteredOptions.length - 1 ? '1px solid #f0f0f0' : 'none',
                  backgroundColor: 'white',
                  ':hover': { backgroundColor: '#f5f5f5' }
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                {stage}
                {dbStages.includes(stage) && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: '#666', 
                    marginLeft: '0.5rem' 
                  }}>
                    (used before)
                  </span>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '0.5rem', color: '#666', fontStyle: 'italic' }}>
              No matching stages found
            </div>
          )}
        </div>
      )}
    </div>
  )
}