import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import {
  FolderOpen,
  ArrowLeft,
  Loader2,
  Calendar,
  Tag,
  BookOpen
} from 'lucide-react';

export default function KnowledgeBaseCategoryPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    const fetchCategory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/knowledge-base/categories/${slug}`);
        const data = await response.json();
        if (response.ok) {
          setCategory(data.category);
          setArticles(data.articles || []);
          setError(null);
        } else {
          setError(data.message || 'Category not found');
        }
      } catch (err) {
        console.error('Error loading category:', err);
        setError('An unexpected error occurred while loading the category.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [slug]);

  return (
    <>
      <Head>
        <title>
          {category ? `${category.name} - Knowledge Base` : 'Knowledge Base Category'}
        </title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 p-6 space-y-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-700 p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/5"></div>
            <div className="relative z-10 flex flex-col gap-5">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
                    <FolderOpen className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-violet-200">Knowledge Base Category</p>
                    <h1 className="text-3xl sm:text-4xl font-bold">
                      {category?.name || 'Loading...'}
                    </h1>
                    {category?.description && (
                      <p className="text-violet-100 mt-1 max-w-2xl">{category.description}</p>
                    )}
                    {category?.parent && (
                      <p className="text-violet-100 mt-1 text-sm">
                        Parent:{' '}
                        <Link href={`/knowledge-base/category/${category.parent.slug}`} className="underline">
                          {category.parent.name}
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Site
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Loading category...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <FolderOpen className="w-12 h-12 text-slate-400" />
              <p className="text-lg font-semibold text-slate-800">{error}</p>
              <Button onClick={() => router.push('/')}>Back to Home</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                  No articles yet for this category.
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/knowledge-base/${article.slug}`}
                      className="block rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-shadow p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-violet-600" />
                            {article.title}
                          </h2>
                          <p className="text-sm text-slate-600">{article.excerpt}</p>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-col items-end gap-1 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : '—'}
                          </span>
                          <span>Updated: {article.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : '—'}</span>
                        </div>
                      </div>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {article.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs px-3 py-1.5 rounded-full bg-violet-100 text-violet-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


