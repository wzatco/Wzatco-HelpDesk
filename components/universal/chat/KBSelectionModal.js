import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, BookOpen, X, ArrowLeft, Loader2, Send } from 'lucide-react';
import StyledSelect from '../../ui/StyledSelect';
import { renderBlocksToHtml, isBlocksContent, blocksToPlainText } from '../../../utils/blockRenderer';

// Helper function to strip HTML and get clean excerpt
const getCleanExcerpt = (htmlContent, length = 150) => {
  if (!htmlContent) return '';
  
  // 1. Remove <style> and <script> blocks entirely
  let text = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                        
  // 2. Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // 3. Decode common entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&apos;/g, "'");

  // 4. Clean up whitespace (multiple spaces/newlines to single space)
  text = text.replace(/\s+/g, ' ').trim();
  
  // 5. Trim and Truncate
  return text.length > length ? text.substring(0, length) + '...' : text;
};

export default function KBSelectionModal({ isOpen, onClose, onSend, isMounted }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'preview'
  const [fullArticleContent, setFullArticleContent] = useState(null);
  const [isLoadingFullArticle, setIsLoadingFullArticle] = useState(false);

  // Debounce search query (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories
  useEffect(() => {
    if (!isOpen) return;

    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await fetch('/api/public/knowledge-base/categories');
        const data = await response.json();

        if (data.success) {
          setCategories(data.categories || []);
        }
      } catch (err) {
        // Silently fail - categories are optional
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isOpen]);

  // Fetch articles
  useEffect(() => {
    if (!isOpen) return;

    const fetchArticles = async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) {
          params.append('search', debouncedSearch);
        }
        if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== '') {
          params.append('categoryId', selectedCategory);
        }

        const apiUrl = `/api/public/knowledge-base/articles${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.success) {
          setArticles(data.articles || []);
        }
      } catch (err) {
        console.error('Error fetching articles:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, [debouncedSearch, selectedCategory, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setDebouncedSearch('');
      setSelectedCategory('');
      setSelectedArticle(null);
      setViewMode('list');
      setFullArticleContent(null);
      setIsLoadingFullArticle(false);
    }
  }, [isOpen]);

  const handleArticleClick = async (article) => {
    setSelectedArticle(article);
    setViewMode('preview');
    setFullArticleContent(null);
    
    // Fetch full article content
    if (article.slug || article.id) {
      setIsLoadingFullArticle(true);
      try {
        // Try slug endpoint first, then ID endpoint
        const endpoint = article.slug 
          ? `/api/knowledge-base/articles/${article.slug}`
          : `/api/widget/knowledge-base/articles/${article.id}`;
        
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          // Format 1: { article: { content: ... } } (from /api/knowledge-base/articles/[slug])
          // Format 2: { success: true, article: { content: ... } } (from /api/widget/knowledge-base/articles/[id])
          let articleData = null;
          if (data.article) {
            articleData = data.article;
          } else if (data.success && data.article) {
            articleData = data.article;
          } else {
            articleData = data;
          }
          
          if (articleData && articleData.content) {
            // Check if content is blocks format and convert to HTML
            const isBlocks = isBlocksContent(articleData.content, articleData.contentType);
            const htmlContent = isBlocks 
              ? renderBlocksToHtml(articleData.content)
              : articleData.content;
            setFullArticleContent(htmlContent);
          } else {
            // Fallback to excerpt if content not available
            setFullArticleContent(article.excerpt || '');
          }
        } else {
          // Fallback to excerpt if API fails
          setFullArticleContent(article.excerpt || '');
        }
      } catch (err) {
        // Fallback to excerpt on error
        setFullArticleContent(article.excerpt || '');
      } finally {
        setIsLoadingFullArticle(false);
      }
    } else {
      // No slug or ID, use excerpt
      setFullArticleContent(article.excerpt || '');
    }
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedArticle(null);
  };

  const handleSend = () => {
    if (selectedArticle && onSend) {
      onSend(selectedArticle);
      onClose();
    }
  };

  if (!isMounted || !isOpen || typeof window === 'undefined' || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${viewMode === 'preview' ? 'max-w-5xl' : 'max-w-2xl'} max-h-[95vh] flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          {viewMode === 'preview' ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          ) : (
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Share Knowledge Base Article
            </h2>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'list' ? (
            <>
              {/* Search and Filter */}
              <div className="mb-4 space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400"
                    autoFocus
                  />
                </div>

                {/* Category Dropdown */}
                <StyledSelect
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory(value)}
                  placeholder="All Categories"
                  options={[
                    { value: '', name: 'All Categories' },
                    ...categories.map((category) => ({
                      value: category.id,
                      name: category.name
                    }))
                  ]}
                  className="w-full"
                />
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600 dark:text-violet-400" />
                </div>
              )}

              {/* Articles List */}
              {!isLoading && (
                <>
                  {articles.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        {searchTerm || selectedCategory ? 'No articles found' : 'No articles available'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {articles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => handleArticleClick(article)}
                          className="w-full text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                {article.title}
                              </h3>
                              {article.excerpt && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                  {(() => {
                                    // Check if excerpt is blocks format and convert to plain text
                                    if (isBlocksContent(article.excerpt, article.contentType)) {
                                      const plainText = blocksToPlainText(article.excerpt);
                                      return plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;
                                    }
                                    // Use existing getCleanExcerpt for non-block content
                                    return getCleanExcerpt(article.excerpt, 120);
                                  })()}
                                </p>
                              )}
                              {article.category && (
                                <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded">
                                  {article.category.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* Preview Mode - Full Article */
            selectedArticle && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    {selectedArticle.title}
                  </h3>
                  {selectedArticle.category && (
                    <span className="inline-block px-3 py-1 text-sm bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-md font-medium">
                      {selectedArticle.category.name}
                    </span>
                  )}
                </div>
                
                {/* Loading State */}
                {isLoadingFullArticle && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600 dark:text-violet-400" />
                    <span className="ml-3 text-slate-600 dark:text-slate-400">Loading article content...</span>
                  </div>
                )}
                
                {/* Full Article Content */}
                {!isLoadingFullArticle && fullArticleContent && (
                  <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-ul:text-slate-700 dark:prose-ul:text-slate-300 prose-ol:text-slate-700 dark:prose-ol:text-slate-300">
                    <div 
                      dangerouslySetInnerHTML={{ __html: fullArticleContent }}
                      className="article-content"
                    />
                  </div>
                )}
                
                {/* Fallback if no content */}
                {!isLoadingFullArticle && !fullArticleContent && (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Article content not available</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This article will be shared with the customer. They can click to view the full article.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer - Only show in preview mode */}
        {viewMode === 'preview' && selectedArticle && (
          <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3 rounded-b-2xl">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={handleSend}
              className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Article
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

