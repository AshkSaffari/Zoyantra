import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const WorkTypeSelector = ({ value, onChange, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Comprehensive list of 50 construction work types
  const workTypes = [
    'Architectural Design',
    'Structural Engineering',
    'Civil Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Plumbing Installation',
    'HVAC Installation',
    'Fire Protection Systems',
    'Concrete Work',
    'Steel Fabrication',
    'Steel Erection',
    'Masonry Work',
    'Brickwork',
    'Blockwork',
    'Stone Work',
    'Roofing',
    'Waterproofing',
    'Insulation',
    'Drywall Installation',
    'Painting',
    'Flooring',
    'Carpentry',
    'Joinery',
    'Glazing',
    'Aluminum Work',
    'Steel Work',
    'Welding',
    'Scaffolding',
    'Excavation',
    'Earthworks',
    'Piling',
    'Foundation Work',
    'Reinforcement Work',
    'Formwork',
    'Crane Operations',
    'Heavy Machinery',
    'Site Preparation',
    'Demolition',
    'Waste Management',
    'Safety Management',
    'Quality Control',
    'Testing & Commissioning',
    'Project Management',
    'Site Supervision',
    'Material Handling',
    'Equipment Maintenance',
    'Environmental Control',
    'Security Services',
    'Cleaning Services',
    'Landscaping'
  ];

  const filteredWorkTypes = workTypes.filter(type =>
    type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (workType) => {
    onChange(workType);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value || 'Select Work Type'}
        </span>
        <div className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search work types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredWorkTypes.length > 0 ? (
              filteredWorkTypes.map((workType, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                  onClick={() => handleSelect(workType)}
                >
                  {workType}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                No work types found
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            {filteredWorkTypes.length} of {workTypes.length} work types
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkTypeSelector;
