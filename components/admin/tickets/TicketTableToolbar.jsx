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
  Package,
  Tag as TagIcon,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Checkbox } from '../../ui/checkbox';

export function TicketTableToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onResetFilters,
  availableTags = [],
  products = [],
  agents = [],
  departments = []
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

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

  const selectedCount = (key) => {
    if (key === 'tags') return filters.tags?.length || 0;
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
            placeholder="Search tickets..."
            value={searchQuery}
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
                    onFiltersChange({ ...filters, status: option.value });
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
                    onFiltersChange({ ...filters, priority: option.value });
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

        {/* Assignee Filter */}
        <Popover>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="gap-2">
              <User className="w-4 h-4" />
              Assignee
              {selectedCount('assignee') > 0 && (
                <Badge className="ml-1 bg-violet-600 text-white border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {selectedCount('assignee')}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <p className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Filter by Assignee</p>
              <div
                onClick={() => {
                  onFiltersChange({ ...filters, assignee: 'all' });
                }}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Checkbox checked={filters.assignee === 'all'} />
                <span className="text-sm text-slate-700 dark:text-slate-300">All Agents</span>
              </div>
              <div
                onClick={() => {
                  onFiltersChange({ ...filters, assignee: 'unassigned' });
                }}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Checkbox checked={filters.assignee === 'unassigned'} />
                <span className="text-sm text-slate-700 dark:text-slate-300">Unassigned</span>
              </div>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => {
                    onFiltersChange({ ...filters, assignee: agent.id });
                  }}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Checkbox checked={filters.assignee === agent.id} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{agent.name}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Product Filter */}
        <Popover>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="gap-2">
              <Package className="w-4 h-4" />
              Product
              {selectedCount('productModel') > 0 && (
                <Badge className="ml-1 bg-violet-600 text-white border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {selectedCount('productModel')}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <p className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Filter by Product</p>
              <div
                onClick={() => {
                  onFiltersChange({ ...filters, productModel: 'all' });
                }}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Checkbox checked={filters.productModel === 'all'} />
                <span className="text-sm text-slate-700 dark:text-slate-300">All Products</span>
              </div>
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onFiltersChange({ ...filters, productModel: product.modelNumber });
                  }}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Checkbox checked={filters.productModel === product.modelNumber} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{product.name}</span>
                </div>
              ))}
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

      {/* Row 2: Tags & Quick Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Need Reply Toggle */}
        <Button
          variant={filters.needReply === 'true' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            onFiltersChange({ 
              ...filters, 
              needReply: filters.needReply === 'true' ? 'all' : 'true' 
            });
          }}
          className="gap-2"
        >
          {filters.needReply === 'true' ? (
            <ToggleRight className="w-4 h-4" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          Need Reply
        </Button>

        {/* Tags */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <div className="flex items-center gap-1 flex-wrap">
              {availableTags.map((tag) => {
                const isSelected = filters.tags?.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
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
        )}
      </div>
    </div>
  );
}

