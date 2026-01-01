// WZATCO Knowledge Base Landing Page
'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/public/Header';
import Sidebar from '../components/public/Sidebar';
import CustomerWidget from '../components/widget/CustomerWidget';
import { Search, BookOpen, ArrowRight, Eye, Calendar } from 'lucide-react';

export default function KnowledgeBaseLanding() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery || selectedCategory !== 'all') {
      fetchArticles();
    } else {
      fetchData();
    }
  }, [searchQuery, selectedCategory]);

  const fetchData = async () => {
    try {
      const [articlesRes, categoriesRes] = await Promise.all([
        fetch('/api/public/knowledge-base/articles'),
        fetch('/api/public/knowledge-base/categories')
      ]);

      const articlesData = await articlesRes.json();
      const categoriesData = await categoriesRes.json();

      if (articlesData.success) {
        setArticles(articlesData.articles);
      }
      if (categoriesData.success) {
        setCategories(categoriesData.categories);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/public/knowledge-base/articles?${params}`);
      const data = await response.json();

      if (data.success) {
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const filteredArticles = articles.filter(article => {
    if (selectedCategory !== 'all' && article.category?.id !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <>
      <Head>
        <title>WZATCO Knowledge Base - Projector Support & Guides</title>
        <meta name="description" content="Comprehensive knowledge base for WZATCO projectors. Find setup guides, troubleshooting tips, and support articles." />
      </Head>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Header onSearch={handleSearch} />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Hidden on mobile, visible on md+ */}
          <div className="hidden md:block">
            <Sidebar categories={categories} articles={articles} currentArticleSlug={null} />
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto w-full">
            <div className="max-w-none mx-auto space-y-4 sm:space-y-6 p-4 sm:p-6 pb-8">
              {/* Welcome 2026 Banner */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-600 p-4 sm:p-6 shadow-lg border-2 border-emerald-400/50 dark:border-emerald-500/50">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent dark:from-black/20"></div>
                <div className="relative z-10 text-center">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
                    <span className="bg-white/20 dark:bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm inline-block">
                      Welcome <span className="text-yellow-300 dark:text-yellow-200 font-black">2026</span> <span className="text-emerald-100 dark:text-emerald-200 font-bold">TEST</span>
                    </span>
                  </h2>
                  <p className="text-white/90 dark:text-white/80 text-sm sm:text-base font-medium">Happy New Year! 🎉</p>
                </div>
                <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/20 rounded-full blur-xl"></div>
                <div className="absolute -bottom-5 -left-5 w-16 h-16 bg-white/20 rounded-full blur-xl"></div>
              </div>

              {/* Hero Section */}
              <div>
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-violet-800 dark:via-violet-900 dark:to-purple-950 p-4 sm:p-6 md:p-8 text-white shadow-2xl">
                  <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 flex items-center gap-2 sm:gap-3">
                          <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
                          Knowledge Base
                        </h1>
                        <p className="text-violet-100 dark:text-violet-200 text-sm sm:text-base md:text-lg">Find answers, guides, and support for your projector</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full hidden sm:block"></div>
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full hidden sm:block"></div>
                </div>
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        selectedCategory === 'all'
                          ? 'bg-violet-600 text-white hover:bg-violet-700'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      All Articles
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results Info */}
              {(searchQuery || selectedCategory !== 'all') && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Found {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
                  {searchQuery && ` for "${searchQuery}"`}
                </div>
              )}

              {/* Articles Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6 animate-pulse">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-12 text-center">
                  <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No articles found</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {searchQuery
                      ? 'Try adjusting your search or filters'
                      : 'No articles available in this category.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all group"
                    >
                      <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white line-clamp-2">
                                {article.title}
                              </h3>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {article.category && (
                            <span className="px-3 py-1 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                              {article.category.name}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {article.views || 0}
                            </span>
                            {article.createdAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span className="hidden sm:inline">{new Date(article.createdAt).toLocaleDateString()}</span>
                                <span className="sm:hidden">{new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/knowledge-base/${article.slug}`}
                            className="w-full sm:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md transition-all text-center"
                          >
                            View Article
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Widget */}
      <CustomerWidget />
    </>
  );
}
