import { SegmentationSummaryRow } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";

interface Matrix9BoxProps {
  summary: SegmentationSummaryRow[];
  onSelectSegment?: (segment: string) => void;
  selectedSegment?: string | null;
}

export function Matrix9Box({ summary, onSelectSegment, selectedSegment }: Matrix9BoxProps) {
  const totalRevenue = summary.reduce((s, r) => s + r.revenue, 0);

  const getSegmentData = (seg: string) => {
    return summary.find((s) => s.segment.toUpperCase() === seg.toUpperCase()) || {
      segment: seg,
      n_skus: 0,
      revenue: 0,
      recommended_approach: "Standard policy",
    };
  };

  const rows = ["A", "B", "C"];
  const cols = ["X", "Y", "Z"];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {rows.map((r) =>
          cols.map((c) => {
            const segKey = `${r}${c}`;
            const data = getSegmentData(segKey);
            const isSelected = selectedSegment === segKey;
            const revShare = totalRevenue ? ((data.revenue / totalRevenue) * 100).toFixed(1) : "0";

            return (
              <div
                key={segKey}
                onClick={() => onSelectSegment?.(segKey)}
                className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                  isSelected
                    ? "ring-2 ring-primary border-primary bg-primary/10"
                    : r === "A" && c === "X"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : r === "C" && c === "Z"
                    ? "bg-rose-500/10 border-rose-500/30"
                    : "bg-card/70 backdrop-blur-md border-border/70 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="font-bold text-xs bg-background/80">
                    Segment {segKey}
                  </Badge>
                  <span className="text-[11px] font-medium text-muted-foreground">{revShare}% Rev</span>
                </div>

                <div className="my-1">
                  <span className="text-lg font-bold text-foreground">{data.n_skus} SKUs</span>
                  <p className="text-xs font-semibold text-primary">
                    ${Math.round(data.revenue).toLocaleString()}
                  </p>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-tight">
                  {data.recommended_approach}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
