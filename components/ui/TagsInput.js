import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

export default function TagsInput({ 
  value = [], 
  onChange, 
  placeholder = 'Enter tag and press Enter',
  className = ''
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2 p-2 min-h-[42px] border-b-2 border-slate-300 dark:border-slate-600 bg-transparent rounded-lg focus-within:border-blue-500">
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-violet-900 dark:hover:text-violet-100"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-slate-900 dark:text-white focus:outline-none text-sm"
        />
      </div>
      {value.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {value.length} tag{value.length !== 1 ? 's' : ''} added
        </p>
      )}
    </div>
  );
}

