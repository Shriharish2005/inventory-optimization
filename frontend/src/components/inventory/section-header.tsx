export function SectionHeader({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2 mt-8 mb-4 first:mt-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {aside && <span className="text-sm text-muted-foreground">{aside}</span>}
    </div>
  );
}
