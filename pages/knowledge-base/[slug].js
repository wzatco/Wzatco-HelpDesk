import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Tag,
  Loader2
} from 'lucide-react';

export default function PublicArticlePage() {
  const router = useRouter();
  const { slug } = router.query;
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/knowledge-base/articles/${slug}`);
        const data = await response.json();
        if (response.ok) {
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

    fetchArticle();
  }, [slug]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p>Loading article...</p>
        </div>
      );
    }

    if (error || !article) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400" />
          <p className="text-lg font-semibold text-slate-800">{error || 'Article not found'}</p>
          <Button onClick={() => router.push('/')} className="mt-2">
            Back to Home
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {article.content ? (
            /<\/?[a-z][\s\S]*>/i.test(article.content) ? (
              <div
                className="prose prose-slate max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-p:mb-4"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : (
              <div className="space-y-6">
                {article.content.split('\n').map((block, idx) => {
                  const trimmed = block.trim();
                  if (!trimmed) return null;

                  if (/^\s*#+/.test(trimmed)) {
                    return (
                      <h2 key={idx} className="text-2xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                        {trimmed.replace(/^\s*#+\s*/, '')}
                      </h2>
                    );
                  }

                  if (/^Steps?/i.test(trimmed)) {
                    return (
                      <h3 key={idx} className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                        {trimmed}
                      </h3>
                    );
                  }

                  if (/^Step\s*\d+/i.test(trimmed)) {
                    const [stepTitle, ...rest] = trimmed.split(':');
                    return (
                      <div key={idx} className="flex gap-4">
                        <div className="text-violet-600 font-semibold">{stepTitle}:</div>
                        <p className="text-slate-700 flex-1">{rest.join(':').trim()}</p>
                      </div>
                    );
                  }

                  return (
                    <p key={idx} className="text-slate-700 leading-relaxed">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            )
          ) : (
            <p className="text-slate-500">This article has no content yet.</p>
          )}
        </div>
        {article.tags && article.tags.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, idx) => (
                <span key={idx} className="text-xs px-3 py-1.5 rounded-full bg-violet-100 text-violet-700">
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
        <title>{article ? `${article.title} - Knowledge Base` : 'Knowledge Base Article'}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 p-6 space-y-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-violet-700 to-indigo-700 p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/5"></div>
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
                      <Badge className="bg-green-100 text-green-700 border-0">Published</Badge>
                      <Badge className="bg-slate-100 text-slate-700 border-0">
                        {article.isPublic === false ? 'Private' : 'Public'}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
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

          {article && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-violet-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Created</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {article.createdAt ? new Date(article.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-violet-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Updated</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {article.updatedAt ? new Date(article.updatedAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-violet-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Visibility</p>
                  <p className="text-sm font-semibold text-slate-900">{article.isPublic === false ? 'Private' : 'Public'}</p>
                </div>
              </div>
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </>
  );
}


