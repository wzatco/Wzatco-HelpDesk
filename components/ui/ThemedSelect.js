import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function ThemedSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select option',
  className = '',
  disabled = false,
  menuHeight = 220
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = options.find((opt) => opt.value === value) || null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = () => {
    if (!disabled) {
      setOpen((prev) => !prev);
    }
  };

  const handleSelect = (val) => {
    if (disabled) return;
    onChange?.(val);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className={`relative group ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <div
          className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
            open ? 'opacity-100 shadow-lg shadow-violet-500/40' : 'opacity-80'
          } bg-gradient-to-r from-violet-600/70 via-purple-600/70 to-indigo-600/70`}
        ></div>
        <button
          type="button"
          disabled={disabled}
          onClick={toggle}
          className="relative w-full h-12 px-4 rounded-2xl bg-slate-950/60 border border-white/10 text-left flex items-center justify-between text-white focus:outline-none"
        >
          <span className={`text-sm ${selected ? 'text-white font-medium' : 'text-white/70'}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && !disabled && (
        <div className="absolute left-0 right-0 mt-3 rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl z-50 overflow-hidden">
          <div className="backdrop-blur max-h-[70vh]" style={{ maxHeight: menuHeight }}>
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">No options</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    type="button"
                    key={opt.value ?? opt.label}
                    className={`w-full px-4 py-3 flex items-center justify-between text-sm transition-colors ${
                      isSelected ? 'bg-violet-500/20 text-violet-200' : 'text-slate-200 hover:bg-white/5'
                    }`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-violet-200" />}
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

