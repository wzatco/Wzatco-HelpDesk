import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function MacroAutocomplete({ 
  textareaRef, 
  value, 
  onChange, 
  onSelect,
  isMounted 
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [matchStart, setMatchStart] = useState(-1);
  const [matchText, setMatchText] = useState('');
  const suggestionsRef = useRef(null);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Fetch admin macros and public canned responses on mount
  useEffect(() => {
    const fetchResponses = async () => {
      try {
        setLoadingResponses(true);
        // Fetch both admin macros and public canned responses
        const [macrosRes, cannedRes] = await Promise.all([
          fetch('/api/admin/macros?activeOnly=true').catch(() => ({ json: async () => ({ success: false, data: [] }) })),
          fetch('/api/admin/canned-responses').catch(() => ({ json: async () => ({ success: false, data: [] }) }))
        ]);

        const macrosData = await macrosRes.json();
        const cannedData = await cannedRes.json();

        // Get admin macros
        const adminMacros = macrosData.success && macrosData.data ? macrosData.data : [];
        
        // Get public canned responses (from agents)
        const allCanned = cannedData.success && cannedData.data ? cannedData.data : [];
        const publicCanned = allCanned.filter(cr => cr.isPublic);

        // Transform both to unified format for autocomplete
        const macroResponses = adminMacros
          .filter(m => m.shortcut) // Only include macros with shortcuts
          .map(m => ({
            id: `macro-${m.id}`,
            shortcut: m.shortcut, // Keep original case for display
            shortcutLower: m.shortcut.toLowerCase(), // Normalized for comparison
            content: m.content,
            category: m.category,
            isPublic: false,
            isMacro: true
          }));

        const cannedResponses = publicCanned
          .filter(cr => cr.shortcut) // Only include canned responses with shortcuts
          .map(cr => ({
            id: `canned-${cr.id}`,
            shortcut: cr.shortcut, // Keep original case for display
            shortcutLower: cr.shortcut.toLowerCase(), // Normalized for comparison
            content: cr.content,
            category: cr.category,
            isPublic: true,
            isMacro: false
          }));

        // Deduplicate: If a shortcut exists in both, prioritize admin macros
        const shortcutMap = new Map();
        
        // First, add all macros (they take priority)
        macroResponses.forEach(m => {
          if (m.shortcutLower) {
            shortcutMap.set(m.shortcutLower, m);
          }
        });
        
        // Then, add canned responses only if shortcut doesn't already exist
        cannedResponses.forEach(cr => {
          if (cr.shortcutLower && !shortcutMap.has(cr.shortcutLower)) {
            shortcutMap.set(cr.shortcutLower, cr);
          }
        });

        // Convert map back to array
        setResponses(Array.from(shortcutMap.values()));
      } catch (error) {
        // Silently fail - autocomplete just won't work
      } finally {
        setLoadingResponses(false);
      }
    };

    fetchResponses();
  }, []);

  // Detect `/` and filter suggestions
  useEffect(() => {
    if (!textareaRef?.current || !value) {
      setShowSuggestions(false);
      return;
    }

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    
    // Find the last `/` before cursor
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    // Check if there's a space after the `/` (meaning it's not a macro)
    const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
    const hasSpaceAfterSlash = textAfterSlash.includes(' ');

    if (lastSlashIndex >= 0 && !hasSpaceAfterSlash) {
      // Extract the shortcut text after `/`
      const shortcutText = textAfterSlash.toLowerCase();
      
      // Filter responses that match (use shortcutLower for comparison)
      const filtered = responses.filter(response => 
        (response.shortcutLower || response.shortcut?.toLowerCase() || '').startsWith(shortcutText)
      );

      if (filtered.length > 0) {
        setMatchStart(lastSlashIndex);
        setMatchText(shortcutText);
        setSuggestions(filtered);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value, responses, textareaRef]);

  // Handle selection - using useRef to avoid stale closures
  const handleSelectRef = useRef(null);

  useEffect(() => {
    handleSelectRef.current = (response) => {
      if (!textareaRef?.current || !response) return;

      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);
      const textAfterCursor = value.substring(cursorPos);
      
      // Find the last `/` before cursor
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      
      if (lastSlashIndex >= 0) {
        // Replace `/shortcut` with the full content
        const beforeMatch = value.substring(0, lastSlashIndex);
        const afterMatch = textAfterCursor;
        const newValue = beforeMatch + response.content + (afterMatch ? ' ' + afterMatch : '');
        
        onChange({ target: { value: newValue } });
        
        // Set cursor position after the inserted content
        setTimeout(() => {
          if (textareaRef.current) {
            const newCursorPos = beforeMatch.length + response.content.length;
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            textareaRef.current.focus();
          }
        }, 0);
        
        setShowSuggestions(false);
        
        // Call onSelect callback if provided
        if (onSelect) {
          onSelect(response);
        }
      }
    };
  }, [value, onChange, onSelect, textareaRef]);

  // Keyboard handler
  useEffect(() => {
    if (!textareaRef?.current) return;

    const textarea = textareaRef.current;
    
    const handleKeyDown = (e) => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (handleSelectRef.current) {
          handleSelectRef.current(suggestions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, suggestions, selectedIndex, textareaRef]);


  // Get position for suggestions popup
  const getPopupPosition = () => {
    if (!textareaRef?.current) return { top: 0, left: 0 };

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const cursorPos = textarea.selectionStart;
    
    // Create a temporary span to measure text position
    const textBeforeCursor = value.substring(0, cursorPos);
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'pre-wrap';
    tempSpan.style.font = window.getComputedStyle(textarea).font;
    tempSpan.style.padding = window.getComputedStyle(textarea).padding;
    tempSpan.textContent = textBeforeCursor;
    
    document.body.appendChild(tempSpan);
    const spanRect = tempSpan.getBoundingClientRect();
    document.body.removeChild(tempSpan);

    // Calculate position
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 20;
    const lines = (textBeforeCursor.match(/\n/g) || []).length;
    const top = rect.top + (lines * lineHeight) - 8; // Position above cursor
    const left = rect.left + (spanRect.width - rect.left + rect.x);

    return { top, left };
  };

  if (!isMounted || !showSuggestions || suggestions.length === 0 || typeof window === 'undefined' || !document.body) {
    return null;
  }

  const position = getPopupPosition();

  return createPortal(
    <div
      ref={suggestionsRef}
      className="fixed z-[10000] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto min-w-[280px] max-w-md"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="p-1">
        {suggestions.map((response, index) => (
          <button
            key={response.id}
            type="button"
            onClick={() => handleSelectRef.current && handleSelectRef.current(response)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              index === selectedIndex
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                    /{response.shortcut}
                  </code>
                  {response.isPublic && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">(Public)</span>
                  )}
                  {response.isMacro && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">(Macro)</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {response.content}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

// Export hook for keyboard handling
export function useMacroAutocomplete(textareaRef, showSuggestions) {
  useEffect(() => {
    if (!textareaRef?.current || !showSuggestions) return;

    const textarea = textareaRef.current;
    
    const handleKeyDown = (e) => {
      // This will be handled by the component's internal handler
      // We just need to ensure the textarea doesn't submit on Enter when suggestions are shown
      if ((e.key === 'Enter' || e.key === 'Tab') && showSuggestions) {
        // Prevent default is handled in the component
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [textareaRef, showSuggestions]);
}

