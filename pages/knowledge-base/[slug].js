// Individual Knowledge Base Article Page
'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../../components/public/Header';
import Sidebar from '../../components/public/Sidebar';
import CustomerWidget from '../../components/widget/CustomerWidget';
import { ArrowLeft, BookOpen, Calendar, Eye, Loader2, Tag } from 'lucide-react';
import BlockRenderer from '../../components/public/BlockRenderer';

export default function PublicArticlePage() {
  const router = useRouter();
  const { slug } = router.query;
  const [article, setArticle] = useState(null);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    fetchArticle();
    fetchSidebarData();
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/knowledge-base/articles/${slug}`);
      const data = await response.json();
      if (response.ok && data.article) {
        setArticle(data.article);
        setError(null);
      } else {
        setError(data.message || 'Article not found');
      }
    } catch (err) {
      console.error('Error loading article:', err);
      setError('An unexpected error occurred while loading the article.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSidebarData = async () => {
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
      console.error('Error fetching sidebar data:', error);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-purple-600 mb-3" />
          <p className="text-sm sm:text-base text-gray-600">Loading article...</p>
        </div>
      );
    }

    if (error || !article) {
      return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center space-y-3 px-4">
          <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
          <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">{error || 'Article not found'}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
          >
            Back to Knowledge Base
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 sm:p-4 md:p-4 lg:p-5">
          {article.content ? (
            article.contentType === 'blocks' ? (
              // Render blocks
              (() => {
                try {
                  const blocks = typeof article.content === 'string' 
                    ? JSON.parse(article.content) 
                    : article.content;
                  return <BlockRenderer blocks={blocks} />;
                } catch (e) {
                  console.error('Error parsing blocks:', e);
                  return <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Error rendering article content.</p>;
                }
              })()
            ) : /<\/?[a-z][\s\S]*>/i.test(article.content) ? (
              <div
                className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-semibold prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 dark:prose-strong:text-white prose-ul:text-slate-700 dark:prose-ul:text-slate-300 prose-ol:text-slate-700 dark:prose-ol:text-slate-300 prose-headings:text-base sm:prose-headings:text-lg md:prose-headings:text-xl prose-p:text-xs sm:prose-p:text-sm prose-sm prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-table:w-full prose-table:overflow-x-auto prose-headings:mb-2 prose-headings:mt-3 prose-p:mb-2"
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {article.content.split('\n').map((block, idx) => {
                  const trimmed = block.trim();
                  if (!trimmed) return null;

                  if (/^\s*#+/.test(trimmed)) {
                    return (
                      <h2 key={idx} className="text-base sm:text-lg md:text-xl font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1.5 mt-3 sm:mt-4 mb-2 sm:mb-3">
                        {trimmed.replace(/^\s*#+\s*/, '')}
                      </h2>
                    );
                  }

                  return (
                    <p key={idx} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            )
          ) : (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">This article has no content yet.</p>
          )}
        </div>

        {article.tags && article.tags.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
            <p className="text-xs sm:text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, idx) => (
                <span key={idx} className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>{article ? `${article.title} - WZATCO Knowledge Base` : 'Knowledge Base Article'}</title>
        <meta name="description" content={article?.content?.replace(/<[^>]*>/g, '').substring(0, 160) || 'WZATCO Knowledge Base Article'} />
      </Head>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Hidden on mobile, visible on md+ */}
          <div className="hidden md:block">
            <Sidebar categories={categories} articles={articles} currentArticleSlug={slug} />
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto w-full">
            <div className="w-full space-y-3 sm:space-y-4 px-2 sm:px-3 py-4 sm:py-6 pb-8">
              {/* Back Button */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-3 py-2 mb-4 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 shadow-sm hover:shadow"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Knowledge Base</span>
                <span className="sm:hidden">Back</span>
              </Link>

              {/* Article Header */}
              {article && (
                <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-violet-800 dark:via-violet-900 dark:to-purple-950 p-3 sm:p-4 text-white shadow-lg mb-3">
                  <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
                  <div className="relative z-10">
                    {/* Title and Category */}
                    <div className="mb-2.5">
                      <h1 className="text-base sm:text-lg font-bold mb-2 break-words">{article.title}</h1>
                      {article.category && (
                        <Link
                          href={`/knowledge-base/category/${article.category.slug}`}
                          className="inline-block px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-md text-xs font-medium transition-colors"
                        >
                          {article.category.name}
                        </Link>
                      )}
                    </div>

                    {/* Article Meta - Single Row */}
                    <div className="flex items-center gap-4 text-xs sm:text-sm pt-2 border-t border-white/20">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
                        <span className="text-white/70">Last Updated:</span>
                        <span className="font-medium">
                          {article.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
                        <span className="text-white/70">Views:</span>
                        <span className="font-medium">{article.views || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Article Content */}
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Widget */}
      <CustomerWidget />
    </>
  );
}
