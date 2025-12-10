// Public Knowledge Base Sidebar
'use client';

import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

export default function Sidebar({ categories, articles, currentArticleSlug }) {
  const [expandedCategories, setExpandedCategories] = useState({});

  // Group articles by category
  const articlesByCategory = useMemo(() => {
    const grouped = {};
    articles.forEach(article => {
      const catId = article.category?.id || 'uncategorized';
      const catName = article.category?.name || 'Uncategorized';
      if (!grouped[catId]) {
        grouped[catId] = {
          name: catName,
          slug: article.category?.slug || '',
          articles: []
        };
      }
      grouped[catId].articles.push(article);
    });
    return grouped;
  }, [articles]);

  // Auto-expand only the category containing the current article
  useEffect(() => {
    if (!articles || articles.length === 0) {
      setExpandedCategories({});
      return;
    }

    if (!currentArticleSlug) {
      // If no article is open, collapse all
      setExpandedCategories({});
      return;
    }

    // Find which category contains the current article
    let currentCategoryId = null;
    for (const [catId, categoryData] of Object.entries(articlesByCategory)) {
      const hasCurrentArticle = categoryData.articles.some(article => article.slug === currentArticleSlug);
      if (hasCurrentArticle) {
        currentCategoryId = catId;
        break;
      }
    }

    if (currentCategoryId) {
      // Expand only the category with the current article
      setExpandedCategories({ [currentCategoryId]: true });
    } else {
      // If article not found in any category, collapse all
      setExpandedCategories({});
    }
  }, [currentArticleSlug, articlesByCategory, articles]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-violet-50 via-violet-100/50 to-white dark:from-slate-950 dark:via-violet-950/30 dark:to-slate-900 border-r border-violet-200 dark:border-slate-800 h-full flex flex-col">
      <div className="flex-1 px-4 py-6 overflow-y-auto hide-scrollbar">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-violet-600 dark:text-violet-400" />
          Articles
        </h2>

        <nav className="space-y-1">
          {Object.entries(articlesByCategory).map(([catId, categoryData]) => {
            const isExpanded = expandedCategories[catId] === true; // Only expanded if explicitly set
            const categoryArticles = categoryData.articles;

            return (
              <div key={catId} className="mb-4">
                <button
                  onClick={() => toggleCategory(catId)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <span>{categoryData.name}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
                {isExpanded && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {categoryArticles.map((article) => (
                      <li key={article.id}>
                        <Link
                          href={`/knowledge-base/${article.slug}`}
                          className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                            currentArticleSlug === article.slug
                              ? 'bg-violet-50 text-violet-700 border border-violet-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                              : 'text-slate-600 hover:bg-violet-50/50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                          }`}
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {/* Uncategorized articles */}
          {articlesByCategory['uncategorized'] && (
            <div className="mb-4">
              <button
                onClick={() => toggleCategory('uncategorized')}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <span>Uncategorized</span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${expandedCategories['uncategorized'] === true ? 'rotate-90' : ''}`}
                />
              </button>
              {expandedCategories['uncategorized'] === true && (
                <ul className="ml-4 mt-1 space-y-1">
                  {articlesByCategory['uncategorized'].articles.map((article) => (
                    <li key={article.id}>
                      <Link
                        href={`/knowledge-base/${article.slug}`}
                        className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                          currentArticleSlug === article.slug
                            ? 'bg-violet-50 text-violet-700 border border-violet-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                            : 'text-slate-600 hover:bg-violet-50/50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                        }`}
                      >
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}

