import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import AgentLayout from '../../../components/agent/universal/AgentLayout';
import PageHead from '../../../components/admin/PageHead';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { agentTicketColumns } from '../../../components/agent/tickets/AgentTicketTableColumns';
import { AgentTicketDataTable } from '../../../components/agent/tickets/AgentTicketDataTable';
import { AgentTicketTableToolbar } from '../../../components/agent/tickets/AgentTicketTableToolbar';
import { BulkActionsToolbar } from '../../../components/agent/tickets/BulkActionsToolbar';
import { SavedFiltersToolbar } from '../../../components/agent/tickets/SavedFiltersToolbar';
import { 
  Ticket as TicketIcon,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useAgentAuth } from '../../../contexts/AgentAuthContext';
import { agentFetch } from '../../../lib/utils/agent-fetch';
import { useSocketListener } from '../../../hooks/useSocketListener';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { useAgentGlobal } from '../../../contexts/AgentGlobalData';

export default function AgentTicketsPage() {
  const router = useRouter();
  const { user } = useAgentAuth();
  const { ticketCounts, refreshGlobalData } = useAgentGlobal();
  const isInitialLoad = useRef(true);
  
  // Extract needReplyCount from global ticket counts
  const needReplyCount = ticketCounts.needReply || 0;
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState([]); // For bulk actions
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    view: 'all', // Show both assigned and unassigned tickets
    needReply: false,
    showAll: false
  });

  const itemsPerPage = 20;

  // Initialize filters from URL query parameters
  useEffect(() => {
    if (router.isReady) {
      const { status, priority, view, needReply, showAll, search, page } = router.query;
      
      const newFilters = {
        status: 'all',
        priority: 'all',
        view: 'all', // Show both assigned and unassigned
        needReply: false,
        showAll: false
      };
      
      if (status && status !== 'all') newFilters.status = status;
      if (priority && priority !== 'all') newFilters.priority = priority;
      if (view && ['all', 'assigned', 'unassigned', 'claimable'].includes(view)) newFilters.view = view;
      if (needReply === 'true') newFilters.needReply = true;
      if (showAll === 'true') newFilters.showAll = true;
      
      setFilters(newFilters);
      
      if (search) {
        setSearchQuery(search);
        setDebouncedSearchQuery(search);
      }
      if (page) {
        setCurrentPage(parseInt(page) || 1);
      }
    }
  }, [router.isReady, router.query.status, router.query.priority, router.query.view, router.query.needReply, router.query.search, router.query.page]);

  // Define fetch functions first
  const fetchTickets = useCallback(async (silent = false) => {
    try {
      // Only show loading skeleton on initial load or when not silent
      if (!silent && isInitialLoad.current) {
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      // Always send view parameter
      params.append('view', filters.view);
      if (filters.needReply) params.append('needReply', 'true');
      if (filters.showAll) params.append('showAll', 'true');
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const response = await agentFetch(`/api/agent/tickets?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setTickets(data.tickets || []);
        setTotalPages(data.totalPages || 1);
        setTotalTickets(data.totalTickets || 0);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      if (!silent && isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }
  }, [currentPage, debouncedSearchQuery, filters]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tickets
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Enable silent auto-refresh on socket events
  useAutoRefresh(fetchTickets);

  // Socket.IO: Real-time ticket updates using useSocketListener
  useSocketListener('ticket:assigned', useCallback((data) => {
    if (data.agentId === user?.id) {
      console.log('[Socket] Ticket assigned to me:', data);
      // Refresh ticket list silently
      fetchTickets(true);
      refreshGlobalData(); // Refresh global counts
    }
  }, [user, fetchTickets, refreshGlobalData]));

  useSocketListener('ticket:updated', useCallback((data) => {
    console.log('[Socket] Ticket updated:', data);
    // Update ticket in list if it exists
    // For claimable view, only update if ticket still matches the view criteria
    setTickets((prev) => {
      if (filters.view === 'claimable') {
        // In claimable view, handle updates carefully to avoid removing tickets on partial updates
        const updatedTicket = prev.find((t) => t.ticketNumber === data.ticketNumber);
        if (updatedTicket) {
          // Only remove if explicitly assigned to someone else OR explicitly marked unclaimable
          // Use strict checks to avoid removing on partial updates (missing fields)
          const isAssignedToOther = data.assigneeId !== undefined && data.assigneeId !== null;
          const isExplicitlyUnclaimable = data.isClaimable === false; // Strict check, not truthy/falsy
          
          if (isAssignedToOther || isExplicitlyUnclaimable) {
            // Ticket was assigned or explicitly marked as not claimable - remove it
            return prev.filter((t) => t.ticketNumber !== data.ticketNumber);
          }
          
          // Otherwise, merge the update (preserve existing fields if socket payload is partial)
          return prev.map((t) => {
            if (t.ticketNumber === data.ticketNumber) {
              // Merge update, but preserve existing isClaimable if not provided in update
              return {
                ...t,
                ...data,
                // Only update isClaimable if explicitly provided in the socket data
                isClaimable: data.isClaimable !== undefined ? data.isClaimable : t.isClaimable,
                // Only update assigneeId if explicitly provided
                assigneeId: data.assigneeId !== undefined ? data.assigneeId : t.assigneeId,
                assignee: data.assignee !== undefined ? data.assignee : t.assignee
              };
            }
            return t;
          });
        }
        
        // If ticket doesn't exist in list, only add it if it's explicitly claimable and unassigned
        // Check that both fields are explicitly set (not just truthy/falsy)
        const isExplicitlyClaimable = data.isClaimable === true;
        const isExplicitlyUnassigned = data.assigneeId === null || data.assigneeId === undefined;
        
        if (isExplicitlyClaimable && isExplicitlyUnassigned) {
          return [...prev, data];
        }
        return prev;
      } else {
        // For other views, just update the ticket (merge with existing data)
        return prev.map((t) => {
          if (t.ticketNumber === data.ticketNumber) {
            return { ...t, ...data };
          }
          return t;
        });
      }
    });
  }, [filters.view]));

  useSocketListener('message:created', useCallback((data) => {
    console.log('[Socket] New message:', data);
    // Refresh if message is from customer
    if (data.senderType === 'customer') {
      refreshGlobalData(); // Refresh global counts
    }
  }, [refreshGlobalData]));

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    
    // Update URL query parameters
    const query = { ...router.query };
    if (value === 'all' || value === false) {
      delete query[key];
    } else {
      query[key] = value;
    }
    
    // Remove page from query when filters change
    delete query.page;
    
    router.push({
      pathname: router.pathname,
      query: query
    }, undefined, { shallow: true });
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      view: 'all', // Show both assigned and unassigned
      needReply: false,
      showAll: false
    });
    setSearchQuery('');
    setCurrentPage(1);
    
    // Clear URL query parameters
    router.push({
      pathname: router.pathname,
      query: {}
    }, undefined, { shallow: true });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRowClick = (ticket) => {
    router.push(`/agent/tickets/${ticket.ticketNumber}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTickets(), refreshGlobalData()]);
    setRefreshing(false);
  };

  const handleBulkAction = async (action, data) => {
    if (selectedTickets.length === 0) return;

    try {
      const response = await agentFetch('/api/agent/tickets/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ticketIds: selectedTickets,
          data
        })
      });

      if (response.ok) {
        // Clear selection and refresh tickets
        setSelectedTickets([]);
        await fetchTickets();
        await refreshGlobalData();
      } else {
        const error = await response.json();
        alert(error.error || 'Bulk action failed');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Failed to perform bulk action');
    }
  };

  const handleApplySavedFilter = (savedFilters) => {
    setFilters(savedFilters);
    setCurrentPage(1);
    
    // Update URL with new filters
    const params = new URLSearchParams();
    if (savedFilters.status !== 'all') params.append('status', savedFilters.status);
    if (savedFilters.priority !== 'all') params.append('priority', savedFilters.priority);
    if (savedFilters.view !== 'all') params.append('view', savedFilters.view);
    if (savedFilters.needReply) params.append('needReply', 'true');
    
    router.push(`/agent/tickets?${params.toString()}`, undefined, { shallow: true });
  };

  return (
    <AgentLayout>
      <PageHead
        title="My Tickets"
        description="Manage your assigned tickets and view the unassigned pool"
      />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <TicketIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  My Tickets
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {totalTickets} total tickets
                  {filters.needReply && needReplyCount > 0 && (
                    <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                      • {needReplyCount} need reply
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SavedFiltersToolbar 
                currentFilters={filters}
                onApplyFilter={handleApplySavedFilter}
              />
              
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Ticket Table */}
          <Card className="border-slate-200 dark:border-slate-800">
            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
              selectedCount={selectedTickets.length}
              onClearSelection={() => setSelectedTickets([])}
              onBulkAction={handleBulkAction}
            />
            
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <AgentTicketTableToolbar
                search={searchQuery}
                onSearchChange={setSearchQuery}
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                needReplyCount={needReplyCount}
              />
            </CardHeader>
            <CardContent className="p-0">
              {loading && tickets.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Loading tickets...
                    </p>
                  </div>
                </div>
              ) : (
                <AgentTicketDataTable
                  columns={agentTicketColumns}
                  data={tickets}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onRowClick={handleRowClick}
                  selectedTickets={selectedTickets}
                  onSelectionChange={setSelectedTickets}
                  currentView={filters.view}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AgentLayout>
  );
}
