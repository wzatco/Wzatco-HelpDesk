'use client';

export default function TextBlock({ block, isSelected, onSelect, onUpdate }) {
  const { data, styles } = block;
  const { content = 'Enter your text here...' } = data;

  const handleContentChange = (e) => {
    onUpdate({
      data: { ...data, content: e.target.textContent },
    });
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        isSelected
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
      } transition-all`}
      onClick={onSelect}
    >
      <p
        contentEditable={isSelected}
        suppressContentEditableWarning
        onBlur={handleContentChange}
        style={{
          fontSize: styles?.fontSize || '1rem',
          lineHeight: styles?.lineHeight || '1.6',
          color: styles?.color || '#475569',
          textAlign: styles?.textAlign || 'left',
          margin: `${styles?.marginTop || 0} ${styles?.marginRight || 0} ${styles?.marginBottom || 0} ${styles?.marginLeft || 0}`,
          padding: styles?.padding || '0',
          outline: 'none',
        }}
        className="focus:outline-none dark:text-slate-300 min-h-[1.5rem]"
      >
        {content}
      </p>
    </div>
  );
}

