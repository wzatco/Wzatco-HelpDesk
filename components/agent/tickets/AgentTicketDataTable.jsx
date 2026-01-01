import * as React from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Button } from "../../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function AgentTicketDataTable({
  columns,
  data,
  currentPage,
  totalPages,
  onPageChange,
  onRowClick,
  selectedTickets = [],
  onSelectionChange,
  currentView = 'all',
}) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [sorting, setSorting] = React.useState([]);

  // Sync row selection with selectedTickets prop
  React.useEffect(() => {
    if (!onSelectionChange) return;
    
    const selectedIndices = {};
    selectedTickets.forEach(ticketId => {
      const index = data.findIndex(t => t.ticketNumber === ticketId);
      if (index !== -1) {
        selectedIndices[index] = true;
      }
    });
    setRowSelection(selectedIndices);
  }, [selectedTickets, data]);

  // Handle selection changes
  const handleSelectionChange = React.useCallback((updater) => {
    setRowSelection(old => {
      const newSelection = typeof updater === 'function' ? updater(old) : updater;
      
      // Convert selection to ticket IDs
      if (onSelectionChange) {
        const selectedIds = Object.keys(newSelection)
          .filter(key => newSelection[key])
          .map(index => data[parseInt(index)]?.ticketNumber)
          .filter(Boolean);
        onSelectionChange(selectedIds);
      }
      
      return newSelection;
    });
  }, [data, onSelectionChange]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: handleSelectionChange,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  onClick={() => {
                    if (onRowClick) {
                      onRowClick(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm font-medium">
                      {currentView === 'claimable' 
                        ? 'No tickets available to claim' 
                        : 'No tickets found'}
                    </p>
                    <p className="text-xs mt-1">
                      {currentView === 'claimable'
                        ? 'All available tickets have been claimed'
                        : 'Try adjusting your filters'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span>
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {data.length} row(s) selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

