'use client';

export default function HeadingBlock({ block, isSelected, onSelect, onUpdate }) {
  const { data, styles } = block;
  const { text = 'Heading', level = 1 } = data;
  const HeadingTag = `h${level}`;

  const handleTextChange = (e) => {
    onUpdate({
      data: { ...data, text: e.target.textContent },
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
      <HeadingTag
        contentEditable={isSelected}
        suppressContentEditableWarning
        onBlur={handleTextChange}
        style={{
          fontSize: styles?.fontSize || `${2.5 - (level - 1) * 0.3}rem`,
          fontWeight: styles?.fontWeight || 'bold',
          color: styles?.color || '#1e293b',
          textAlign: styles?.textAlign || 'left',
          margin: `${styles?.marginTop || 0} ${styles?.marginRight || 0} ${styles?.marginBottom || 0} ${styles?.marginLeft || 0}`,
          padding: styles?.padding || '0',
          outline: 'none',
        }}
        className="focus:outline-none dark:text-white"
      >
        {text}
      </HeadingTag>
    </div>
  );
}

