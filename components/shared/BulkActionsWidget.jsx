import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckSquare,
  X,
  ChevronUp,
  ChevronDown,
  Edit,
  User,
  AlertTriangle,
  Tag,
  FileText,
  Download,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';

/**
 * BulkActionsWidget - Floating widget for bulk ticket actions
 * Appears when tickets are selected, with minimize/expand functionality
 * 
 * @param {Object} props
 * @param {string[]} props.selectedTicketIds - Array of selected ticket IDs
 * @param {Function} props.onClearSelection - Clear selection handler
 * @param {Function} props.onBulkAction - Bulk action handler (action, data) => Promise
 * @param {string} props.userRole - 'admin' or 'agent' - controls available actions
 * @param {Function} props.onRefresh - Refresh callback after actions
 * @param {Function} props.onTransferModal - Open transfer modal handler (for admin)
 * @param {Function} props.onPriorityModal - Open priority change modal handler
 */
export default function BulkActionsWidget({
  selectedTicketIds = [],
  onClearSelection,
  onBulkAction,
  userRole = 'agent', // 'admin' or 'agent'
  onRefresh,
  onTransferModal,
  onPriorityModal,
  availableTags = [],
  availableAgents = [],
  availableAdmins = []
}) {
  const [mounted, setMounted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assigneeType, setAssigneeType] = useState('agent'); // 'agent' or 'admin'
  const [selectedTags, setSelectedTags] = useState([]);
  const [noteContent, setNoteContent] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset dialogs when selection changes
  useEffect(() => {
    if (selectedTicketIds.length === 0) {
      setShowStatusDialog(false);
      setShowPriorityDialog(false);
      setShowAssignDialog(false);
      setShowTagsDialog(false);
      setShowNotesDialog(false);
    }
  }, [selectedTicketIds]);

  if (!mounted || selectedTicketIds.length === 0) return null;

  const selectedCount = selectedTicketIds.length;

  // Available actions based on role
  const adminActions = [
    { id: 'status', label: 'Change Status', icon: CheckSquare },
    { id: 'priority', label: 'Change Priority', icon: AlertTriangle },
    { id: 'assign', label: 'Assign/Reassign', icon: User },
    { id: 'tags', label: 'Add/Remove Tags', icon: Tag },
    { id: 'notes', label: 'Add Internal Note', icon: FileText },
    { id: 'export', label: 'Export Tickets', icon: Download },
  ];

  const agentActions = [
    { id: 'status', label: 'Change Status', icon: CheckSquare },
    { id: 'priority', label: 'Change Priority', icon: AlertTriangle },
    { id: 'assign', label: 'Assign to Agent', icon: User },
    { id: 'tags', label: 'Add/Remove Tags', icon: Tag },
    { id: 'notes', label: 'Add Internal Note', icon: FileText },
    { id: 'export', label: 'Export Tickets', icon: Download },
  ];

  const availableActions = userRole === 'admin' ? adminActions : agentActions;

  const handleAction = async (actionId) => {
    switch (actionId) {
      case 'status':
        setShowStatusDialog(true);
        break;
      case 'priority':
        if (onPriorityModal) {
          onPriorityModal(selectedTicketIds);
        } else {
          setShowPriorityDialog(true);
        }
        break;
      case 'assign':
        if (onTransferModal && userRole === 'admin') {
          onTransferModal(selectedTicketIds);
        } else {
          setShowAssignDialog(true);
        }
        break;
      case 'tags':
        setShowTagsDialog(true);
        break;
      case 'notes':
        setShowNotesDialog(true);
        break;
      case 'export':
        await handleBulkExport();
        break;
    }
  };

  const handleBulkStatusChange = async () => {
    if (!selectedStatus) return;
    
    setLoading(true);
    try {
      await onBulkAction('status', {
        status: selectedStatus,
        reason: reason.trim() || undefined
      });
      setShowStatusDialog(false);
      setSelectedStatus('');
      setReason('');
      onRefresh?.();
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Failed to change status');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPriorityChange = async () => {
    if (!selectedPriority) return;
    
    setLoading(true);
    try {
      await onBulkAction('priority', {
        priority: selectedPriority,
        reason: reason.trim() || undefined
      });
      setShowPriorityDialog(false);
      setSelectedPriority('');
      setReason('');
      onRefresh?.();
    } catch (error) {
      console.error('Error changing priority:', error);
      alert('Failed to change priority');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedAssignee || !reason.trim()) {
      alert('Please select an assignee and provide a reason');
      return;
    }
    
    setLoading(true);
    try {
      await onBulkAction('assign', {
        assigneeId: selectedAssignee,
        assigneeType: assigneeType,
        reason: reason.trim()
      });
      setShowAssignDialog(false);
      setSelectedAssignee('');
      setReason('');
      onRefresh?.();
    } catch (error) {
      console.error('Error assigning tickets:', error);
      alert('Failed to assign tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTags = async () => {
    setLoading(true);
    try {
      await onBulkAction('tags', {
        tagIds: selectedTags,
        action: 'add' // or 'remove' based on UI
      });
      setShowTagsDialog(false);
      setSelectedTags([]);
      onRefresh?.();
    } catch (error) {
      console.error('Error updating tags:', error);
      alert('Failed to update tags');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkNotes = async () => {
    if (!noteContent.trim()) {
      alert('Please enter a note');
      return;
    }
    
    setLoading(true);
    try {
      await onBulkAction('notes', {
        content: noteContent.trim()
      });
      setShowNotesDialog(false);
      setNoteContent('');
      onRefresh?.();
    } catch (error) {
      console.error('Error adding notes:', error);
      alert('Failed to add notes');
    } finally {
      setLoading(false);
    }
  };

  // Direct bulk export - no modal, just export selected tickets
  const handleBulkExport = async () => {
    if (selectedTicketIds.length === 0) return;
    
    setExporting(true);
    try {
      // Build query parameters - only ticketIds, no filters
      const params = new URLSearchParams();
      params.append('ticketIds', selectedTicketIds.join(','));
      params.append('export', 'csv');
      
      // Determine API endpoint based on user role
      const apiEndpoint = userRole === 'admin' 
        ? `/api/admin/tickets?${params.toString()}`
        : `/api/agent/tickets?${params.toString()}`;
      
      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-bulk-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting tickets:', error);
      alert('Failed to export tickets');
    } finally {
      setExporting(false);
    }
  };

  const widgetContent = (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isMinimized ? 'w-80' : 'w-96'
      }`}
      style={{ maxHeight: isMinimized ? 'auto' : '80vh' }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-violet-600 dark:bg-violet-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            <span className="font-semibold">{selectedCount} Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0 text-white hover:bg-violet-700 dark:hover:bg-violet-600"
            >
              {isMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 w-8 p-0 text-white hover:bg-violet-700 dark:hover:bg-violet-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-4 overflow-y-auto flex-1" style={{ maxHeight: 'calc(80vh - 120px)' }}>
            <div className="space-y-2">
              {availableActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="w-full justify-start gap-2 h-auto py-3"
                    onClick={() => handleAction(action.id)}
                    disabled={loading || exporting}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{action.label}</span>
                    {action.id === 'export' && exporting && (
                      <Loader2 className="w-4 h-4 ml-auto animate-spin" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Select a new status for all selected tickets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why are you changing the status?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={!selectedStatus || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Change Dialog */}
      <Dialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Priority for {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Select a new priority for all selected tickets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="priority">New Priority</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-reason">Reason (Optional)</Label>
              <Textarea
                id="priority-reason"
                placeholder="Why are you changing the priority?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriorityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPriorityChange} disabled={!selectedPriority || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Select an assignee for all selected tickets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {userRole === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="assignee-type">Assign To</Label>
                <Select value={assigneeType} onValueChange={setAssigneeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="assignee">
                {assigneeType === 'admin' ? 'Admin' : 'Agent'}
              </Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${assigneeType}`} />
                </SelectTrigger>
                <SelectContent>
                  {(assigneeType === 'admin' ? availableAdmins : availableAgents).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="assign-reason"
                placeholder="Why are you assigning these tickets? (Required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!selectedAssignee || !reason.trim() || loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags Dialog */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags for {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Add or remove tags from selected tickets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Tags</Label>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                {availableTags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag.id]);
                        } else {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkTags} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Note to {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Add an internal note that will be visible to agents and admins
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note Content</Label>
              <Textarea
                id="note"
                placeholder="Enter your internal note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkNotes} disabled={!noteContent.trim() || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );

  return createPortal(widgetContent, document.body);
}

