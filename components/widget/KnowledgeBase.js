// Knowledge Base - Search and browse help articles
'use client';

import { useState, useEffect } from 'react';
import { Search, BookOpen, HelpCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function KnowledgeBase({ onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingArticle, setLoadingArticle] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch articles when category or search changes
  useEffect(() => {
    fetchArticles();
  }, [activeCategory, searchQuery]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/widget/knowledge-base/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeCategory !== 'all') {
        params.append('category', activeCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/widget/knowledge-base/articles?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticle = async (articleId) => {
    try {
      setLoadingArticle(true);
      const response = await fetch(`/api/widget/knowledge-base/articles/${articleId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedArticle(data.article);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoadingArticle(false);
    }
  };

  const handleArticleClick = (article) => {
    fetchArticle(article.id);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  // Show article detail view
  if (selectedArticle) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto p-4">
          {/* Back Button */}
          <button
            onClick={() => setSelectedArticle(null)}
            className="mb-4 flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs">Back to articles</span>
          </button>

          {loadingArticle ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-pink-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Article Header */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  {selectedArticle.category && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-pink-600/20 text-purple-700 dark:text-pink-400 text-[10px] rounded">
                      {selectedArticle.category.name}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">
                    {formatDate(selectedArticle.updatedAt)}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedArticle.title}
                </h2>
              </div>

              {/* Article Content */}
              <div 
                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed article-content"
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                style={{
                  wordBreak: 'break-word',
                }}
              />
              <style dangerouslySetInnerHTML={{__html: `
                .article-content h1, .article-content h2, .article-content h3, .article-content h4 {
                  color: rgb(17, 24, 39);
                  font-weight: 600;
                  margin-top: 1rem;
                  margin-bottom: 0.5rem;
                }
                .dark .article-content h1, .dark .article-content h2, .dark .article-content h3, .dark .article-content h4 {
                  color: #ffffff;
                }
                .article-content h1 { font-size: 1.25rem; }
                .article-content h2 { font-size: 1.125rem; }
                .article-content h3 { font-size: 1rem; }
                .article-content p {
                  margin-bottom: 0.75rem;
                  line-height: 1.6;
                }
                .article-content ul, .article-content ol {
                  margin-left: 1.25rem;
                  margin-bottom: 0.75rem;
                }
                .article-content li {
                  margin-bottom: 0.5rem;
                }
                .article-content a {
                  color: rgb(147, 51, 234);
                  text-decoration: underline;
                }
                .dark .article-content a {
                  color: #ec4899;
                }
                .article-content strong {
                  color: rgb(17, 24, 39);
                  font-weight: 600;
                }
                .dark .article-content strong {
                  color: #ffffff;
                }
                .article-content code {
                  background: rgba(243, 244, 246, 0.8);
                  padding: 0.125rem 0.25rem;
                  border-radius: 0.25rem;
                  font-size: 0.875rem;
                }
                .dark .article-content code {
                  background: rgba(107, 114, 128, 0.3);
                }
                .article-content pre {
                  background: rgba(243, 244, 246, 0.8);
                  padding: 0.75rem;
                  border-radius: 0.5rem;
                  overflow-x: auto;
                  margin-bottom: 0.75rem;
                }
                .dark .article-content pre {
                  background: rgba(17, 24, 39, 0.8);
                }
                .article-content img {
                  max-width: 100%;
                  height: auto;
                  border-radius: 0.5rem;
                  margin: 0.75rem 0;
                }
              `}} />

              {/* Article Footer */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <span>{selectedArticle.views || 0} views</span>
                  {selectedArticle.helpfulVotes > 0 && (
                    <span>{selectedArticle.helpfulVotes} helpful</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show article list view
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-4 flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === 'all'
                ? 'bg-purple-600 dark:bg-pink-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-purple-600 dark:bg-pink-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Articles List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-pink-500" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-xs">No articles found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => handleArticleClick(article)}
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-pink-500 transition-all text-left group"
              >
                <div className="flex items-start space-x-3">
                  <BookOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-pink-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 dark:text-white text-xs font-semibold group-hover:text-purple-600 dark:group-hover:text-pink-400 transition-colors mb-1 line-clamp-2">
                      {article.title}
                    </h4>
                    <div className="flex items-center space-x-2 text-[10px] text-gray-500 dark:text-gray-400">
                      <span>{getCategoryName(article.category?.id)}</span>
                      <span>•</span>
                      <span>{formatDate(article.updatedAt)}</span>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-pink-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

