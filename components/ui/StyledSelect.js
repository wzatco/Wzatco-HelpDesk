import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function StyledSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  required = false,
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const option = options.find(opt => opt.value === value || opt.name === value);
    setSelectedOption(option || null);
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    const selectedValue = option.value || option.name || option;
    // Always pass the direct value
    if (onChange) {
      onChange(selectedValue);
    }
    setIsOpen(false);
  };

  const displayValue = selectedOption 
    ? (selectedOption.name || selectedOption.value || selectedOption)
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full h-11 px-4 pr-10 rounded-xl border-2 
          ${isOpen 
            ? 'border-violet-500 dark:border-violet-500 ring-2 ring-violet-500/20' 
            : 'border-violet-200 dark:border-slate-600 hover:border-violet-400 dark:hover:border-violet-500'
          }
          bg-white dark:bg-slate-900 
          text-slate-900 dark:text-white 
          focus:outline-none 
          transition-all duration-200 
          cursor-pointer
          flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${!selectedOption ? 'text-slate-500 dark:text-slate-400' : ''}
        `}
      >
        <span className="text-sm font-medium truncate">{displayValue}</span>
        <ChevronDown 
          className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-violet-600 dark:text-violet-400' : ''
          }`} 
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                No options available
              </div>
            ) : (
              options.map((option, index) => {
                const optionValue = option.value || option.name || option;
                const optionLabel = option.name || option.value || option;
                const isSelected = value === optionValue || (selectedOption && selectedOption.value === optionValue);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full px-4 py-3 text-left text-sm
                      transition-all duration-150
                      flex items-center justify-between
                      ${
                        isSelected
                          ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400'
                      }
                    `}
                  >
                    <span>{optionLabel}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

