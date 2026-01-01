import { useState } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import { 
  Search, 
  X, 
  ChevronDown,
  Calendar,
  Download
} from 'lucide-react';
import { Checkbox } from '../../ui/checkbox';

export function TicketToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onResetFilters,
  availableTags = [],
  products = [],
  agents = [],
  onExport
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

  const hasActiveFilters = 
    filters.status !== 'all' || 
    filters.priority !== 'all' || 
    filters.assignee !== 'all' ||
    filters.productModel !== 'all' ||
    filters.tags?.length > 0 ||
    filters.needReply !== 'all';

  return (
    <div className="space-y-4">
      {/* Main Toolbar Row */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Status Filter */}
        <Popover>
          <PopoverTrigger>
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-slate-600 dark:text-slate-400">
              Status
              <ChevronDown className="w-3 h-3 ml-1" />
              {filters.status !== 'all' && (
                <Badge className="ml-1 bg-violet-600 text-white h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56">
            <div className="space-y-1">
              {statusOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => onFiltersChange({ ...filters, status: option.value })}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-slate-600 dark:text-slate-400">
              Priority
              <ChevronDown className="w-3 h-3 ml-1" />
              {filters.priority !== 'all' && (
                <Badge className="ml-1 bg-violet-600 text-white h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56">
            <div className="space-y-1">
              {priorityOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => onFiltersChange({ ...filters, priority: option.value })}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Checkbox checked={filters.priority === option.value} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Assignee Filter */}
        <Popover>
          <PopoverTrigger>
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-slate-600 dark:text-slate-400">
              Assignee
              <ChevronDown className="w-3 h-3 ml-1" />
              {filters.assignee !== 'all' && (
                <Badge className="ml-1 bg-violet-600 text-white h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56">
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              <div
                onClick={() => onFiltersChange({ ...filters, assignee: 'all' })}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Checkbox checked={filters.assignee === 'all'} />
                <span className="text-sm text-slate-700 dark:text-slate-300">All Agents</span>
              </div>
              <div
                onClick={() => onFiltersChange({ ...filters, assignee: 'unassigned' })}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Checkbox checked={filters.assignee === 'unassigned'} />
                <span className="text-sm text-slate-700 dark:text-slate-300">Unassigned</span>
              </div>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => onFiltersChange({ ...filters, assignee: agent.id })}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Checkbox checked={filters.assignee === agent.id} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{agent.name}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-9 text-slate-600 dark:text-slate-400"
          >
            <X className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-9"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Tags & Need Reply Row */}
      <div className="flex items-center gap-4">
        {/* Need Reply Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={filters.needReply === 'true'}
            onCheckedChange={(checked) => {
              onFiltersChange({ 
                ...filters, 
                needReply: checked ? 'true' : 'all' 
              });
            }}
          />
          <label className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
            onClick={() => {
              onFiltersChange({ 
                ...filters, 
                needReply: filters.needReply === 'true' ? 'all' : 'true' 
              });
            }}
          >
            Show 'Need Reply' only
          </label>
        </div>

        {/* Divider */}
        {availableTags.length > 0 && (
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        )}

        {/* Tags */}
        {availableTags.length > 0 && (
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-2">
                Tags:
              </span>
              <div className="flex items-center gap-2">
                {availableTags.map((tag) => {
                  const isSelected = filters.tags?.includes(tag.id);
                  return (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className={`cursor-pointer transition-all hover:shadow-sm ${
                        isSelected 
                          ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700' 
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                      onClick={() => {
                        const currentTags = filters.tags || [];
                        const newTags = isSelected
                          ? currentTags.filter(t => t !== tag.id)
                          : [...currentTags, tag.id];
                        onFiltersChange({ ...filters, tags: newTags });
                      }}
                    >
                      {tag.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

