import { useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function DataTable<TData>({
  columns,
  data,
  maxHeight = "440px",
  defaultSort,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  maxHeight?: string;
  defaultSort?: SortingState;
}) {
  const [sorting, setSorting] = useState<SortingState>(defaultSort ?? []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-md overflow-auto shadow-sm" style={{ maxHeight }}>
        <Table>
          <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 border-b border-border/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3",
                        header.column.getCanSort() && "cursor-pointer select-none hover:text-foreground transition-colors",
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          (sortDir === "asc" ? (
                            <ArrowUp className="size-3 text-primary" />
                          ) : sortDir === "desc" ? (
                            <ArrowDown className="size-3 text-primary" />
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground/40" />
                          ))}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40 transition-colors border-b border-border/40">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-sm tabular-nums whitespace-nowrap py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground text-sm">
                  No records match the current filter selection.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>Showing {table.getRowModel().rows.length.toLocaleString()} items</span>
        <span className="text-[11px] italic">Click column headers to sort</span>
      </div>
    </div>
  );
}
