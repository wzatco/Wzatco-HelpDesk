import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Clock3, Filter, HardDrive, Loader2, Search, Ticket, UserCircle } from 'lucide-react';

import { withAuth } from '../../../lib/withAuth';
export default function AssignedToMePage() {
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [agentName, setAgentName] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // Load admin profile + matching agent
  useEffect(() => {
    const hydrateAgent = async () => {
      setLoadingAgent(true);
      setError('');
      try {
        const profileRes = await fetch('/api/admin/profile');
        const profileData = await profileRes.json();
        const currentAdmin = profileData?.data;
        setAdminProfile(currentAdmin || null);
        setAgentName(currentAdmin?.name || 'You');

        const agentsRes = await fetch('/api/admin/agents');
        const agentsData = await agentsRes.json();
        const normalizedEmail = currentAdmin?.email?.toLowerCase();
        let matchingAgent = agentsData?.agents?.find(
          (agent) =>
            agent.email?.toLowerCase() === normalizedEmail ||
            agent.name?.toLowerCase() === currentAdmin?.name?.toLowerCase()
        );
        let creationError = '';

        if (!matchingAgent && currentAdmin?.email) {
          try {
            const createRes = await fetch('/api/admin/agents', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-name': currentAdmin?.name || 'Administrator'
              },
              body: JSON.stringify({
                name: currentAdmin?.name || 'Admin',
                email: currentAdmin.email,
                isActive: true
              })
            });
            if (createRes.ok) {
              const created = await createRes.json();
              matchingAgent = created?.agent;
            } else {
              const errData = await createRes.json();
              throw new Error(errData?.message || 'Failed to auto-create agent profile');
            }
          } catch (autoErr) {
            console.error('Auto-create agent failed', autoErr);
            creationError =
              autoErr.message ||
              'Unable to auto-create an agent profile. Please ensure an agent exists with your email.';
            setError(creationError);
          }
        }

        if (matchingAgent) {
          setAgentId(matchingAgent.id);
          setAgentName(matchingAgent.name || currentAdmin?.name || 'You');
        } else if (!creationError) {
          setError(
            'We could not find or create an agent profile that matches your account. Assign yourself as an agent to view tickets here.'
          );
        }
      } catch (err) {
        console.error('Failed to load profile/agent', err);
        setError('Unable to load your profile details. Please try again.');
      } finally {
        setLoadingAgent(false);
      }
    };
    hydrateAgent();
  }, []);

  // Fetch tickets whenever agentId / filters change
  useEffect(() => {
    if (!agentId) {
      return;
    }
    const fetchTickets = async () => {
      setLoadingTickets(true);
      setError('');
      try {
        const params = new URLSearchParams({
          agentId,
          limit: '50'
        });
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        if (debouncedSearch) {
          params.append('search', debouncedSearch);
        }
        const res = await fetch(`/api/admin/tickets?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load tickets');
        }
        setTickets(data.tickets || []);
      } catch (err) {
        console.error('Failed to fetch tickets', err);
        setError(err.message || 'Unable to fetch tickets right now.');
      } finally {
        setLoadingTickets(false);
      }
    };
    fetchTickets();
  }, [agentId, statusFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((ticket) => ticket.status === 'open').length;
    const pending = tickets.filter((ticket) => ticket.status === 'pending').length;
    const resolved = tickets.filter((ticket) => ticket.status === 'resolved').length;
    const closed = tickets.filter((ticket) => ticket.status === 'closed').length;
    return { total, open, pending, resolved, closed };
  }, [tickets]);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const renderContent = () => {
    if (loadingAgent) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p>Identifying your agent profile…</p>
        </div>
      );
    }

    if (error && !agentId) {
      return (
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-900/30 border border-slate-700/80 text-slate-200 px-6 py-6 rounded-3xl shadow-lg flex gap-4 items-start">
          <div className="p-3 rounded-2xl bg-slate-800 text-violet-300 shadow-inner">
            <HardDrive className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white mb-2">Agent record missing</p>
            <p className="text-sm leading-relaxed text-slate-300">
              {error || 'We could not find an agent profile that matches your admin account. Please create an agent record with the same email.'}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => router.push('/admin/agents/new')}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm"
              >
                Create Agent
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/agents')}
                className="border-slate-600 text-slate-200 hover:text-white hover:border-white rounded-xl px-4 py-2 text-sm"
              >
                View Agents
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Tickets</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing conversations currently assigned to {agentName || 'you'}.
            </p>
          </div>
          <div className="flex gap-2">
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? 'default' : 'outline'}
                onClick={() => setStatusFilter(option.value)}
                className={
                  statusFilter === option.value
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Total" value={stats.total} accent="from-violet-500 to-purple-600" />
          <StatTile label="Open" value={stats.open} accent="from-amber-400 to-orange-500" />
          <StatTile label="Pending" value={stats.pending} accent="from-blue-500 to-cyan-500" />
          <StatTile label="Resolved" value={stats.resolved + stats.closed} accent="from-emerald-500 to-teal-500" />
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Filter className="w-4 h-4" />
            Quick Filters
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search by ticket id, subject, customer..."
                className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/tickets')}
            className="text-slate-600 dark:text-slate-300 hover:text-violet-600"
          >
            Go to full ticket workspace
          </Button>
        </div>

        <div className="space-y-4">
          {loadingTickets ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p>Fetching your tickets…</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-12 text-center text-slate-500 dark:text-slate-400">
              <HardDrive className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="font-semibold text-slate-600 dark:text-slate-200">Inbox is empty</p>
              <p className="text-sm mt-1">Everything assigned to you will appear here as soon as it arrives.</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <article
                key={ticket.ticketNumber}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:border-violet-200 dark:hover:border-violet-500/60 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/tickets/${ticket.ticketNumber}`)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <span>{ticket.ticketNumber}</span>
                      <span>·</span>
                      <span>{ticket.priority?.toUpperCase() || 'Normal'}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                      {ticket.subject || 'Untitled Ticket'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {ticket.customer?.name || ticket.customerName || 'Customer'} •{' '}
                      {ticket.customer?.email || ticket.customer?.phone || 'No contact'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white">
                      {ticket.status?.toUpperCase() || 'OPEN'}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Updated {new Date(ticket.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="inline-flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5" />
                    Created {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                  {ticket.department && (
                    <div className="inline-flex items-center gap-1">
                      <UserCircle className="w-3.5 h-3.5" />
                      {typeof ticket.department === 'object' ? ticket.department.name : ticket.department}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <PageHead title="Tickets Assigned to Me" description="Focus on the conversations waiting on you" />
      <AdminLayout currentPage="Tickets">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              {adminProfile?.avatarUrl ? (
                <img
                  src={adminProfile.avatarUrl}
                  alt={agentName}
                  className="h-14 w-14 rounded-2xl object-cover border border-violet-100 dark:border-slate-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-2xl font-semibold">
                  {agentName ? agentName.charAt(0) : 'A'}
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Personal Queue</p>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tickets Assigned to You</h1>
              </div>
            </div>
          </div>

          {renderContent()}
        </div>
      </AdminLayout>
    </>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
      <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${accent}`} />
    </div>
  );
}

export const getServerSideProps = withAuth();


