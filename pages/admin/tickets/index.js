import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Plus, Search as SearchIcon, Ticket as TicketIcon, Clock, User as UserIcon, MessageSquare, ChevronRight, FileText, Tag as TagIcon, Download, Building2, Check as CheckIcon } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import usePermissions from '../../../hooks/usePermissions';

import { withAuth } from '../../../lib/withAuth';
export default function TicketsPage() {
  const router = useRouter();
  const { userId, isAuthenticated, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  // Permission check - redirect if no access
  useEffect(() => {
    // Wait for both auth and permissions to load before checking
    if (!authLoading && !permissionsLoading) {
      if (!hasPermission('admin.tickets')) {
        router.push('/admin/login');
      }
    }
  }, [authLoading, permissionsLoading, hasPermission, router]);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [agents, setAgents] = useState([]);
  const [bulk, setBulk] = useState({ status: 'none', priority: 'none', assigneeId: 'none', departmentId: 'none', addTags: [], removeTags: [] });
  const [departments, setDepartments] = useState([]);
  const [showBulkTagsModal, setShowBulkTagsModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    agentId: 'all',
    dateRange: 'all',
    productModel: 'all',
    tags: []
  });
  const [searchType, setSearchType] = useState('all'); // 'all', 'mobile', 'email', 'name', 'ticketId', 'product'
  const [products, setProducts] = useState([]); // For product filter dropdown
  const [selectedTags, setSelectedTags] = useState([]); // For tag filter
  const [savedFilters, setSavedFilters] = useState([]);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  // Inline editing states
  const [editingStatus, setEditingStatus] = useState(null); // ticketId
  const [editingPriority, setEditingPriority] = useState(null); // ticketId
  const [editingDepartment, setEditingDepartment] = useState(null); // ticketId
  const [statusDropdownPosition, setStatusDropdownPosition] = useState({ top: 0, left: 0 });
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState({ top: 0, left: 0 });
  const [departmentDropdownPosition, setDepartmentDropdownPosition] = useState({ top: 0, left: 0 });
  const [updatingTicket, setUpdatingTicket] = useState(null); // ticketId
  const [showPriorityReasonModal, setShowPriorityReasonModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [tagsModalTicketId, setTagsModalTicketId] = useState(null);
  const [pendingPriorityUpdate, setPendingPriorityUpdate] = useState({ ticketId: null, priority: null });
  const [priorityReason, setPriorityReason] = useState('');
  const [availableTags, setAvailableTags] = useState([]);

  const itemsPerPage = 10;

  // Initialize filters from URL query parameters
  useEffect(() => {
    if (router.isReady) {
      const { status, priority, assignee, dateRange, search, page } = router.query;
      
      if (status && status !== 'all') {
        setFilters(prev => ({ ...prev, status }));
      }
      if (priority && priority !== 'all') {
        setFilters(prev => ({ ...prev, priority }));
      }
      if (assignee && assignee !== 'all') {
        setFilters(prev => ({ ...prev, assignee }));
      }
      if (dateRange && dateRange !== 'all') {
        setFilters(prev => ({ ...prev, dateRange }));
      }
      if (search) {
        setSearchQuery(search);
        // Immediately set debounced search query when coming from URL
        setDebouncedSearchQuery(search);
      }
      if (page) {
        setCurrentPage(parseInt(page) || 1);
      }
    }
  }, [router.isReady, router.query]);

  // Debounce search query - wait 500ms after user stops typing
  // If search is cleared, update immediately
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // If search is cleared, update immediately
      setDebouncedSearchQuery('');
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (router.isReady) {
      fetchTickets();
    }
  }, [filters, currentPage, debouncedSearchQuery, selectedTags, searchType, router.isReady]);

  // Prevent page scrolling when modals are open and ensure modals are visible
  useEffect(() => {
    if (showTagsModal || showBulkTagsModal || showPriorityReasonModal || showSaveFilterModal) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Disable body scroll and lock position
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      // Store scroll position for restoration
      document.body.setAttribute('data-scroll-y', scrollY.toString());
    } else {
      // Re-enable body scroll
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-y');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
      }
    }
    
    // Cleanup
    return () => {
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-y');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
      }
    };
  }, [showTagsModal, showBulkTagsModal, showPriorityReasonModal, showSaveFilterModal]);

  // Auto-refresh functionality - silently updates tickets in background
  useEffect(() => {
    // Check if user is currently editing or has unsaved changes
    const isUserBusy = () => {
      return (
        editingStatus !== null ||
        editingPriority !== null ||
        editingDepartment !== null ||
        updatingTicket !== null ||
        showTagsModal ||
        showBulkTagsModal ||
        showPriorityReasonModal ||
        showSaveFilterModal ||
        filterName.trim() !== '' ||
        filterDescription.trim() !== '' ||
        priorityReason.trim() !== ''
      );
    };

    // Check if page is visible
    const isPageVisible = () => {
      return document.visibilityState === 'visible';
    };

    // Auto-refresh interval: 15 seconds
    const refreshInterval = 15000; // 15 seconds

    const intervalId = setInterval(() => {
      // Only refresh if:
      // 1. User is not busy (no editing, no modals, no unsaved changes)
      // 2. Page is visible (user is viewing the page)
      // 3. Router is ready
      if (router.isReady && !isUserBusy() && isPageVisible()) {
        // Silently refresh without showing loading state
        fetchTickets(true);
      }
    }, refreshInterval);

    // Also refresh when page becomes visible (if user was away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && router.isReady && !isUserBusy()) {
        // Small delay to ensure page is fully visible
        setTimeout(() => {
          fetchTickets(true);
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    router.isReady,
    editingStatus,
    editingPriority,
    updatingTicket,
    showTagsModal,
    showBulkTagsModal,
    showPriorityReasonModal,
    showSaveFilterModal,
    filterName,
    filterDescription,
    priorityReason,
    filters,
    currentPage,
    debouncedSearchQuery,
    selectedTags,
    searchType
  ]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/admin/agents');
        const data = await res.json();
        if (res.ok) {
          setAgents(data.agents || []);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };
    
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/admin/departments');
        const data = await res.json();
        if (res.ok) {
          setDepartments(data.departments || []);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    
    fetchAgents();
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/admin/tags');
        const data = await res.json();
        if (res.ok) {
          console.log('Fetched tags:', data.tags);
          setAvailableTags(data.tags || []);
        } else {
          console.error('Failed to fetch tags:', data);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.agentId !== 'all') params.append('agentId', filters.agentId);
      else if (filters.assignee !== 'all') params.append('assignee', filters.assignee);
      if (filters.dateRange !== 'all') params.append('dateRange', filters.dateRange);
      if (filters.productModel !== 'all') params.append('productModel', filters.productModel);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
        if (searchType !== 'all') params.append('searchType', searchType);
      }
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
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
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Check if search query contains 3+ consecutive alphanumeric characters
  const hasConsecutiveAlphanumeric = (str) => {
    if (!str || str.length < 3) return false;
    // Extract all alphanumeric sequences and check if any has length >= 3
    const alphanumericSequence = str.match(/[a-zA-Z0-9]{3,}/g);
    return alphanumericSequence && alphanumericSequence.length > 0;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    
    // If search query has 3+ consecutive alphanumeric characters, automatically use 'all' search
    if (searchQuery.trim() && hasConsecutiveAlphanumeric(searchQuery.trim())) {
      setSearchType('all');
    }
    
    // Immediately update debounced search query when form is submitted
    setDebouncedSearchQuery(searchQuery);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setCurrentPage(1);
  };

  const handleTicketClick = (ticketId) => {
    router.push(`/admin/tickets/${ticketId}`);
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      assignee: 'all',
      agentId: 'all',
      dateRange: 'all',
      productModel: 'all',
      tags: []
    });
    setSearchQuery('');
    setSearchType('all');
    setSelectedTags([]);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      // Fetch all tickets matching current filters (without pagination)
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.agentId !== 'all') params.append('agentId', filters.agentId);
      else if (filters.assignee !== 'all') params.append('assignee', filters.assignee);
      if (filters.dateRange !== 'all') params.append('dateRange', filters.dateRange);
      if (filters.productModel !== 'all') params.append('productModel', filters.productModel);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
        if (searchType !== 'all') params.append('searchType', searchType);
      }
      params.append('limit', '10000'); // Large limit to get all results
      
      const response = await fetch(`/api/admin/tickets?${params}`);
      const data = await response.json();
      
      if (!response.ok || !data.tickets) {
        alert('Error exporting tickets');
        return;
      }

      // Convert to CSV
      const headers = ['Ticket ID', 'Subject', 'Status', 'Priority', 'Customer Name', 'Customer Email', 'Customer Phone', 'Agent', 'Product Model', 'Category', 'Created At', 'Updated At'];
      const rows = data.tickets.map(ticket => [
        ticket.id || '',
        ticket.subject || '',
        ticket.status || '',
        ticket.priority || '',
        ticket.customerName || ticket.customer?.name || '',
        ticket.customer?.email || '',
        ticket.customer?.phone || '',
        ticket.assignee?.name || 'Unassigned',
        ticket.productModel || '',
        ticket.category || '',
        new Date(ticket.createdAt).toLocaleString(),
        new Date(ticket.updatedAt).toLocaleString()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tickets_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting tickets:', error);
      alert('Error exporting tickets');
    }
  };

  // Fetch unique products for filter dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/admin/tickets?limit=1000');
        const data = await res.json();
        if (res.ok && data.tickets) {
          const uniqueProducts = [...new Set(
            data.tickets
              .map(t => t.productModel)
              .filter(p => p && p.trim())
          )].sort();
          setProducts(uniqueProducts);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  // Fetch saved filters
  useEffect(() => {
    const fetchSavedFilters = async () => {
      try {
        const res = await fetch('/api/admin/saved-filters');
        const data = await res.json();
        if (res.ok) {
          setSavedFilters(data.filters || []);
        }
      } catch (error) {
        console.error('Error fetching saved filters:', error);
      }
    };
    fetchSavedFilters();
  }, []);

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      alert('Please enter a filter name');
      return;
    }

    try {
      const filterConfig = {
        filters,
        searchType,
        selectedTags,
        searchQuery
      };

      const res = await fetch('/api/admin/saved-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: filterName,
          description: filterDescription,
          filters: filterConfig,
          createdBy: 'admin'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSavedFilters(prev => [data.filter, ...prev]);
        setShowSaveFilterModal(false);
        setFilterName('');
        setFilterDescription('');
      }
    } catch (error) {
      console.error('Error saving filter:', error);
      alert('Error saving filter');
    }
  };

  const handleLoadFilter = (savedFilter) => {
    try {
      const filterConfig = JSON.parse(savedFilter.filters);
      setFilters(filterConfig.filters || filters);
      setSearchType(filterConfig.searchType || 'all');
      setSelectedTags(filterConfig.selectedTags || []);
      setSearchQuery(filterConfig.searchQuery || '');
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading filter:', error);
      alert('Error loading filter');
    }
  };

  const handleDeleteFilter = async (id) => {
    if (!confirm('Are you sure you want to delete this saved filter?')) return;

    try {
      const res = await fetch(`/api/admin/saved-filters/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSavedFilters(prev => prev.filter(f => f.id !== id));
      }
    } catch (error) {
      console.error('Error deleting filter:', error);
      alert('Error deleting filter');
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedTicketIds([]);
      setSelectAll(false);
    } else {
      setSelectedTicketIds(tickets.map(t => t.id));
      setSelectAll(true);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedTicketIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setSelectAll(next.length === tickets.length && tickets.length > 0);
      return next;
    });
  };

  const resetBulkControls = () => {
    setBulk({ status: 'none', priority: 'none', assigneeId: 'none', departmentId: 'none', addTags: [], removeTags: [] });
    setSelectedTicketIds([]);
    setSelectAll(false);
    setShowBulkTagsModal(false);
  };

  const applyBulkUpdates = async () => {
    if (selectedTicketIds.length === 0) return;
    const updates = {};
    if (bulk.status !== 'none') updates.status = bulk.status;
    if (bulk.priority !== 'none') updates.priority = bulk.priority;
    if (bulk.assigneeId !== 'none') {
      updates.assigneeId = bulk.assigneeId === 'unassign' ? null : bulk.assigneeId;
    }
    if (bulk.departmentId !== 'none') {
      updates.departmentId = bulk.departmentId === 'unroute' ? null : bulk.departmentId;
    }
    
    const hasTagUpdates = (bulk.addTags && bulk.addTags.length > 0) || (bulk.removeTags && bulk.removeTags.length > 0);
    const hasOtherUpdates = Object.keys(updates).length > 0;
    
    if (!hasTagUpdates && !hasOtherUpdates) return;

    try {
      setLoading(true);
      
      // Handle tag operations
      if (hasTagUpdates) {
        const tagPromises = [];
        
        // Add tags
        if (bulk.addTags && bulk.addTags.length > 0) {
          selectedTicketIds.forEach(ticketId => {
            bulk.addTags.forEach(tagId => {
              tagPromises.push(
                fetch(`/api/admin/tickets/${ticketId}/tags`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tagId })
                })
              );
            });
          });
        }
        
        // Remove tags
        if (bulk.removeTags && bulk.removeTags.length > 0) {
          selectedTicketIds.forEach(ticketId => {
            bulk.removeTags.forEach(tagId => {
              tagPromises.push(
                fetch(`/api/admin/tickets/${ticketId}/tags`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tagId })
                })
              );
            });
          });
        }
        
        await Promise.all(tagPromises);
      }
      
      // Handle other updates (status, priority, assignee)
      if (hasOtherUpdates) {
        await Promise.all(
          selectedTicketIds.map(id =>
            fetch(`/api/admin/tickets/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
            })
          )
        );
      }
      
      await fetchTickets();
      resetBulkControls();
    } catch (error) {
      console.error('Bulk update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Inline editing handlers
  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      setUpdatingTicket(ticketId);
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingTicket(null);
      setEditingStatus(null);
    }
  };

  const handlePriorityChangeClick = (ticketId, newPriority) => {
    setPendingPriorityUpdate({ ticketId, priority: newPriority });
    setPriorityReason('');
    setShowPriorityReasonModal(true);
  };

  const handlePriorityUpdate = async () => {
    if (!pendingPriorityUpdate.ticketId || !pendingPriorityUpdate.priority) return;
    
    try {
      setUpdatingTicket(pendingPriorityUpdate.ticketId);
      const response = await fetch(`/api/admin/tickets/${pendingPriorityUpdate.ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priority: pendingPriorityUpdate.priority,
          priorityReason: priorityReason.trim() || null
        })
      });
      if (response.ok) {
        await fetchTickets();
        setShowPriorityReasonModal(false);
        setPendingPriorityUpdate({ ticketId: null, priority: null });
        setPriorityReason('');
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    } finally {
      setUpdatingTicket(null);
      setEditingPriority(null);
    }
  };

  const handleTagAdd = async (ticketId, tagId) => {
    try {
      setUpdatingTicket(ticketId);
      const response = await fetch(`/api/admin/tickets/${ticketId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId })
      });
      if (response.ok) {
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    } finally {
      setUpdatingTicket(null);
    }
  };

  const openTagsModal = (ticketId) => {
    setTagsModalTicketId(ticketId);
    setShowTagsModal(true);
  };

  const closeTagsModal = () => {
    setShowTagsModal(false);
    setTagsModalTicketId(null);
  };

  const handleTagRemove = async (ticketId, tagId) => {
    try {
      setUpdatingTicket(ticketId);
      const response = await fetch(`/api/admin/tickets/${ticketId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId })
      });
      if (response.ok) {
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    } finally {
      setUpdatingTicket(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
      closed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
      pending: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
      resolved: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
      medium: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700',
      low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
    };
    return colors[priority] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <PageHead title="Tickets" description="Manage and track support tickets" />
      
      <AdminLayout currentPage="Tickets">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tickets</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {totalTickets} total tickets • {tickets.filter(t => t.status === 'open').length} open
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleExport}
                variant="outline"
                className="h-11 px-6 border-2 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={() => router.push('/admin/tickets/new')}
                className="h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl overflow-hidden">
            <CardContent className="space-y-5 p-6">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <Input
                    type="text"
                    placeholder={
                      searchType === 'mobile' ? 'Search by mobile number...' :
                      searchType === 'email' ? 'Search by customer email...' :
                      searchType === 'name' ? 'Search by customer name...' :
                      searchType === 'ticketId' ? 'Search by ticket ID...' :
                      searchType === 'product' ? 'Search by product model...' :
                      'Search tickets (enter 3+ alphanumeric characters to search all fields)...'
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchQuery(value);
                      
                      // Automatically switch to 'all' search mode if 3+ consecutive alphanumeric characters detected
                      if (value.trim() && hasConsecutiveAlphanumeric(value.trim())) {
                        setSearchType('all');
                      }
                    }}
                    className="pl-12 h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                <select
                  value={searchType}
                  onChange={(e) => {
                    setSearchType(e.target.value);
                    // If there's a search query, immediately trigger search with current query
                    if (searchQuery.trim()) {
                      setCurrentPage(1);
                      // Immediately update debounced search to trigger search
                      setDebouncedSearchQuery(searchQuery);
                    }
                  }}
                  className="h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                >
                  <option value="all">All Fields</option>
                  <option value="mobile">Mobile No</option>
                  <option value="email">Customer Email</option>
                  <option value="name">Customer Name</option>
                  <option value="ticketId">Ticket ID</option>
                  <option value="product">Product</option>
                </select>
                <Button type="submit" className="h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-violet-500/30 font-medium transition-all hover:shadow-xl">
                  Search
                </Button>
              </form>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                  >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">Agent</label>
                  <select
                    value={filters.agentId}
                    onChange={(e) => handleFilterChange('agentId', e.target.value)}
                    className="w-full border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                  >
                    <option value="all">All Agents</option>
                    <option value="unassigned">Unassigned</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">Product/Model</label>
                  <select
                    value={filters.productModel}
                    onChange={(e) => handleFilterChange('productModel', e.target.value)}
                    className="w-full border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                  >
                    <option value="all">All Products</option>
                    {products.map(product => (
                      <option key={product} value={product}>{product}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">Date Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="w-full border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(prev => prev.filter(id => id !== tag.id));
                          } else {
                            setSelectedTags(prev => [...prev, tag.id]);
                          }
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                          isSelected
                            ? 'ring-2 ring-violet-500 shadow-md scale-105 border-white/30 dark:border-white/20'
                            : 'hover:shadow-md hover:scale-105 border-transparent dark:text-slate-200'
                        }`}
                        style={{
                          backgroundColor: isSelected ? tag.color || '#8b5cf6' : `${tag.color || '#8b5cf6'}40`,
                          color: isSelected ? 'white' : (tag.color || '#8b5cf6')
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saved Filters & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Saved Filters:</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const filter = savedFilters.find(f => f.id === e.target.value);
                        if (filter) handleLoadFilter(filter);
                        e.target.value = '';
                      }
                    }}
                    className="h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                  >
                    <option value="">Select a saved filter...</option>
                    {savedFilters.map(filter => (
                      <option key={filter.id} value={filter.id}>{filter.name}</option>
                    ))}
                  </select>
                  {savedFilters.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {savedFilters.slice(0, 3).map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => handleLoadFilter(filter)}
                          className="px-3 py-1.5 text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-xl hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-all flex items-center gap-1 border border-violet-200 dark:border-violet-800 shadow-sm hover:shadow-md"
                        >
                          {filter.name}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFilter(filter.id);
                            }}
                            className="hover:text-red-600 dark:hover:text-red-400 ml-1"
                          >
                            ×
                          </button>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => setShowSaveFilterModal(true)}
                    variant="outline"
                    className="h-11 px-6 text-violet-600 dark:text-violet-400 border-2 border-violet-300 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                  >
                    Save Filter
                  </Button>
                  <Button 
                    onClick={clearFilters}
                    variant="outline" 
                    className="h-11 px-6 text-slate-600 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-violet-100 dark:border-violet-800/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <TicketIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  Tickets
                </CardTitle>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  Showing {tickets.length} of {totalTickets} tickets
                </div>
              </div>
              {selectedTicketIds.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-7 gap-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 border-2 border-violet-200 dark:border-violet-700 rounded-xl p-4 shadow-md">
                  <div className="text-sm font-bold text-violet-800 dark:text-violet-300 md:col-span-7 flex items-center gap-2">
                    <div className="w-5 h-5 bg-violet-600 dark:bg-violet-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{selectedTicketIds.length}</span>
                    </div>
                    {selectedTicketIds.length} ticket{selectedTicketIds.length > 1 ? 's' : ''} selected
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    <select
                      value={bulk.status}
                      onChange={(e) => setBulk(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                    >
                      <option value="none">No change</option>
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                    <select
                      value={bulk.priority}
                      onChange={(e) => setBulk(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                    >
                      <option value="none">No change</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Tags</label>
                    <Button
                      onClick={() => setShowBulkTagsModal(true)}
                      variant="outline"
                      className="w-full h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-sm hover:shadow-md"
                    >
                      <TagIcon className="w-4 h-4" />
                      <span className="text-xs">
                        {bulk.addTags.length > 0 || bulk.removeTags.length > 0
                          ? `${bulk.addTags.length} add, ${bulk.removeTags.length} remove`
                          : 'Manage Tags'}
                      </span>
                    </Button>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Assign to Agent</label>
                    <select
                      value={bulk.assigneeId}
                      onChange={(e) => setBulk(prev => ({ ...prev, assigneeId: e.target.value }))}
                      className="w-full h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                    >
                      <option value="none">No change</option>
                      <option value="unassign">Unassign</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Route to Department</label>
                    <select
                      value={bulk.departmentId}
                      onChange={(e) => setBulk(prev => ({ ...prev, departmentId: e.target.value }))}
                      className="w-full h-11 border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                    >
                      <option value="none">No change</option>
                      <option value="unroute">Unroute</option>
                      {departments.filter(d => d.isActive).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end space-x-2">
                    <Button onClick={applyBulkUpdates} className="h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white w-full rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all">Apply</Button>
                    <Button onClick={resetBulkControls} variant="outline" className="h-11 w-full border-2 border-slate-300 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-medium transition-all shadow-sm hover:shadow-md">Clear</Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="flex items-center space-x-4">
                          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                          </div>
                          <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No tickets found</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No tickets match your current filters.</p>
                  <Button 
                    onClick={() => router.push('/admin/tickets/new')}
                    className="mt-4 h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all"
                  >
                    Create First Ticket
                  </Button>
                </div>
              ) : (
                 <div className="space-y-3">
                   <div className="flex items-center px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                     <label className="flex items-center cursor-pointer group">
                       <div className="relative">
                         <input
                           type="checkbox"
                           checked={selectAll}
                           onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                           className="sr-only"
                         />
                         <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                           selectAll 
                             ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-lg shadow-violet-500/30' 
                             : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500'
                         }`}>
                           {selectAll && (
                             <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                               <path d="M5 13l4 4L19 7"></path>
                             </svg>
                           )}
                         </div>
                       </div>
                       <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                         Select all on this page
                       </span>
                     </label> 
                   </div>
                   {tickets.map((ticket, index) => (
                     <div 
                       key={ticket.id} 
                       onClick={() => handleTicketClick(ticket.id)}
                       className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-0.5"
                     >
                       {/* Status Indicator Bar */}
                       <div className={`h-1.5 w-full ${
                         ticket.status === 'open' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600' :
                         ticket.status === 'pending' ? 'bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600' :
                         ticket.status === 'resolved' ? 'bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-600' :
                         'bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600'
                       }`}></div>
                       
                       <div className="p-5">
                         <div className="flex items-start justify-between">
                          {/* Left Section */}
                          <div className="flex items-start space-x-4 flex-1 min-w-0">
                            {/* Row checkbox */}
                            <div className="pt-1">
                              <label className="cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    onChange={() => toggleSelectOne(ticket.id)}
                                    checked={selectedTicketIds.includes(ticket.id)}
                                    className="sr-only"
                                  />
                                  <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                                    selectedTicketIds.includes(ticket.id)
                                      ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
                                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
                                  }`}>
                                    {selectedTicketIds.includes(ticket.id) && (
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M5 13l4 4L19 7"></path>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </label>
                            </div>
                            {/* Ticket Icon */}
                             <div className="flex-shrink-0">
                               <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                                 <TicketIcon className="w-7 h-7 text-white" />
                               </div>
                             </div>
                             
                             {/* Ticket Content */}
                             <div className="flex-1 min-w-0">
                               {/* Header Row */}
                               <div className="flex items-start justify-between mb-3">
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-3 mb-2">
                                     <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors flex-1">
                                       {ticket.subject}
                                     </h3>
                                     {/* Customer Name - Inline with Title */}
                                     {ticket.customerName && (
                                       <div className="flex items-center space-x-2 text-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg px-3 py-1.5 border border-emerald-200 dark:border-emerald-800/50 flex-shrink-0">
                                         <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                         <span className="text-emerald-700 dark:text-emerald-300 font-medium truncate max-w-[120px]" title={ticket.customerName}>
                                           {ticket.customerName}
                                         </span>
                                       </div>
                                     )}
                                   </div>
                                   <div className="flex items-center space-x-2 flex-wrap gap-2">
                                     {/* Status - Inline Editable */}
                                     <div className="relative" onClick={(e) => e.stopPropagation()}>
                                       <Badge 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           const rect = e.currentTarget.getBoundingClientRect();
                                           setStatusDropdownPosition({
                                             top: rect.bottom + window.scrollY + 4,
                                             left: rect.left + window.scrollX
                                           });
                                           setEditingStatus(editingStatus === ticket.id ? null : ticket.id);
                                         }}
                                         className={`${getStatusColor(ticket.status)} border font-semibold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer ${
                                           ticket.status === 'open' 
                                             ? 'hover:bg-yellow-600 hover:text-yellow-50 dark:hover:bg-yellow-700 dark:hover:text-yellow-100' :
                                           ticket.status === 'closed' 
                                             ? 'hover:bg-green-600 hover:text-green-50 dark:hover:bg-green-700 dark:hover:text-green-100' :
                                           ticket.status === 'pending' 
                                             ? 'hover:bg-blue-600 hover:text-blue-50 dark:hover:bg-blue-700 dark:hover:text-blue-100' :
                                           ticket.status === 'resolved' 
                                             ? 'hover:bg-emerald-600 hover:text-emerald-50 dark:hover:bg-emerald-700 dark:hover:text-emerald-100' :
                                             'hover:bg-gray-600 hover:text-gray-50 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                                         }`}
                                       >
                                         {updatingTicket === ticket.id ? 'Updating...' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                                       </Badge>
                                     </div>
                                     
                                     {/* Priority - Inline Editable */}
                                     <div className="relative" onClick={(e) => e.stopPropagation()}>
                                       <Badge 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           const rect = e.currentTarget.getBoundingClientRect();
                                           setPriorityDropdownPosition({
                                             top: rect.bottom + window.scrollY + 4,
                                             left: rect.left + window.scrollX
                                           });
                                           setEditingPriority(editingPriority === ticket.id ? null : ticket.id);
                                         }}
                                         className={`${getPriorityColor(ticket.priority)} border font-semibold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer ${
                                           ticket.priority === 'high' 
                                             ? 'hover:bg-red-600 hover:text-red-50 dark:hover:bg-red-700 dark:hover:text-red-100' :
                                           ticket.priority === 'medium' 
                                             ? 'hover:bg-orange-600 hover:text-orange-50 dark:hover:bg-orange-700 dark:hover:text-orange-100' :
                                           ticket.priority === 'low' 
                                             ? 'hover:bg-green-600 hover:text-green-50 dark:hover:bg-green-700 dark:hover:text-green-100' :
                                             'hover:bg-gray-600 hover:text-gray-50 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                                         }`}
                                       >
                                         {updatingTicket === ticket.id ? 'Updating...' : `${(ticket.priority || 'low').charAt(0).toUpperCase() + (ticket.priority || 'low').slice(1)} Priority`}
                                       </Badge>
                                     </div>
                                     
                                     {/* Tags - Inline Editable (moved here to be beside priority) */}
                                     <div className="relative flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                       {ticket.tags && ticket.tags.length > 0 && ticket.tags.map((tag) => {
                                         // Conditional color for Video Call Tag: red if pending, green if done
                                         let tagColor = tag.color;
                                         if (tag.name === 'Video Call Tag') {
                                           // Use status from ConversationTag if available, otherwise fallback to ticket status
                                           const videoCallStatus = tag.status || (ticket.status === 'resolved' || ticket.status === 'closed' ? 'done' : 'pending');
                                           tagColor = videoCallStatus === 'done' ? '#10b981' : '#ef4444';
                                         }
                                         return (
                                           <div
                                             key={tag.id}
                                             className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm group relative border border-white/20"
                                             style={{ backgroundColor: tagColor }}
                                           >
                                             <TagIcon className="w-3 h-3" />
                                             <span>{tag.name}</span>
                                             <button
                                               onClick={() => handleTagRemove(ticket.id, tag.id)}
                                               className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded p-0.5"
                                               title="Remove tag"
                                             >
                                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                               </svg>
                                             </button>
                                           </div>
                                         );
                                       })}
                                       <button
                                         onClick={() => openTagsModal(ticket.id)}
                                         className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all border-2 border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md"
                                         title="Add tag"
                                       >
                                         <TagIcon className="w-3 h-3" />
                                         <span>+ Add</span>
                                       </button>
                                     </div>
                                     
                                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                      #{ticket.id}
                                    </span>
                                   </div>
                                 </div>
                               </div>
                               
                               {/* Details Grid */}
                               <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                                 {/* Created Date */}
                                 <div className="flex items-center space-x-2 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                   <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                   <div className="min-w-0">
                                     <span className="text-xs text-slate-500 dark:text-slate-400 block">Created</span>
                                     <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">{formatDate(ticket.createdAt)}</span>
                                   </div>
                                 </div>
                                 
                                 {/* Assignee */}
                                 <div className="flex items-center space-x-2 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                   <UserIcon className={`w-4 h-4 flex-shrink-0 ${ticket.assignee ? 'text-violet-600 dark:text-violet-400' : 'text-orange-500 dark:text-orange-400'}`} />
                                   <div className="min-w-0">
                                     <span className="text-xs text-slate-500 dark:text-slate-400 block">Assignee</span>
                                     <span className={`text-xs font-medium truncate ${ticket.assignee ? "text-slate-700 dark:text-slate-300" : "text-orange-600 dark:text-orange-400"}`}>
                                       {ticket.assignee ? ticket.assignee.name : 'Unassigned'}
                                     </span>
                                   </div>
                                 </div>
                                 
                                 {/* Department - Inline Editable */}
                                 <div className="flex items-center space-x-2 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700 relative">
                                   <Building2 className={`w-4 h-4 flex-shrink-0 ${ticket.department ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                   <div className="min-w-0 flex-1">
                                     <span className="text-xs text-slate-500 dark:text-slate-400 block">Department</span>
                                     <div className="relative" onClick={(e) => e.stopPropagation()}>
                                       <Badge 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           const rect = e.currentTarget.getBoundingClientRect();
                                           setDepartmentDropdownPosition({
                                             top: rect.bottom + window.scrollY + 4,
                                             left: rect.left + window.scrollX
                                           });
                                           setEditingDepartment(editingDepartment === ticket.id ? null : ticket.id);
                                         }}
                                         className={`border-2 font-semibold px-4 py-2 rounded-xl text-xs shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer ${
                                           ticket.department
                                             ? 'bg-gradient-to-r from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 text-white border-violet-400 dark:border-violet-500 hover:from-violet-600 hover:to-purple-700 dark:hover:from-violet-700 dark:hover:to-purple-800 shadow-violet-500/30 dark:shadow-violet-500/20'
                                             : 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:from-slate-300 hover:to-slate-400 dark:hover:from-slate-600 dark:hover:to-slate-700'
                                         }`}
                                       >
                                         {updatingTicket === ticket.id ? 'Updating...' : (ticket.department ? ticket.department.name : 'Not routed')}
                                       </Badge>
                                     </div>
                                   </div>
                                 </div>
                                 
                                 {/* Message Count */}
                                 <div className="flex items-center space-x-2 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                   <MessageSquare className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                   <div className="min-w-0">
                                     <span className="text-xs text-slate-500 dark:text-slate-400 block">Messages</span>
                                     <span className="inline-flex items-center bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-md text-xs font-semibold">
                                       {ticket.messageCount}
                                     </span>
                                   </div>
                                 </div>
                               </div>
                               
                               {/* Last Message Preview */}
                               {ticket.lastMessage && (() => {
                                 const isAdminOrAgent = ticket.lastMessage.senderType === 'agent' || ticket.lastMessage.senderType === 'admin';
                                 const senderLabel = ticket.lastMessage.senderType === 'admin' 
                                   ? 'Admin' 
                                   : ticket.lastMessage.senderType === 'agent' 
                                     ? (ticket.lastMessage.agent?.name ? `Agent - ${ticket.lastMessage.agent.name}` : 'Agent')
                                     : 'Customer';
                                 return (
                                   <div className="mt-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800/50">
                                     <div className="flex items-start space-x-3">
                                       <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                                         isAdminOrAgent
                                           ? 'bg-violet-500 dark:bg-violet-400 ring-2 ring-violet-300 dark:ring-violet-600' 
                                           : 'bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-300 dark:ring-slate-600'
                                       }`}></div>
                                       <div className="flex-1 min-w-0">
                                         <div 
                                           className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed break-words overflow-wrap-anywhere"
                                           dangerouslySetInnerHTML={{
                                             __html: ticket.lastMessage.content
                                               .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                               .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                               .replace(/__(.*?)__/g, '<u>$1</u>')
                                           }}
                                         />
                                         <div className="flex items-center gap-2 mt-2">
                                           <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                                             isAdminOrAgent
                                               ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                                               : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                           }`}>
                                             {senderLabel}
                                           </span>
                                           <span className="text-xs text-slate-500 dark:text-slate-400">
                                             {formatDate(ticket.lastMessage.createdAt)}
                                           </span>
                                         </div>
                                       </div>
                                     </div>
                                   </div>
                                 );
                               })()}
                             </div>
                           </div>
                           
                           {/* Right Section - Action Button */}
                           <div className="flex-shrink-0 ml-4">
                             {/* Action Button */}
                             <Button 
                               variant="ghost" 
                               size="sm"
                               className="h-10 px-4 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 hover:text-violet-700 dark:hover:text-violet-300 rounded-xl font-medium shadow-sm hover:shadow-md"
                             >
                               View Details
                               <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                             </Button>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    Page {currentPage} of {totalPages} • {totalTickets} total tickets
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-10 border-2 border-slate-300 dark:border-slate-700 dark:text-slate-300 rounded-xl px-4 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-10 w-10 rounded-xl font-semibold transition-all ${
                              currentPage === page 
                                ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl" 
                                : "border-2 border-slate-300 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm hover:shadow-md"
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-10 border-2 border-slate-300 dark:border-slate-700 dark:text-slate-300 rounded-xl px-4 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        {/* Priority Reason Modal - Rendered via Portal */}
        {showPriorityReasonModal && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowPriorityReasonModal(false);
              setPendingPriorityUpdate({ ticketId: null, priority: null });
              setPriorityReason('');
            }}
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              boxSizing: 'border-box',
              margin: 0
            }}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxHeight: '85vh',
                margin: 'auto',
                transform: 'translateY(0)',
                alignSelf: 'center'
              }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 dark:bg-violet-500 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        Change Priority to {pendingPriorityUpdate.priority?.charAt(0).toUpperCase() + pendingPriorityUpdate.priority?.slice(1)}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Please provide a reason for changing the priority (optional)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPriorityReasonModal(false);
                      setPendingPriorityUpdate({ ticketId: null, priority: null });
                      setPriorityReason('');
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Close"
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <textarea
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="e.g., Customer escalation, urgent issue, SLA deadline approaching..."
                  className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-none"
                  rows={4}
                />
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPriorityReasonModal(false);
                      setPendingPriorityUpdate({ ticketId: null, priority: null });
                      setPriorityReason('');
                    }}
                    disabled={updatingTicket !== null}
                    className="border-slate-300 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePriorityUpdate}
                    disabled={updatingTicket !== null}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {updatingTicket !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating...</span>
                      </div>
                    ) : (
                      'Update Priority'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Click outside to close dropdowns */}
        {(editingStatus || editingPriority || editingDepartment) && (
          <div 
            className="fixed inset-0 z-[50]" 
            onClick={() => {
              setEditingStatus(null);
              setEditingPriority(null);
              setEditingDepartment(null);
              setStatusDropdownPosition({ top: 0, left: 0 });
              setPriorityDropdownPosition({ top: 0, left: 0 });
              setDepartmentDropdownPosition({ top: 0, left: 0 });
            }}
          />
        )}

        {/* Status Dropdown - Rendered via Portal */}
        {editingStatus && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed z-[70] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[120px]"
            style={{
              top: `${statusDropdownPosition.top}px`,
              left: `${statusDropdownPosition.left}px`
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {['open', 'pending', 'resolved', 'closed'].map(status => {
              const ticket = tickets.find(t => t.id === editingStatus);
              return (
                <button
                  key={status}
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(editingStatus, status);
                    setEditingStatus(null);
                    setStatusDropdownPosition({ top: 0, left: 0 });
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors cursor-pointer ${
                    ticket?.status === status ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              );
            })}
          </div>,
          document.body
        )}

        {/* Priority Dropdown - Rendered via Portal */}
        {editingPriority && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed z-[70] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[140px]"
            style={{
              top: `${priorityDropdownPosition.top}px`,
              left: `${priorityDropdownPosition.left}px`
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {['low', 'medium', 'high'].map(priority => {
              const ticket = tickets.find(t => t.id === editingPriority);
              return (
                <button
                  key={priority}
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePriorityChangeClick(editingPriority, priority);
                    setEditingPriority(null);
                    setPriorityDropdownPosition({ top: 0, left: 0 });
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors cursor-pointer ${
                    ticket?.priority === priority ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                </button>
              );
            })}
          </div>,
          document.body
        )}

        {/* Department Dropdown - Rendered via Portal */}
        {editingDepartment && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed z-[70] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[180px] max-h-64 overflow-y-auto"
            style={{
              top: `${departmentDropdownPosition.top}px`,
              left: `${departmentDropdownPosition.left}px`
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={async (e) => {
                e.stopPropagation();
                const ticketId = editingDepartment;
                try {
                  setUpdatingTicket(ticketId);
                  const response = await fetch(`/api/admin/tickets/${ticketId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ departmentId: null })
                  });
                  if (response.ok) {
                    await fetchTickets();
                    setEditingDepartment(null);
                    setDepartmentDropdownPosition({ top: 0, left: 0 });
                  }
                } catch (error) {
                  console.error('Error unrouting ticket:', error);
                } finally {
                  setUpdatingTicket(null);
                }
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg transition-colors cursor-pointer ${
                !tickets.find(t => t.id === editingDepartment)?.departmentId ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Not routed
            </button>
            {departments.filter(d => d.isActive).map(dept => {
              const ticket = tickets.find(t => t.id === editingDepartment);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const ticketId = editingDepartment;
                    try {
                      setUpdatingTicket(ticketId);
                      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ departmentId: dept.id })
                      });
                      if (response.ok) {
                        await fetchTickets();
                        setEditingDepartment(null);
                        setDepartmentDropdownPosition({ top: 0, left: 0 });
                      }
                    } catch (error) {
                      console.error('Error routing ticket:', error);
                    } finally {
                      setUpdatingTicket(null);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 last:rounded-b-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    ticket?.departmentId === dept.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{dept.name}</span>
                  {ticket?.departmentId === dept.id && (
                    <CheckIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}

        {/* Tags Selection Modal - Rendered via Portal */}
        {showTagsModal && tagsModalTicketId && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
            onClick={closeTagsModal}
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              boxSizing: 'border-box',
              margin: 0
            }}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxHeight: '85vh',
                margin: 'auto',
                transform: 'translateY(0)',
                alignSelf: 'center'
              }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 dark:bg-violet-500 rounded-lg">
                      <TagIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select Tags</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Choose tags to add to this ticket</p>
                    </div>
                  </div>
                  <button
                    onClick={closeTagsModal}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Close"
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content - Tags Grid with Wrap */}
              <div className="flex-1 overflow-y-auto p-6 show-scrollbar">
                {availableTags.length === 0 ? (
                  <div className="text-center py-12">
                    <TagIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading tags...</p>
                  </div>
                ) : (() => {
                  const currentTicket = tickets.find(t => t.id === tagsModalTicketId);
                  const ticketTagIds = (currentTicket?.tags || []).map(t => t.id);
                  const availableTagsToAdd = availableTags.filter(tag => !ticketTagIds.includes(tag.id));
                  
                  if (availableTagsToAdd.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <TagIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">All tags have been added to this ticket</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex flex-wrap gap-3">
                      {availableTagsToAdd.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            handleTagAdd(tagsModalTicketId, tag.id);
                          }}
                          disabled={updatingTicket === tagsModalTicketId}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          style={{ backgroundColor: tag.color || '#8b5cf6' }}
                          title={tag.name}
                        >
                          <TagIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{tag.name}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-end">
                  <Button
                    onClick={closeTagsModal}
                    variant="outline"
                    className="border-slate-300 dark:border-slate-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Bulk Tags Selection Modal - Rendered via Portal */}
        {showBulkTagsModal && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
            onClick={() => setShowBulkTagsModal(false)}
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              boxSizing: 'border-box',
              margin: 0
            }}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxHeight: '85vh',
                margin: 'auto',
                transform: 'translateY(0)',
                alignSelf: 'center'
              }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 dark:bg-violet-500 rounded-lg">
                      <TagIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bulk Tag Management</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        Select tags to add or remove from {selectedTicketIds.length} ticket{selectedTicketIds.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBulkTagsModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Close"
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content - Two Sections: Add Tags and Remove Tags */}
              <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
                {availableTags.length === 0 ? (
                  <div className="text-center py-12">
                    <TagIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading tags...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Add Tags Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        Add Tags
                        {bulk.addTags.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                            {bulk.addTags.length}
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-3 max-h-[50vh] overflow-y-auto hide-scrollbar">
                        {availableTags.map((tag) => {
                          const isSelected = bulk.addTags.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => {
                                if (isSelected) {
                                  setBulk(prev => ({
                                    ...prev,
                                    addTags: prev.addTags.filter(id => id !== tag.id)
                                  }));
                                } else {
                                  setBulk(prev => ({
                                    ...prev,
                                    addTags: [...prev.addTags, tag.id],
                                    removeTags: prev.removeTags.filter(id => id !== tag.id) // Remove from removeTags if it was there
                                  }));
                                }
                              }}
                              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all ${
                                isSelected
                                  ? 'ring-4 ring-emerald-400 dark:ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800 scale-105 shadow-lg shadow-emerald-500/50'
                                  : 'hover:shadow-lg hover:scale-105'
                              }`}
                              style={{ backgroundColor: tag.color || '#8b5cf6' }}
                              title={tag.name}
                            >
                              <TagIcon className="w-4 h-4 flex-shrink-0" />
                              <span>{tag.name}</span>
                              {isSelected && (
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Remove Tags Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Remove Tags
                        {bulk.removeTags.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
                            {bulk.removeTags.length}
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-3 max-h-[50vh] overflow-y-auto hide-scrollbar">
                        {availableTags.map((tag) => {
                          const isSelected = bulk.removeTags.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => {
                                if (isSelected) {
                                  setBulk(prev => ({
                                    ...prev,
                                    removeTags: prev.removeTags.filter(id => id !== tag.id)
                                  }));
                                } else {
                                  setBulk(prev => ({
                                    ...prev,
                                    removeTags: [...prev.removeTags, tag.id],
                                    addTags: prev.addTags.filter(id => id !== tag.id) // Remove from addTags if it was there
                                  }));
                                }
                              }}
                              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all opacity-90 ${
                                isSelected
                                  ? 'ring-4 ring-red-400 dark:ring-red-500 ring-offset-2 dark:ring-offset-slate-800 scale-105 shadow-lg shadow-red-500/50 opacity-100'
                                  : 'hover:shadow-lg hover:scale-105'
                              }`}
                              style={{ backgroundColor: tag.color || '#8b5cf6' }}
                              title={tag.name}
                            >
                              <TagIcon className="w-4 h-4 flex-shrink-0" />
                              <span>{tag.name}</span>
                              {isSelected && (
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {bulk.addTags.length > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {bulk.addTags.length} tag{bulk.addTags.length > 1 ? 's' : ''} to add
                      </span>
                    )}
                    {bulk.addTags.length > 0 && bulk.removeTags.length > 0 && <span className="mx-2">•</span>}
                    {bulk.removeTags.length > 0 && (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {bulk.removeTags.length} tag{bulk.removeTags.length > 1 ? 's' : ''} to remove
                      </span>
                    )}
                    {bulk.addTags.length === 0 && bulk.removeTags.length === 0 && (
                      <span>No tags selected</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setBulk(prev => ({ ...prev, addTags: [], removeTags: [] }));
                      }}
                      variant="outline"
                      className="border-slate-300 dark:border-slate-700"
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={() => setShowBulkTagsModal(false)}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Save Filter Modal - Rendered via Portal */}
        {showSaveFilterModal && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowSaveFilterModal(false);
              setFilterName('');
              setFilterDescription('');
            }}
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              boxSizing: 'border-box',
              margin: 0
            }}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxHeight: '85vh',
                margin: 'auto',
                transform: 'translateY(0)',
                alignSelf: 'center'
              }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 dark:bg-violet-500 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Save Filter</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Save your current filter settings for quick access</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowSaveFilterModal(false);
                      setFilterName('');
                      setFilterDescription('');
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Close"
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Filter Name *
                  </label>
                  <Input
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="e.g., High Priority Open Tickets"
                    className="w-full dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                    placeholder="Brief description of this filter..."
                    className="w-full border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 rounded-lg px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-none"
                    rows="3"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-end gap-3">
                  <Button
                    onClick={() => {
                      setShowSaveFilterModal(false);
                      setFilterName('');
                      setFilterDescription('');
                    }}
                    variant="outline"
                    className="border-slate-300 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveFilter}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();

