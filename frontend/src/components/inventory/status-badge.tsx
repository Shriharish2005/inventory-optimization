import { cn } from "@/lib/utils";
import type { AlertStatus } from "@/types/inventory";
import { Circle } from "lucide-react";

const STATUS_STYLES: Record<AlertStatus, string> = {
  RED: "bg-destructive/10 text-destructive",
  YELLOW: "bg-warning/15 text-warning",
  GREEN: "bg-success/10 text-success",
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  RED: "Order now",
  YELLOW: "Watch",
  GREEN: "Healthy",
};

export function StatusBadge({ status, className }: { status: AlertStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      <Circle className="size-2 fill-current" strokeWidth={0} />
      {STATUS_LABELS[status]}
    </span>
  );
}
