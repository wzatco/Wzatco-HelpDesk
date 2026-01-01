import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Plus } from 'lucide-react';
import { withAuth } from '../../../lib/withAuth';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';

// Import new components
import { TicketDataTable } from '../../../components/admin/tickets/TicketDataTable';
import { TicketToolbar } from '../../../components/admin/tickets/TicketToolbar';
import { createColumns } from '../../../components/admin/tickets/TicketTableColumns';
import { AssignTicketModal } from '../../../components/admin/tickets/AssignTicketModal';

export default function TicketsPage() {
  const router = useRouter();

  // State management
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  
  // Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    productModel: 'all',
    tags: [],
    needReply: 'all'
  });

  // Reference data
  const [agents, setAgents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [products, setProducts] = useState([]);

  const itemsPerPage = 20;

  // Initialize filters from URL
  useEffect(() => {
    if (router.isReady) {
      const { status, priority, assignee, search, page } = router.query;
      
      const newFilters = { ...filters };
      if (status && status !== 'all') newFilters.status = status;
      if (priority && priority !== 'all') newFilters.priority = priority;
      if (assignee && assignee !== 'all') newFilters.assignee = assignee;
      
      setFilters(newFilters);
      if (search) {
        setSearchQuery(search);
        setDebouncedSearchQuery(search);
      }
      if (page) {
        setCurrentPage(parseInt(page) || 1);
      }
    }
  }, [router.isReady]);

  // Debounce search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setDebouncedSearchQuery('');
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tickets when filters change
  useEffect(() => {
    if (router.isReady) {
      fetchTickets();
    }
  }, [filters, currentPage, debouncedSearchQuery, router.isReady]);

  // Fetch reference data
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/admin/agents');
        const data = await res.json();
        if (res.ok) setAgents(data.agents || []);
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };
    
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/admin/departments');
        const data = await res.json();
        if (res.ok) setDepartments(data.departments || []);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/admin/tags');
        const data = await res.json();
        if (res.ok) setAvailableTags(data.tags || []);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/admin/products');
        const data = await res.json();
        if (res.ok) setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    
    fetchAgents();
    fetchDepartments();
    fetchTags();
    fetchProducts();
  }, []);

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.assignee !== 'all') params.append('assignee', filters.assignee);
      if (filters.productModel !== 'all') params.append('productModel', filters.productModel);
      if (filters.needReply === 'true') params.append('needReply', 'true');
      if (filters.tags?.length > 0) params.append('tags', filters.tags.join(','));
      if (debouncedSearchQuery.trim()) params.append('search', debouncedSearchQuery.trim());
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      // Add showAll parameter when status is 'all' to show all tickets including resolved/closed
      if (filters.status === 'all') {
        params.append('showAll', 'true');
      }
      
      const response = await fetch(`/api/admin/tickets?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setTickets(data.tickets);
        setTotalPages(data.totalPages);
        setTotalTickets(data.totalTickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Enable silent auto-refresh on socket events
  useAutoRefresh(fetchTickets);

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      assignee: 'all',
      productModel: 'all',
      tags: [],
      needReply: 'all'
    });
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.assignee !== 'all') params.append('assignee', filters.assignee);
      if (filters.productModel !== 'all') params.append('productModel', filters.productModel);
      if (filters.tags?.length > 0) params.append('tags', filters.tags.join(','));
      if (debouncedSearchQuery.trim()) params.append('search', debouncedSearchQuery.trim());
      params.append('export', 'csv');
      
      const response = await fetch(`/api/admin/tickets?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting tickets:', error);
    }
  };

  // Table columns with actions
  const columns = createColumns({
    onSelect: setSelectedTicketIds,
    selectedIds: selectedTicketIds,
    onAssign: (ticket) => {
      setTicketToAssign(ticket);
      setAssignModalOpen(true);
    }
  });

  const handleAssignComplete = () => {
    fetchTickets();
    setAssignModalOpen(false);
    setTicketToAssign(null);
  };

  return (
    <>
      <PageHead title="Tickets" description="Manage Support Tickets" />
      
      <AdminLayout currentPage="Tickets">
        {/* Seamless Borderless Layout */}
        <div className="space-y-6">
          {/* Header Section */}
              <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Tickets
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'}
                </p>
              {selectedTicketIds.length > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
                      {selectedTicketIds.length} selected
                                       </Badge>
                  </>
                )}
                  </div>
                    </div>
            <Link href="/admin/tickets/new">
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" />
                New Ticket
                    </Button>
            </Link>
              </div>

          {/* Toolbar - No Card Wrapper */}
          <TicketToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            onResetFilters={handleResetFilters}
            availableTags={availableTags}
            products={products}
            agents={agents}
            onExport={handleExport}
          />

          {/* Data Table - No Card Wrapper */}
          <TicketDataTable
            columns={columns}
            data={tickets}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            loading={loading}
          />
              </div>

        {/* Assign Modal */}
        <AssignTicketModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setTicketToAssign(null);
          }}
          onAssign={handleAssignComplete}
          ticketNumber={ticketToAssign?.ticketNumber}
        />
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();
