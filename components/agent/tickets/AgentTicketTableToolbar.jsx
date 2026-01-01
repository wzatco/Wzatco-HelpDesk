import { useState } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import { 
  Search, 
  X, 
  Filter, 
  CheckSquare, 
  AlertTriangle, 
  User, 
  Users,
  ToggleLeft,
  ToggleRight,
  HandHeart
} from 'lucide-react';
import { Checkbox } from '../../ui/checkbox';
import { Switch } from '../../ui/switch';

export function AgentTicketTableToolbar({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  needReplyCount = 0
}) {
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const viewOptions = [
    { value: 'all', label: 'All Tickets' },
    { value: 'assigned', label: 'Assigned to Me' },
    { value: 'unassigned', label: 'Unassigned Pool' },
    { value: 'claimable', label: 'Available to Claim' }
  ];

  const hasActiveFilters = 
    filters.status !== 'all' || 
    filters.priority !== 'all' || 
    filters.view !== 'all' ||
    filters.needReply;

  const selectedCount = (key) => {
    return filters[key] !== 'all' ? 1 : 0;
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1: Primary Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search tickets by ID, customer, subject..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Popover>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="gap-2">
              <CheckSquare className="w-4 h-4" />
              Status
              {selectedCount('status') > 0 && (
                <Badge className="ml-1 bg-violet-600 text-white border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {selectedCount('status')}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Filter by Status</p>
              {statusOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    onFilterChange('status', option.value);
                  }}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Checkbox checked={filters.status === option.value} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Priority Filter */}
        <Popover>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Priority
              {selectedCount('priority') > 0 && (
                <Badge className="ml-1 bg-violet-600 text-white border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {selectedCount('priority')}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Filter by Priority</p>
              {priorityOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    onFilterChange('priority', option.value);
                  }}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Checkbox checked={filters.priority === option.value} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* View Filter */}
        <Popover>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              View
              {selectedCount('view') > 0 && (
                <Badge className="ml-1 bg-violet-600 text-white border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {selectedCount('view')}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Filter by View</p>
              {viewOptions.map((option) => {
                const Icon = option.value === 'assigned' ? User 
                  : option.value === 'unassigned' ? Users 
                  : option.value === 'claimable' ? HandHeart
                  : null;
                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      onFilterChange('view', option.value);
                    }}
                    className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Checkbox checked={filters.view === option.value} />
                    {Icon && <Icon className="w-4 h-4 text-slate-500" />}
                    <span className="text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="gap-2 text-slate-600 dark:text-slate-400"
          >
            <X className="w-4 h-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Row 2: Need Reply Toggle & Show All Toggle */}
      <div className="flex items-center gap-3 flex-wrap pb-2 border-b border-slate-200 dark:border-slate-700">
        <Button
          variant={filters.needReply ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            onFilterChange('needReply', !filters.needReply);
          }}
          className="gap-2"
        >
          {filters.needReply ? (
            <ToggleRight className="w-4 h-4" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          Need Reply
          {needReplyCount > 0 && (
            <Badge variant="destructive" className="ml-2 px-1.5 py-0 h-4 text-[10px]">
              {needReplyCount}
            </Badge>
          )}
        </Button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Show tickets waiting for agent response
        </span>
        
        {/* Show All Tickets Toggle */}
        <div className="flex items-center gap-2 ml-4">
          <Checkbox
            id="showAll"
            checked={filters.showAll}
            onCheckedChange={(checked) => onFilterChange('showAll', checked)}
          />
          <label
            htmlFor="showAll"
            className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none"
          >
            Show Resolved/Closed Tickets
          </label>
        </div>
      </div>
    </div>
  );
}
