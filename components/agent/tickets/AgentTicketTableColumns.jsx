import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Users,
  HandHeart
} from 'lucide-react';
import { format } from 'date-fns';

// Priority icon component
const PriorityIcon = ({ priority }) => {
  const config = {
    urgent: { icon: ArrowUp, className: 'text-red-600 dark:text-red-400', label: 'Urgent' },
    high: { icon: ArrowUp, className: 'text-orange-600 dark:text-orange-400', label: 'High' },
    medium: { icon: Minus, className: 'text-yellow-600 dark:text-yellow-400', label: 'Medium' },
    low: { icon: ArrowDown, className: 'text-green-600 dark:text-green-400', label: 'Low' }
  };

  const { icon: Icon, className, label } = config[priority] || config.low;

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center justify-center">
          <Icon className={`w-4 h-4 ${className}`} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

// Status badge with dot (matching admin panel)
const StatusBadge = ({ status }) => {
  const config = {
    open: { dot: 'bg-blue-500', text: 'text-slate-700 dark:text-slate-300', label: 'Open' },
    pending: { dot: 'bg-orange-500', text: 'text-slate-700 dark:text-slate-300', label: 'Pending' },
    resolved: { dot: 'bg-green-500', text: 'text-slate-700 dark:text-slate-300', label: 'Resolved' },
    closed: { dot: 'bg-slate-500', text: 'text-slate-700 dark:text-slate-300', label: 'Closed' }
  };

  const { dot, text, label } = config[status] || config.open;

  return (
    <div className={`flex items-center gap-2 ${text}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`}></span>
      <span className="text-sm">{label}</span>
    </div>
  );
};

export const agentTicketColumns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "ticketNumber",
    header: "Ticket ID",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-violet-600 dark:text-violet-400">
          #{row.original.ticketNumber}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => {
      const status = row.original.status;
      const isActive = status !== 'resolved' && status !== 'closed';
      const needsReply = isActive && row.original.lastMessage?.senderType === 'customer';
      const belongsToOtherAgent = row.original.belongsToOtherAgent;
      return (
        <div className="flex flex-col max-w-md">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
              {row.original.subject}
            </span>
            {needsReply && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400">
                Reply
              </Badge>
            )}
            {belongsToOtherAgent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
                View Only
              </Badge>
            )}
          </div>
          {row.original.customerName && (
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {row.original.customerName}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return <StatusBadge status={status} />;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "priority",
    header: () => <div className="text-center">Priority</div>,
    cell: ({ row }) => {
      const priority = row.original.priority || 'low';
      return <PriorityIcon priority={priority} />;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
    cell: ({ row }) => {
      const assignee = row.original.assignee;
      const isUnassigned = row.original.isUnassigned;
      const isClaimable = row.original.isClaimable;
      const previousOwner = row.original.previousOwner;
      
      // Show claimable badge with previous owner info
      if (isClaimable && !assignee) {
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 w-fit">
              <HandHeart className="w-3 h-3 mr-1" />
              Available to Claim
            </Badge>
            {previousOwner && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Previous: {previousOwner.name || 'Unknown'}
              </span>
            )}
          </div>
        );
      }
      
      if (isUnassigned) {
        return (
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400">
            <Users className="w-3 h-3 mr-1" />
            Unassigned
          </Badge>
        );
      }
      
      if (!assignee) return <span className="text-xs text-slate-400">—</span>;
      
      const initials = assignee.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      const belongsToOtherAgent = row.original.belongsToOtherAgent;
      
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
              {assignee.name}
            </span>
          </div>
          {belongsToOtherAgent && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 w-fit">
              Assigned to {assignee.name}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => {
      const department = row.original.department;
      if (!department) return <span className="text-xs text-slate-400">—</span>;
      return (
        <Badge variant="outline" className="text-xs">
          {department.name}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <div className="flex flex-col text-xs">
          <span className="text-slate-700 dark:text-slate-300">
            {format(date, 'MMM dd, h:mm a')}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {row.original.timeAgo}
          </span>
        </div>
      );
    },
  },
];

