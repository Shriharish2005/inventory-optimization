import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Download, Search, FileText } from "lucide-react";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { StatusBadge } from "@/components/inventory/status-badge";
import { DataTable } from "@/components/inventory/data-table";
import { PoDrawer } from "@/components/inventory/po-drawer";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import { filterAlerts } from "@/lib/inventory/data";
import type { AlertRow, AlertStatus } from "@/types/inventory";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "Everything" },
  { value: "RED", label: "Order now" },
  { value: "YELLOW", label: "Watch" },
  { value: "GREEN", label: "Healthy" },
];

function downloadCsv(rows: AlertRow[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]) as (keyof AlertRow)[];
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => r[h]).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "order_list.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const columns: ColumnDef<AlertRow, unknown>[] = [
  { accessorKey: "sku_id", header: "SKU" },
  { accessorKey: "abc_class", header: "Class" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue() as AlertStatus} />,
  },
  {
    accessorKey: "stock_on_hand",
    header: "On hand",
    cell: ({ getValue }) => (getValue() as number).toLocaleString(),
  },
  {
    accessorKey: "reorder_point",
    header: "Reorder at",
    cell: ({ getValue }) => (getValue() as number).toLocaleString(),
  },
  {
    accessorKey: "days_of_cover",
    header: "Days cover",
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v == null ? "\u2014" : v.toFixed(1);
    },
  },
  {
    accessorKey: "suggested_order_qty",
    header: "Order qty",
    cell: ({ getValue }) => {
      const v = getValue() as number;
      return v > 0 ? (
        <span className="font-semibold text-primary">{v.toLocaleString()}</span>
      ) : (
        "\u2014"
      );
    },
  },
  { accessorKey: "lead_time_days", header: "Lead time", cell: ({ getValue }) => `${getValue()} d` },
];

export default function InventoryOrderNow() {
  const { filters } = useInventoryFilters();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isPoOpen, setIsPoOpen] = useState(false);

  const alerts = filterAlerts(filters);
  const counts = useMemo(() => {
    const c: Record<AlertStatus, number> = { RED: 0, YELLOW: 0, GREEN: 0 };
    alerts.forEach((a) => c[a.status]++);
    return c;
  }, [alerts]);

  const visible = useMemo(() => {
    let rows = alerts;
    if (statusFilter !== "ALL") rows = rows.filter((r) => r.status === statusFilter);
    if (search) rows = rows.filter((r) => r.sku_id.toLowerCase().includes(search.toLowerCase()));
    return rows;
  }, [alerts, statusFilter, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <InventoryPageHeader
          title="Reorder Command Center"
          subtitle="Real-time operational action list sorted by urgency and stockout exposure."
        />
        <Button
          size="sm"
          className="gap-2 self-start md:self-auto bg-primary hover:bg-primary/90 shadow-md"
          onClick={() => setIsPoOpen(true)}
        >
          <FileText className="size-4" /> Generate Purchase Order ({counts.RED} SKUs)
        </Button>
      </div>

      <InventoryFilterBar />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCount
          tone="red"
          count={counts.RED}
          label="Order now"
          desc="at or below reorder point"
          active={statusFilter === "RED"}
          onClick={() => setStatusFilter(statusFilter === "RED" ? "ALL" : "RED")}
        />
        <StatusCount
          tone="yellow"
          count={counts.YELLOW}
          label="Watch"
          desc="approaching reorder point"
          active={statusFilter === "YELLOW"}
          onClick={() => setStatusFilter(statusFilter === "YELLOW" ? "ALL" : "YELLOW")}
        />
        <StatusCount
          tone="green"
          count={counts.GREEN}
          label="Healthy"
          desc="comfortable cover"
          active={statusFilter === "GREEN"}
          onClick={() => setStatusFilter(statusFilter === "GREEN" ? "ALL" : "GREEN")}
        />
      </div>

      <Card className="bg-card/70 backdrop-blur-md border-border/80">
        <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed">
          A high "order now" count is expected here rather than alarming. Stock history is reconstructed
          from a naive policy that holds no safety stock, so most items sit below the new
          service-level-aware reorder points. That gap <em>is</em> the finding: the current approach
          systematically under-buffers.
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          value={[statusFilter]}
          onValueChange={(v) => v.length && setStatusFilter(v[v.length - 1])}
          size="sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <ToggleGroupItem key={opt.value} value={opt.value} className="text-xs px-3">
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm w-52"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadCsv(visible)}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={visible} defaultSort={[{ id: "status", desc: false }]} />

      <PoDrawer alerts={alerts} isOpen={isPoOpen} onClose={() => setIsPoOpen(false)} />
    </div>
  );
}

function StatusCount({
  tone,
  count,
  label,
  desc,
  active,
  onClick,
}: {
  tone: "red" | "yellow" | "green";
  count: number;
  label: string;
  desc: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const borderClass = { red: "border-l-destructive", yellow: "border-l-warning", green: "border-l-success" }[tone];
  return (
    <div
      onClick={onClick}
      className={`flex items-baseline gap-3 rounded-lg border-l-4 bg-card/60 backdrop-blur-md px-4 py-3.5 cursor-pointer transition-all hover:bg-muted/40 shadow-sm ${borderClass} ${
        active ? "ring-2 ring-primary bg-muted/60" : ""
      }`}
    >
      <span className="text-2xl font-bold tabular-nums text-foreground">{count}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </div>
    </div>
  );
}
