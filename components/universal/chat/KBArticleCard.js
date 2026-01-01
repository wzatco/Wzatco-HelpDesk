import { BookOpen, ChevronRight } from 'lucide-react';
import { blocksToPlainText, isBlocksContent } from '../../../utils/blockRenderer';

export default function KBArticleCard({ title, excerpt, slug, onClick, articleId, category, article }) {
  const articleUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/knowledge-base/${slug}`
    : `/knowledge-base/${slug}`;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      // If article object is provided, use it; otherwise construct from props
      if (article) {
        onClick(article);
      } else {
        onClick({
          slug,
          id: articleId,
          title,
          excerpt,
          category
        });
      }
    } else {
      window.open(articleUrl, '_blank');
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer hover:border-violet-400 dark:hover:border-violet-500 active:scale-[0.98]"
    >
      {/* Content - Clickable Card */}
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-800/20 flex items-center justify-center shadow-sm">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base leading-snug mb-1.5 line-clamp-2">
            {title}
          </h4>
          {excerpt && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {(() => {
                try {
                  // Get contentType from article prop or excerpt itself
                  const contentType = article?.contentType || (typeof excerpt === 'string' && excerpt.trim().startsWith('[') ? 'blocks' : null);
                  
                  // Check if excerpt is blocks format and convert to plain text
                  if (isBlocksContent(excerpt, contentType)) {
                    try {
                      const plainText = blocksToPlainText(excerpt);
                      // Only return plain text if it's actually different (not just the JSON string) and valid
                      if (plainText && plainText !== excerpt && plainText.length > 0 && !plainText.includes('"type"')) {
                        return plainText;
                      }
                    } catch (e) {
                      // Silently fall through to HTML stripping
                    }
                  }
                  
                  // If excerpt looks like raw JSON, try to parse and convert
                  if (typeof excerpt === 'string') {
                    const trimmed = excerpt.trim();
                    if (trimmed.startsWith('[') && trimmed.includes('"type"')) {
                      try {
                        const plainText = blocksToPlainText(excerpt);
                        if (plainText && plainText !== excerpt && plainText.length > 0 && !plainText.includes('"type"')) {
                          return plainText;
                        }
                      } catch (e) {
                        // If parsing fails, fall through to HTML stripping
                      }
                    }
                  }
                  
                  // Final check: if excerpt still looks like JSON after all attempts, try one more time with more lenient parsing
                  if (typeof excerpt === 'string' && excerpt.trim().startsWith('[')) {
                    // This is definitely JSON, try to extract at least some readable text
                    try {
                      // Try to extract text from JSON structure without full parsing
                      const textMatches = excerpt.match(/"text":\s*"([^"]+)"/g) || excerpt.match(/"content":\s*"([^"]+)"/g);
                      if (textMatches && textMatches.length > 0) {
                        const extractedText = textMatches
                          .map(m => m.match(/"text":\s*"([^"]+)"/)?.[1] || m.match(/"content":\s*"([^"]+)"/)?.[1])
                          .filter(Boolean)
                          .join(' ');
                        if (extractedText && extractedText.length > 0) {
                          return extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : '');
                        }
                      }
                    } catch (e) {
                      // Ignore errors in final attempt
                    }
                    // If all else fails, return a generic message instead of raw JSON
                    return 'Article preview unavailable';
                  }
                  
                  // Strip HTML if present
                  return typeof excerpt === 'string' ? excerpt.replace(/<[^>]*>/g, '') : String(excerpt);
                } catch (e) {
                  // Final fallback - if it looks like JSON, return generic message
                  if (typeof excerpt === 'string' && excerpt.trim().startsWith('[')) {
                    return 'Article preview unavailable';
                  }
                  // Otherwise just strip HTML
                  return typeof excerpt === 'string' ? excerpt.replace(/<[^>]*>/g, '') : String(excerpt);
                }
              })()}
            </p>
          )}
        </div>
        {/* Right Arrow Icon */}
        <div className="flex-shrink-0 flex items-center pt-0.5">
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
        </div>
      </div>
    </div>
  );
}

