'use client';

export default function BlockRenderer({ blocks }) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  const renderBlock = (block) => {
    const { type, data, styles } = block;

    switch (type) {
      case 'heading':
        const HeadingTag = `h${data.level || 1}`;
        return (
          <HeadingTag
            style={{
              fontSize: styles?.fontSize || `${2.5 - ((data.level || 1) - 1) * 0.3}rem`,
              fontWeight: styles?.fontWeight || 'bold',
              color: styles?.color || '#1e293b',
              textAlign: styles?.textAlign || 'left',
              margin: `${styles?.marginTop || 0} ${styles?.marginRight || 0} ${styles?.marginBottom || 0} ${styles?.marginLeft || 0}`,
              padding: styles?.padding || '0',
            }}
            className="dark:text-white"
          >
            {data.text || 'Heading'}
          </HeadingTag>
        );

      case 'text':
        return (
          <p
            style={{
              fontSize: styles?.fontSize || '1rem',
              lineHeight: styles?.lineHeight || '1.6',
              color: styles?.color || '#475569',
              textAlign: styles?.textAlign || 'left',
              margin: `${styles?.marginTop || 0} ${styles?.marginRight || 0} ${styles?.marginBottom || 0} ${styles?.marginLeft || 0}`,
              padding: styles?.padding || '0',
            }}
            className="dark:text-slate-300"
          >
            {data.content || ''}
          </p>
        );

      case 'image':
        if (!data.url) return null;
        return (
          <figure className="my-4">
            <img
              src={data.url}
              alt={data.alt || ''}
              style={{
                width: styles?.width || '100%',
                borderRadius: styles?.borderRadius || '0.5rem',
              }}
              className="w-full rounded-lg"
            />
            {data.caption && (
              <figcaption className="text-sm text-slate-500 dark:text-slate-400 italic mt-2 text-center">
                {data.caption}
              </figcaption>
            )}
          </figure>
        );

      case 'list':
        const ListTag = data.ordered ? 'ol' : 'ul';
        return (
          <ListTag
            style={{
              margin: `${styles?.marginTop || 0} ${styles?.marginRight || 0} ${styles?.marginBottom || 0} ${styles?.marginLeft || 0}`,
              padding: styles?.padding || '0 0 0 1.5rem',
              color: styles?.color || '#475569',
            }}
            className="space-y-2 dark:text-slate-300"
          >
            {data.items?.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ListTag>
        );

      case 'quote':
        return (
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
            <p>{data.text || ''}</p>
            {data.author && (
              <cite className="text-sm text-slate-500 dark:text-slate-400 block mt-2 not-italic">
                — {data.author}
              </cite>
            )}
          </blockquote>
        );

      case 'divider':
        return (
          <hr
            style={{
              borderColor: styles?.borderColor || '#cbd5e1',
              borderWidth: styles?.borderWidth || '1px',
              borderStyle: styles?.borderStyle || 'solid',
              margin: `${styles?.marginTop || '1rem'} ${styles?.marginRight || 0} ${styles?.marginBottom || '1rem'} ${styles?.marginLeft || 0}`,
            }}
            className="dark:border-slate-600"
          />
        );

      case 'button':
        const getButtonClasses = () => {
          const base = 'inline-block px-6 py-3 rounded-lg font-semibold transition-all';
          switch (data.style) {
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
          <div className="flex justify-center my-4">
            <a href={data.url || '#'} className={getButtonClasses()}>
              {data.text || 'Click Me'}
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={block.id || index}>
          {renderBlock(block)}
        </div>
      ))}
    </div>
  );
}

