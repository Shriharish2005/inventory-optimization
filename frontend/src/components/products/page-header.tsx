import BreadcrumbComp from "@/layouts/full/shared/breadcrumb/BreadcrumbComp";

export function ProductsPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <BreadcrumbComp title={title} items={[{ to: "/apps/products", title: "Products" }, { title }]} />
      {subtitle && <p className="text-sm text-muted-foreground px-1">{subtitle}</p>}
    </div>
  );
}
