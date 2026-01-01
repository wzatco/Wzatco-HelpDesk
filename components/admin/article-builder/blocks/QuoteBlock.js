'use client';

export default function QuoteBlock({ block, isSelected, onSelect, onUpdate }) {
  const { data, styles } = block;
  const { text = 'Quote text', author = '' } = data;

  const handleTextChange = (e) => {
    onUpdate({
      data: { ...data, text: e.target.textContent },
    });
  };

  const handleAuthorChange = (e) => {
    onUpdate({
      data: { ...data, author: e.target.value },
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
      <blockquote
        style={{
          borderLeft: '4px solid',
          borderColor: styles?.borderColor || '#8b5cf6',
          paddingLeft: styles?.paddingLeft || '1rem',
          margin: `${styles?.marginTop || 0} ${styles?.marginRight || 0} ${styles?.marginBottom || 0} ${styles?.marginLeft || 0}`,
          fontStyle: 'italic',
          color: styles?.color || '#475569',
        }}
        className="dark:text-slate-300"
      >
        {isSelected ? (
          <>
            <p
              contentEditable
              suppressContentEditableWarning
              onBlur={handleTextChange}
              className="focus:outline-none min-h-[1.5rem]"
            >
              {text}
            </p>
            <input
              type="text"
              value={author}
              onChange={handleAuthorChange}
              placeholder="Author (optional)"
              className="mt-2 text-sm text-slate-500 dark:text-slate-400 bg-transparent border-none outline-none w-full"
            />
          </>
        ) : (
          <>
            <p>{text}</p>
            {author && (
              <cite className="text-sm text-slate-500 dark:text-slate-400 block mt-2">
                — {author}
              </cite>
            )}
          </>
        )}
      </blockquote>
    </div>
  );
}

