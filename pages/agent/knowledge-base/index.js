// Agent Knowledge Base Page - Read-only view of published articles
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AgentLayout from '../../../components/agent/universal/AgentLayout';
import { Search, BookOpen, Eye, Calendar, Tag, ExternalLink, Link2, Copy, Check } from 'lucide-react';
import StyledSelect from '../../../components/ui/StyledSelect';
import { blocksToPlainText, isBlocksContent } from '../../../utils/blockRenderer';

// Helper function to strip HTML and get clean excerpt
const getCleanExcerpt = (content, contentType, length = 150) => {
  if (!content) return '';
  
  // Check if content is blocks format
  if (isBlocksContent(content, contentType)) {
    const plainText = blocksToPlainText(content);
    return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
  }
  
  // 1. Remove <style> and <script> blocks entirely
  let text = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
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

export default function AgentKnowledgeBasePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  // Debounce search query (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
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
  }, []);

  // Fetch articles
  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) {
          params.append('search', debouncedSearch);
        }
        if (selectedCategory && selectedCategory !== 'all') {
          params.append('categoryId', selectedCategory);
        }

        const apiUrl = `/api/public/knowledge-base/articles${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.success) {
          setArticles(data.articles || []);
        } else {
          setError(data.message || 'Failed to load articles');
        }
      } catch (err) {
        setError('Failed to load articles. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, [debouncedSearch, selectedCategory]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Copy link to clipboard
  const handleCopyLink = async (slug) => {
    const articleUrl = `${window.location.origin}/knowledge-base/${slug}`;
    
    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopiedLink(slug);
      setToast({ show: true, message: 'Link copied to clipboard!' });
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedLink(null);
      }, 2000);

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast({ show: false, message: '' });
      }, 3000);
    } catch (err) {
      setToast({ show: true, message: 'Failed to copy link' });
      setTimeout(() => {
        setToast({ show: false, message: '' });
      }, 3000);
    }
  };

  return (
    <AgentLayout currentPage="Knowledge Base">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-violet-600 dark:text-violet-400" />
            Knowledge Base
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search and view published articles to assist customers
          </p>
        </div>

        {/* Controls Area */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-64">
            <StyledSelect
              value={selectedCategory}
              onChange={(e) => {
                const value = e?.target?.value ?? e;
                setSelectedCategory(value);
              }}
              placeholder="All Categories"
              options={[
                { value: '', name: 'All Categories' },
                ...categories.map((category) => ({
                  value: category.id,
                  name: `${category.name} (${category.articleCount || 0})`
                }))
              ]}
              className="w-full"
            />
          </div>
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div className="fixed bottom-6 right-6 z-[10000] animate-slide-in-right">
            <div className="px-5 py-4 rounded-xl shadow-2xl border-2 border-green-400 bg-green-500 dark:bg-green-600 text-white backdrop-blur-sm min-w-[280px]">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{toast.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Loading articles...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              {error}
            </p>
          </div>
        )}

        {/* Articles Grid - 2 Columns */}
        {!isLoading && !error && (
          <>
            {articles.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
                  {searchTerm || selectedCategory ? 'No articles found' : 'No articles available'}
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm">
                  {searchTerm || selectedCategory ? 'Try a different search term or category' : 'Articles will appear here once published'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow flex flex-col"
                  >
                    {/* Title */}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {article.title}
                    </h3>

                    {/* Category & Tags */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {article.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium rounded">
                          <Tag className="w-3 h-3" />
                          {article.category.name}
                        </span>
                      )}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {article.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{article.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 flex-1">
                        {getCleanExcerpt(article.excerpt, article.contentType, 200)}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      {article.views !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {article.views} views
                        </span>
                      )}
                      {article.createdAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(article.createdAt)}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <a
                        href={`/knowledge-base/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </a>
                      <button
                        onClick={() => handleCopyLink(article.slug)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                        title="Copy article link"
                      >
                        {copiedLink === article.slug ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Link2 className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Results Count */}
        {!isLoading && !error && articles.length > 0 && (
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            Showing {articles.length} article{articles.length !== 1 ? 's' : ''}
            {searchTerm && ` for "${searchTerm}"`}
            {selectedCategory && selectedCategory !== '' && categories.find(c => c.id === selectedCategory) && ` in "${categories.find(c => c.id === selectedCategory).name}"`}
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
