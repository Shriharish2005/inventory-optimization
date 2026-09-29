import BreadcrumbComp from "@/layouts/full/shared/breadcrumb/BreadcrumbComp";

export function InventoryPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <BreadcrumbComp title={title} items={[{ to: "/", title: "Inventory" }, { title }]} />
      {subtitle && <p className="text-sm text-muted-foreground px-1">{subtitle}</p>}
    </div>
  );
}
