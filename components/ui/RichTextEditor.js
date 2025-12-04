import { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Heading1, 
  Heading2,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder = "Start typing..." }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = (e) => {
    const content = e.target.innerHTML;
    onChange(content);
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    const content = editorRef.current?.innerHTML || '';
    onChange(content);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const formatHeading = (level) => {
    execCommand('formatBlock', `h${level}`);
  };

  const ToolbarButton = ({ onClick, icon: Icon, title, active = false }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="border border-violet-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-violet-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 flex flex-wrap items-center gap-1">
        <div className="flex items-center gap-1 border-r border-violet-200 dark:border-slate-700 pr-2 mr-2">
          <ToolbarButton onClick={() => execCommand('bold')} icon={Bold} title="Bold (Ctrl+B)" />
          <ToolbarButton onClick={() => execCommand('italic')} icon={Italic} title="Italic (Ctrl+I)" />
          <ToolbarButton onClick={() => execCommand('underline')} icon={Underline} title="Underline (Ctrl+U)" />
        </div>
        
        <div className="flex items-center gap-1 border-r border-violet-200 dark:border-slate-700 pr-2 mr-2">
          <ToolbarButton onClick={() => formatHeading(1)} icon={Heading1} title="Heading 1" />
          <ToolbarButton onClick={() => formatHeading(2)} icon={Heading2} title="Heading 2" />
        </div>
        
        <div className="flex items-center gap-1 border-r border-violet-200 dark:border-slate-700 pr-2 mr-2">
          <ToolbarButton onClick={() => execCommand('insertUnorderedList')} icon={List} title="Bullet List" />
          <ToolbarButton onClick={() => execCommand('insertOrderedList')} icon={ListOrdered} title="Numbered List" />
        </div>
        
        <div className="flex items-center gap-1 border-r border-violet-200 dark:border-slate-700 pr-2 mr-2">
          <ToolbarButton onClick={() => execCommand('justifyLeft')} icon={AlignLeft} title="Align Left" />
          <ToolbarButton onClick={() => execCommand('justifyCenter')} icon={AlignCenter} title="Align Center" />
          <ToolbarButton onClick={() => execCommand('justifyRight')} icon={AlignRight} title="Align Right" />
        </div>
        
        <div className="flex items-center gap-1 border-r border-violet-200 dark:border-slate-700 pr-2 mr-2">
          <ToolbarButton onClick={() => execCommand('undo')} icon={Undo} title="Undo (Ctrl+Z)" />
          <ToolbarButton onClick={() => execCommand('redo')} icon={Redo} title="Redo (Ctrl+Y)" />
        </div>
        
        <div className="flex items-center gap-1">
          <ToolbarButton onClick={insertLink} icon={Link} title="Insert Link" />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`min-h-[300px] max-h-[500px] overflow-y-auto p-4 text-slate-900 dark:text-white focus:outline-none ${
          isFocused ? 'ring-2 ring-violet-500' : ''
        }`}
        style={{
          wordBreak: 'break-word',
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: rgb(148 163 184);
            pointer-events: none;
          }
          [contenteditable] {
            outline: none;
          }
          [contenteditable] p {
            margin: 0.5rem 0;
          }
          [contenteditable] h1 {
            font-size: 2rem;
            font-weight: bold;
            margin: 1rem 0;
          }
          [contenteditable] h2 {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.75rem 0;
          }
          [contenteditable] ul, [contenteditable] ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          [contenteditable] a {
            color: rgb(139 92 246);
            text-decoration: underline;
          }
        `
      }} />
    </div>
  );
}

