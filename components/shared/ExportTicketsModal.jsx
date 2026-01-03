import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Loader2, Download, Search, X } from 'lucide-react';

/**
 * ExportTicketsModal - Custom export modal with filter options
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onExport - Export handler (filters) => Promise
 * @param {string[]} props.selectedTicketIds - Pre-selected ticket IDs (for bulk export)
 * @param {Object} props.availableAgents - Available agents for filter
 * @param {Object} props.availableAdmins - Available admins for filter
 */
export default function ExportTicketsModal({
  isOpen,
  onClose,
  onExport,
  selectedTicketIds = [],
  availableAgents = [],
  availableAdmins = []
}) {
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all', // 'all', 'today', 'week', 'month', 'custom'
    startDate: '',
    endDate: '',
    status: 'all',
    priority: 'all',
    assignee: 'all',
    assigneeType: 'agent', // 'agent' or 'admin'
    customer: '',
    customerId: '', // Selected customer ID
    productModel: '',
    exportFormat: 'csv' // 'csv' or 'excel'
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const customerSearchTimeoutRef = useRef(null);
  const customerInputRef = useRef(null);
  const customerDropdownRef = useRef(null);

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilters({
        dateRange: 'all',
        startDate: '',
        endDate: '',
        status: 'all',
        priority: 'all',
        assignee: 'all',
        assigneeType: 'agent',
        customer: '',
        customerId: '',
        productModel: '',
        exportFormat: 'csv'
      });
      setCustomerSearch('');
      setCustomerResults([]);
      setShowCustomerDropdown(false);
    }
  }, [isOpen]);

  // Debounced customer search - only search after user stops typing for 500ms
  useEffect(() => {
    // Clear any existing timeout
    if (customerSearchTimeoutRef.current) {
      clearTimeout(customerSearchTimeoutRef.current);
    }

    // If search is too short, clear results
    if (customerSearch.trim().length < 2) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    // Set debounce - wait 500ms after user stops typing before searching
    customerSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchTerm = customerSearch.trim();
        if (searchTerm.length < 2) {
          setCustomerResults([]);
          setShowCustomerDropdown(false);
          return;
        }

        setSearchingCustomers(true);
        const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(searchTerm)}`);

        // Check if response is JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response received:', contentType);
          setCustomerResults([]);
          setShowCustomerDropdown(false);
          return;
        }

        const data = await res.json();
        if (res.ok) {
          setCustomerResults(data.customers || []);
          setShowCustomerDropdown(true);
        } else {
          console.error('Search API error:', data.message || 'Unknown error');
          setCustomerResults([]);
          setShowCustomerDropdown(false);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomerResults([]);
        setShowCustomerDropdown(false);
      } finally {
        setSearchingCustomers(false);
      }
    }, 500); // Wait 500ms after user stops typing

    // Cleanup function
    return () => {
      if (customerSearchTimeoutRef.current) {
        clearTimeout(customerSearchTimeoutRef.current);
      }
    };
  }, [customerSearch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        customerInputRef.current &&
        !customerInputRef.current.contains(event.target) &&
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target)
      ) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown]);

  const handleSelectCustomer = (customer) => {
    setFilters(prev => ({
      ...prev,
      customer: customer.email || customer.name || '',
      customerId: customer.id
    }));
    setCustomerSearch(customer.email || customer.name || '');
    setShowCustomerDropdown(false);
    setCustomerResults([]);
  };

  const handleClearCustomer = () => {
    setFilters(prev => ({
      ...prev,
      customer: '',
      customerId: ''
    }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setCustomerResults([]);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport({
        ...filters,
        ticketIds: selectedTicketIds.length > 0 ? selectedTicketIds : undefined
      });
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export tickets');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Tickets
          </DialogTitle>
          <DialogDescription>
            {selectedTicketIds.length > 0
              ? `Export ${selectedTicketIds.length} selected ticket(s) with custom filters`
              : 'Configure export filters and download tickets'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-2">
            <Label htmlFor="exportFormat">Export Format</Label>
            <Select
              value={filters.exportFormat}
              onValueChange={(value) => setFilters(prev => ({ ...prev, exportFormat: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                <SelectItem value="excel" disabled>Excel (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={filters.priority}
              onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee Filter */}
          <div className="space-y-2">
            <Label htmlFor="assigneeType">Assignee Type</Label>
            <Select
              value={filters.assigneeType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, assigneeType: value, assignee: 'all' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="all">All (Agent & Admin)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filters.assigneeType !== 'all' && (
            <div className="space-y-2">
              <Label htmlFor="assignee">
                {filters.assigneeType === 'admin' ? 'Admin' : 'Agent'}
              </Label>
              <Select
                value={filters.assignee}
                onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${filters.assigneeType}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filters.assigneeType === 'admin' ? 'Admins' : 'Agents'}</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(filters.assigneeType === 'admin' ? availableAdmins : availableAgents).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Customer Filter with Search Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer (Email or Name)</Label>
            <div className="relative" ref={customerInputRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="customer"
                  placeholder="Search by customer email or name..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (e.target.value.trim().length < 2) {
                      setFilters(prev => ({ ...prev, customer: '', customerId: '' }));
                    }
                  }}
                  onFocus={() => {
                    if (customerResults.length > 0) {
                      setShowCustomerDropdown(true);
                    }
                  }}
                  className="pl-10 pr-10"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Customer Dropdown */}
              {showCustomerDropdown && (
                <div
                  ref={customerDropdownRef}
                  className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {searchingCustomers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-600" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Searching...</p>
                    </div>
                  ) : customerResults.length > 0 ? (
                    <div className="py-1">
                      {customerResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {customer.name || 'No Name'}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {customer.email || 'No Email'}
                            </span>
                            {customer.phone && (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {customer.phone}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : customerSearch.trim().length >= 2 ? (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      No customers found
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {filters.customerId && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selected: {filters.customer}
              </p>
            )}
          </div>

          {/* Product Model Filter */}
          <div className="space-y-2">
            <Label htmlFor="productModel">Product Model</Label>
            <Input
              id="productModel"
              placeholder="Filter by product model..."
              value={filters.productModel}
              onChange={(e) => setFilters(prev => ({ ...prev, productModel: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Tickets
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

