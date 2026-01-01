// Knowledge Base View for Widget
'use client';

import { useState, useEffect } from 'react';
import { Search, BookOpen, ArrowLeft, ExternalLink } from 'lucide-react';

export default function KnowledgeBaseView({ userInfo, onBack }) {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, []);

  const handleArticleClick = (article) => {
    // Open article in new tab on knowledge base landing page
    const articleSlug = article.slug || article.id;
    const articleUrl = `/knowledge-base/${articleSlug}`;
    window.open(articleUrl, '_blank');
  };

  // Listen for article open event from chat
  useEffect(() => {
    const handleOpenArticle = (event) => {
      const { articleId, articleSlug } = event.detail;
      if (articleSlug) {
        // Open directly with slug
        window.open(`/knowledge-base/${articleSlug}`, '_blank');
      } else if (articleId) {
        // Find article by ID and get slug
        const article = articles.find(a => a.id === articleId);
        if (article) {
          window.open(`/knowledge-base/${article.slug || article.id}`, '_blank');
        }
      }
    };

    window.addEventListener('open-kb-article', handleOpenArticle);
    return () => {
      window.removeEventListener('open-kb-article', handleOpenArticle);
    };
  }, [articles]);

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

  const fetchArticles = async (category = 'all', search = '') => {
    setLoading(true);
    try {
      let url = '/api/widget/knowledge-base/articles';
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (search) params.append('search', search);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url);
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

  useEffect(() => {
    fetchArticles(selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 animate-slide-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={onBack}
          className="p-1 hover:bg-white/20 rounded transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center space-x-2 flex-1">
          <BookOpen className="w-4 h-4" />
          <h2 className="text-xs sm:text-sm font-semibold">Knowledge Base</h2>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-purple-600 dark:bg-pink-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 dark:bg-pink-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Articles List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-white dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">Loading articles...</div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-50" />
            <p className="text-xs sm:text-sm">No articles found</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => handleArticleClick(article)}
                className="w-full p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors group border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-pink-400 transition-colors">
                  {article.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {article.category?.name || 'Uncategorized'}
                  </span>
                  <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-pink-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

