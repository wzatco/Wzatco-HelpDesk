import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Calendar, Eye, Loader2 } from 'lucide-react';
import { renderBlocksToHtml, isBlocksContent } from '../../../utils/blockRenderer';

export default function ArticleViewerModal({ article, isOpen, onClose, isMounted }) {
  const [fullArticle, setFullArticle] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch full article content when modal opens
  useEffect(() => {
    if (isOpen && article) {
      // Reset state when modal opens
      setFullArticle(null);
      setLoading(true);
      
      // Try to get slug from article object (could be from metadata or direct article object)
      const articleSlug = article.slug;
      const articleId = article.id || article.articleId;
      
      if (!articleSlug && !articleId) {
        // No slug/id, use provided article as-is
        setFullArticle(article);
        setLoading(false);
        return;
      }
      
      // Try multiple API endpoints
      const endpoints = [];
      if (articleSlug) {
        endpoints.push(`/api/knowledge-base/articles/${articleSlug}`);
      }
      if (articleId) {
        endpoints.push(`/api/widget/knowledge-base/articles/${articleId}`);
      }
      
      if (endpoints.length === 0) {
        setFullArticle(article);
        setLoading(false);
        return;
      }
      
      let completed = false;
      const tryFetch = async (endpointIndex) => {
        if (completed || endpointIndex >= endpoints.length) {
          if (!completed) {
            // All endpoints failed, use provided article as-is
            setFullArticle(article);
            setLoading(false);
          }
          return;
        }
        
        try {
          const response = await fetch(endpoints[endpointIndex]);
          if (response.ok) {
            const data = await response.json();
            // Handle different response formats
            let articleData = null;
            if (data.article) {
              articleData = data.article;
            } else if (data.success && data.article) {
              articleData = data.article;
            } else if (data.content) {
              // Direct article object
              articleData = data;
            }
            
            if (articleData && articleData.content) {
              completed = true;
              setFullArticle(articleData);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          // Continue to next endpoint
        }
        
        // Try next endpoint
        tryFetch(endpointIndex + 1);
      };
      
      tryFetch(0);
    } else if (!isOpen) {
      // Reset when modal closes
      setFullArticle(null);
      setLoading(false);
    }
  }, [isOpen, article]);

  // Use full article if available, otherwise fallback to provided article
  const displayArticle = fullArticle || article;

  if (!isMounted || !isOpen || !article || typeof window === 'undefined' || !document.body) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Mobile: Full Screen, Desktop: Large Centered */}
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[9999] w-full md:w-[95vw] md:max-w-6xl md:max-h-[95vh] bg-white dark:bg-slate-800 flex flex-col overflow-hidden md:rounded-2xl md:shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
              {displayArticle?.title || article.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600 dark:text-violet-400" />
            </div>
          ) : (
            <>
              {/* Meta Information */}
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                {displayArticle?.category && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded">
                    {displayArticle.category.name}
                  </span>
                )}
                {displayArticle?.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(displayArticle.createdAt)}
                  </span>
                )}
                {displayArticle?.views !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {displayArticle.views} views
                  </span>
                )}
              </div>

              {/* Article Content */}
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {displayArticle?.content ? (
                  (() => {
                    // Check if content is blocks format
                    const isBlocks = isBlocksContent(displayArticle.content, displayArticle.contentType);
                    const htmlContent = isBlocks 
                      ? renderBlocksToHtml(displayArticle.content)
                      : displayArticle.content;
                    
                    return (
                      <div 
                        className="article-content"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                        style={{
                          // Ensure safe rendering
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                      />
                    );
                  })()
                ) : displayArticle?.excerpt ? (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {displayArticle.excerpt}
                  </p>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 italic">
                    No content available for this article.
                  </p>
                )}
              </div>

              {/* Tags (if available) */}
              {displayArticle?.tags && displayArticle.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Tags:</span>
                    {displayArticle.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Close Button (Mobile) */}
        <div className="md:hidden sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

