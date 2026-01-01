'use client';

export default function ListBlock({ block, isSelected, onSelect, onUpdate }) {
  const { data, styles } = block;
  const { items = ['Item 1', 'Item 2', 'Item 3'], ordered = false } = data;

  const handleItemChange = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    onUpdate({
      data: { ...data, items: newItems },
    });
  };

  const addItem = () => {
    onUpdate({
      data: { ...data, items: [...items, 'New item'] },
    });
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate({
      data: { ...data, items: newItems },
    });
  };

  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        isSelected
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
      } transition-all`}
      onClick={onSelect}
    >
      <ListTag
        style={{
          margin: `${styles?.marginTop || 0} ${styles?.marginRight || 0} ${styles?.marginBottom || 0} ${styles?.marginLeft || 0}`,
          padding: styles?.padding || '0 0 0 1.5rem',
          color: styles?.color || '#475569',
        }}
        className="space-y-2 dark:text-slate-300"
      >
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {isSelected ? (
              <>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  className="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(index);
                  }}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 text-sm"
                >
                  ×
                </button>
              </>
            ) : (
              <span>{item}</span>
            )}
          </li>
        ))}
      </ListTag>
      {isSelected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            addItem();
          }}
          className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
        >
          + Add item
        </button>
      )}
    </div>
  );
}

