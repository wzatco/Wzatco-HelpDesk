'use client';

export default function DividerBlock({ block, isSelected, onSelect, onUpdate }) {
  const { styles } = block;

  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        isSelected
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
      } transition-all`}
      onClick={onSelect}
    >
      <hr
        style={{
          borderColor: styles?.borderColor || '#cbd5e1',
          borderWidth: styles?.borderWidth || '1px',
          borderStyle: styles?.borderStyle || 'solid',
          margin: `${styles?.marginTop || '1rem'} ${styles?.marginRight || 0} ${styles?.marginBottom || '1rem'} ${styles?.marginLeft || 0}`,
        }}
        className="dark:border-slate-600"
      />
    </div>
  );
}

