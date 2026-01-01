import { useState } from 'react';
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
  CheckSquare,
  X,
  Edit,
  AlertTriangle,
  User,
  Ban,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

export function BulkActionsToolbar({ 
  selectedCount, 
  onClearSelection,
  onBulkAction 
}) {
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [reason, setReason] = useState('');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch agents when assign dialog opens
  const handleOpenAssignDialog = async () => {
    setShowAssignDialog(true);
    setLoading(true);
    try {
      const response = await fetch('/api/agent/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!selectedStatus) return;
    
    await onBulkAction('status', { status: selectedStatus, reason: reason.trim() || undefined });
    setShowStatusDialog(false);
    setSelectedStatus('');
    setReason('');
  };

  const handleBulkPriorityChange = async () => {
    if (!selectedPriority) return;
    
    await onBulkAction('priority', { priority: selectedPriority, reason: reason.trim() || undefined });
    setShowPriorityDialog(false);
    setSelectedPriority('');
    setReason('');
  };

  const handleBulkAssign = async () => {
    if (!selectedAgent || !reason.trim()) {
      alert('Please select an agent and provide a reason');
      return;
    }
    
    await onBulkAction('assign', { agentId: selectedAgent, reason: reason.trim() });
    setShowAssignDialog(false);
    setSelectedAgent('');
    setReason('');
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-violet-600 text-white">
            {selectedCount} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="w-4 h-4" />
                Bulk Actions
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowStatusDialog(true)}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Change Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPriorityDialog(true)}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Change Priority
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenAssignDialog}>
                <User className="w-4 h-4 mr-2" />
                Assign to Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
                  <SelectItem value="open">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      Open
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-green-600" />
                      Resolved
                    </div>
                  </SelectItem>
                  <SelectItem value="closed">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-slate-600" />
                      Closed
                    </div>
                  </SelectItem>
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
            <Button onClick={handleBulkStatusChange} disabled={!selectedStatus}>
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
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Urgent
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-green-600" />
                      Low
                    </div>
                  </SelectItem>
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
            <Button onClick={handleBulkPriorityChange} disabled={!selectedPriority}>
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
              Select an agent to assign all selected tickets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent">Assign To</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading agents..." : "Select agent"} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {agent.name}
                      </div>
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
              disabled={!selectedAgent || !reason.trim()}
            >
              Assign {selectedCount} Ticket{selectedCount > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
