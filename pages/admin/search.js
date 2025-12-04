import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../components/admin/universal/AdminLayout';
import PageHead from '../../components/admin/PageHead';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import { Ticket, User, FileText, Search as SearchIcon, Clock, MessageSquare } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const [results, setResults] = useState({ tickets: [], agents: [], articles: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (q) {
      setSearchQuery(q);
      performSearch(q);
    }
  }, [q]);

  const performSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setResults({ tickets: [], agents: [], articles: [] });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (response.ok) {
        setResults(data);
      }
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'pending': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'resolved': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'closed': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const totalResults = results.tickets.length + results.agents.length + results.articles.length;

  return (
    <>
      <PageHead title="Search" description="Search across tickets, agents, and articles" />
      
      <AdminLayout currentPage="Search">
        <div className="space-y-6">
          {/* Search Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Search</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Search across tickets, agents, and articles
            </p>
          </div>

          {/* Search Bar */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tickets, agents, articles..."
                    className="w-full pl-12 pr-5 h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all"
                >
                  Search
                </button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Searching...</p>
            </div>
          ) : q && totalResults === 0 ? (
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
              <CardContent className="p-12 text-center">
                <SearchIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No results found</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                  Try different keywords or check your spelling
                </p>
              </CardContent>
            </Card>
          ) : q ? (
            <div className="space-y-6">
              {/* Results Summary */}
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Found {totalResults} result{totalResults !== 1 ? 's' : ''} for &quot;{q}&quot;
              </div>

              {/* Tickets Results */}
              {results.tickets.length > 0 && (
                <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
                  <CardHeader className="pb-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-violet-100 dark:border-violet-800/50">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      Tickets ({results.tickets.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                      {results.tickets.map((ticket) => (
                        <Link
                          key={ticket.id}
                          href={`/admin/tickets/${ticket.id}`}
                          className="block p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                                  {ticket.subject || 'No Subject'}
                                </h3>
                                <Badge className={`${getStatusColor(ticket.status)} border font-semibold px-2 py-0.5 rounded-lg text-xs`}>
                                  {ticket.status}
                                </Badge>
                                {ticket.priority && (
                                  <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-700 border font-semibold px-2 py-0.5 rounded-lg text-xs">
                                    {ticket.priority} Priority
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                {ticket.customerName && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {ticket.customerName}
                                  </span>
                                )}
                                {ticket.assignee && (
                                  <span>Assigned to: {ticket.assignee.name}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {ticket.messageCount} messages
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {formatDate(ticket.updatedAt)}
                                </span>
                              </div>
                              <div className="mt-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                                #{ticket.id}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Agents Results */}
              {results.agents.length > 0 && (
                <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
                  <CardHeader className="pb-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-violet-100 dark:border-violet-800/50">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      Agents ({results.agents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                      {results.agents.map((agent) => (
                        <Link
                          key={agent.id}
                          href={`/admin/agents/${agent.id}`}
                          className="block p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0">
                                {agent.name?.charAt(0) || 'A'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                                  {agent.name}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mt-1">
                                  <span>{agent.email}</span>
                                  {agent.department && (
                                    <>
                                      <span>•</span>
                                      <span>{agent.department}</span>
                                    </>
                                  )}
                                  {agent.userId && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-xs">ID: {agent.userId}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge className={`${
                                agent.presenceStatus === 'online' || agent.isActive
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                              } border font-semibold px-3 py-1 rounded-lg text-xs`}>
                                {agent.presenceStatus === 'online' ? 'Online' : agent.isActive ? 'Active' : 'Offline'}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Articles Results - Placeholder */}
              {results.articles.length > 0 && (
                <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
                  <CardHeader className="pb-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-violet-100 dark:border-violet-800/50">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      Articles ({results.articles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 text-center text-slate-600 dark:text-slate-400">
                    Knowledge base articles coming soon
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
              <CardContent className="p-12 text-center">
                <SearchIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Start searching</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                  Enter a search term above to find tickets, agents, and articles
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

