'use client';

export default function ButtonBlock({ block, isSelected, onSelect, onUpdate }) {
  const { data, styles } = block;
  const { text = 'Click Me', url = '#', style = 'primary' } = data;

  const handleTextChange = (e) => {
    onUpdate({
      data: { ...data, text: e.target.value },
    });
  };

  const handleUrlChange = (e) => {
    onUpdate({
      data: { ...data, url: e.target.value },
    });
  };

  const handleStyleChange = (e) => {
    onUpdate({
      data: { ...data, style: e.target.value },
    });
  };

  const getButtonClasses = () => {
    const base = 'px-6 py-3 rounded-lg font-semibold transition-all';
    switch (style) {
      case 'primary':
        return `${base} bg-violet-600 hover:bg-violet-700 text-white`;
      case 'secondary':
        return `${base} bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white`;
      case 'outline':
        return `${base} border-2 border-violet-600 text-violet-600 hover:bg-violet-50 dark:border-violet-400 dark:text-violet-400 dark:hover:bg-violet-900/20`;
      default:
        return base;
    }
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
      {isSelected ? (
        <div className="space-y-3">
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Button text"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="Button URL"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <select
            value={style}
            onChange={handleStyleChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="outline">Outline</option>
          </select>
          <div className="flex justify-center">
            <a href={url} className={getButtonClasses()}>
              {text}
            </a>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <a href={url} className={getButtonClasses()}>
            {text}
          </a>
        </div>
      )}
    </div>
  );
}

