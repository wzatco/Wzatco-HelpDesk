import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/universal/AdminLayout';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Tag,
  Loader2,
  ExternalLink
} from 'lucide-react';

export default function ArticleDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/knowledge-base/articles/${id}`);
        const data = await response.json();
        if (response.ok) {
          setArticle(data.article);
          setError(null);
        } else {
          setError(data.message || 'Failed to load article');
        }
      } catch (err) {
        console.error('Error loading article:', err);
        setError('An unexpected error occurred while loading the article.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-300">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p>Loading article...</p>
        </div>
      );
    }

    if (error || !article) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400" />
          <p className="text-lg font-semibold text-slate-800 dark:text-white">
            {error || 'Article not found'}
          </p>
          <Button onClick={() => router.push('/admin/knowledge-base')} className="mt-2">
            Back to Knowledge Base
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
          {article.content ? (
            <div
              className="prose prose-slate max-w-none dark:prose-invert prose-headings:mt-6 prose-headings:mb-3 prose-p:mb-4"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <p className="text-slate-500 dark:text-slate-400">This article has no content yet.</p>
          )}
        </div>

        {article.tags && article.tags.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, idx) => (
                <span key={idx} className="text-xs px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const statusBadge =
    article?.status === 'published'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';

  return (
    <AdminLayout currentPage="Knowledge Base">
      <Head>
        <title>{article ? `${article.title} - Knowledge Base` : 'Article'} - Admin Panel</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-violet-700 to-indigo-700 dark:from-violet-800 dark:via-violet-900 dark:to-indigo-950 p-6 sm:p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/5 dark:bg-black/10"></div>
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-violet-200">Knowledge Base Article</p>
                  <h1 className="text-3xl sm:text-4xl font-bold">{article?.title || 'Loading...'}</h1>
                  {article?.category && (
                    <p className="text-violet-100 mt-1">
                      Category:{' '}
                      <Link
                        href={`/knowledge-base/category/${article.category.slug}`}
                        className="border-b border-transparent hover:border-white transition-colors"
                      >
                        {article.category.name}
                      </Link>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {article && (
                  <>
                    <Badge className={`${statusBadge} border-0`}>
                      {article.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                    {article.isPublic === false && (
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-900/70 dark:text-slate-200 border-0">
                        Private
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/knowledge-base')}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Knowledge Base
              </Button>
              {article && (
                <>
                  <Button
                    onClick={() => router.push('/admin/knowledge-base')}
                    className="bg-white text-violet-700 hover:bg-violet-50 dark:text-violet-800"
                  >
                    Manage Articles
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/knowledge-base/${article.slug}`, '_blank')}
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Public View
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10"></div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10"></div>
        </div>

        {article && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {article.createdAt ? new Date(article.createdAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Updated</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {article.updatedAt ? new Date(article.updatedAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Visibility</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {article.isPublic === false ? 'Private' : 'Public'}
                </p>
              </div>
            </div>
          </div>
        )}

        {renderContent()}
      </div>
    </AdminLayout>
  );
}



