import { cn } from "@/lib/utils";

export interface LedgerItem {
  figure: string;
  label: string;
  tone?: "pos" | "neg" | "neutral";
}

const TONE_CLASSES: Record<NonNullable<LedgerItem["tone"]>, string> = {
  pos: "text-success",
  neg: "text-destructive",
  neutral: "text-foreground",
};

/**
 * The hero "decision ledger": one plain-language call, then figures
 * arranged under a rule -- designed specifically because a row of
 * identical metric cards doesn't communicate a decision the way one
 * sentence plus aligned figures does.
 */
export function KpiLedger({ items }: { items: LedgerItem[] }) {
  return (
    <div className="flex flex-wrap border-t-2 border-foreground pt-4">
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 min-w-[140px] pr-6 mr-6 border-r border-border last:border-r-0 last:mr-0 last:pr-0",
          )}
        >
          <div
            className={cn(
              "text-2xl font-semibold tracking-tight tabular-nums",
              TONE_CLASSES[item.tone ?? "neutral"],
            )}
          >
            {item.figure}
          </div>
          <div className="mt-1 text-sm text-muted-foreground leading-snug max-w-[20ch]">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
