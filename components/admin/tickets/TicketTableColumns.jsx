import Link from 'next/link';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// Priority icon component with tooltip
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

// Minimal status badge with dot
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

export const createColumns = ({ onSelect, selectedIds, onAssign }) => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={selectedIds.length === table.length && table.length > 0}
        onCheckedChange={(checked) => {
          if (checked) {
            onSelect(table.map(row => row.ticketNumber));
          } else {
            onSelect([]);
          }
        }}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={selectedIds.includes(row.ticketNumber)}
        onCheckedChange={(checked) => {
          if (checked) {
            onSelect([...selectedIds, row.ticketNumber]);
          } else {
            onSelect(selectedIds.filter(id => id !== row.ticketNumber));
          }
        }}
      />
    ),
  },
  {
    id: "ticketNumber",
    header: "TICKET ID",
    cell: ({ row }) => (
      <Link href={`/admin/tickets/${row.ticketNumber}`}>
        <code className="text-xs font-mono font-semibold text-violet-600 dark:text-violet-400 hover:underline">
          #{row.ticketNumber}
        </code>
      </Link>
    ),
  },
  {
    id: "subject",
    header: "SUBJECT",
    cell: ({ row }) => (
      <div className="max-w-[350px]">
        <Link href={`/admin/tickets/${row.ticketNumber}`}>
          <p className="font-medium text-slate-900 dark:text-white truncate hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            {row.subject || 'No subject'}
          </p>
        </Link>
        {row.customerName && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {row.customerName}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "status",
    header: "STATUS",
    cell: ({ row }) => <StatusBadge status={row.status} />,
  },
  {
    id: "priority",
    header: "PRIORITY",
    cell: ({ row }) => <PriorityIcon priority={row.priority} />,
  },
  {
    id: "assignee",
    header: "ASSIGNEE",
    cell: ({ row }) => (
      <button
        onClick={() => onAssign?.(row)}
        className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-2 py-1.5 transition-colors cursor-pointer w-full text-left"
      >
        {row.assignee ? (
          <>
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                {row.assignee.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {row.assignee.name}
            </span>
          </>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">Unassigned</span>
        )}
      </button>
    ),
  },
  {
    id: "department",
    header: "DEPARTMENT",
    cell: ({ row }) => (
      <span className="text-xs text-slate-600 dark:text-slate-400">
        {row.department?.name || 'General'}
      </span>
    ),
  },
  {
    id: "created",
    header: "CREATED",
    cell: ({ row }) => {
      const date = new Date(row.createdAt);
      return (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
          {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      );
    },
  },
];
