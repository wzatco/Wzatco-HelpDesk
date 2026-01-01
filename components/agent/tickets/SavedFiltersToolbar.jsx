import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { 
  Bookmark, 
  Save, 
  Trash2,
  ChevronDown,
  Star
} from 'lucide-react';
import { agentFetch } from '../../../lib/utils/agent-fetch';

export function SavedFiltersToolbar({ currentFilters, onApplyFilter }) {
  const [savedFilters, setSavedFilters] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [saving, setSaving] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = async () => {
    try {
      const response = await agentFetch('/api/agent/saved-filters');
      if (response.ok) {
        const data = await response.json();
        setSavedFilters(data.filters || []);
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      alert('Please enter a name for this filter');
      return;
    }

    setSaving(true);
    try {
      const response = await agentFetch('/api/agent/saved-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: filterName.trim(),
          filters: currentFilters
        })
      });

      if (response.ok) {
        await loadSavedFilters();
        setShowSaveDialog(false);
        setFilterName('');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save filter');
      }
    } catch (error) {
      console.error('Error saving filter:', error);
      alert('Failed to save filter');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFilter = async (filterId) => {
    if (!confirm('Are you sure you want to delete this saved filter?')) {
      return;
    }

    try {
      const response = await agentFetch(`/api/agent/saved-filters/${filterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadSavedFilters();
      } else {
        alert('Failed to delete filter');
      }
    } catch (error) {
      console.error('Error deleting filter:', error);
      alert('Failed to delete filter');
    }
  };

  const hasActiveFilters = () => {
    return currentFilters.status !== 'all' || 
           currentFilters.priority !== 'all' || 
           currentFilters.view !== 'all' ||
           currentFilters.needReply;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Save Current Filter Button */}
        {hasActiveFilters() && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Filter
          </Button>
        )}

        {/* Saved Filters Dropdown */}
        {savedFilters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="w-4 h-4" />
                Saved Filters
                <Badge variant="secondary" className="ml-1">
                  {savedFilters.length}
                </Badge>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                My Saved Filters
              </div>
              <DropdownMenuSeparator />
              {savedFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded group"
                >
                  <button
                    onClick={() => onApplyFilter(filter.filters)}
                    className="flex-1 text-left text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <Star className="w-4 h-4 text-violet-600" />
                    {filter.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFilter(filter.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Save Filter Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Filter</DialogTitle>
            <DialogDescription>
              Give this filter combination a name to quickly access it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                placeholder="e.g., High Priority Open Tickets"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveFilter();
                  }
                }}
              />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-medium">Current Filters:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {currentFilters.status !== 'all' && (
                  <li>Status: <span className="capitalize">{currentFilters.status}</span></li>
                )}
                {currentFilters.priority !== 'all' && (
                  <li>Priority: <span className="capitalize">{currentFilters.priority}</span></li>
                )}
                {currentFilters.view !== 'all' && (
                  <li>View: <span className="capitalize">{currentFilters.view}</span></li>
                )}
                {currentFilters.needReply && (
                  <li>Need Reply: Yes</li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFilter} disabled={!filterName.trim() || saving}>
              {saving ? 'Saving...' : 'Save Filter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
