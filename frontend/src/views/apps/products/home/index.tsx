import { useMemo } from "react";
import { Link } from "react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { SectionHeader } from "@/components/inventory/section-header";
import BreadcrumbComp from "@/layouts/full/shared/breadcrumb/BreadcrumbComp";
import { useProducts } from "@/context/products/ProductsContext";
import { Package, Plus, Search, Trash2, ArrowUpRight, BarChart3, Layers } from "lucide-react";

const maxConfig = { maxSize: { label: "Maximum Stock Limit", color: "var(--color-chart-1)" } } satisfies ChartConfig;
const minConfig = { minSize: { label: "Minimum Safety Reorder Point", color: "var(--color-chart-2)" } } satisfies ChartConfig;

export default function ProductsHome() {
  const { products } = useProducts();

  const chartData = useMemo(
    () => products.map((p) => ({ name: p.name, maxSize: p.maxSize, minSize: p.minSize })),
    [products],
  );

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbComp title="Welcome to the Inventory Management System (Report)" items={[{ title: "Products" }]} />

      {/* 4 Premium Executive Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink
          to="/apps/products/list"
          icon={Package}
          label="Products Directory"
          description="View & manage full catalog"
          accentColor="text-blue-500 bg-blue-500/10 border-blue-500/20"
        />
        <QuickLink
          to="/apps/products/add"
          icon={Plus}
          label="Add Product"
          description="Register new item into database"
          accentColor="text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
        />
        <QuickLink
          to="/apps/products/search"
          icon={Search}
          label="Search Product"
          description="Lookup and filter SKU records"
          accentColor="text-purple-500 bg-purple-500/10 border-purple-500/20"
        />
        <QuickLink
          to="/apps/products/remove"
          icon={Trash2}
          label="Remove Product"
          description="Decommission or delete stock item"
          accentColor="text-rose-500 bg-rose-500/10 border-rose-500/20"
        />
      </div>

      {products.length === 0 ? (
        <Card className="bg-card/70 backdrop-blur-md border-border/80 shadow-md">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground py-14 flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <Package className="size-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Catalog Products Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Your inventory database is currently empty. Add your first product to generate stock reports.
            </p>
            <Link
              to="/apps/products/add"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3.5" /> Add First Product
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div>
          <SectionHeader title="Catalogue Report Analytics" aside={`${products.length} active products in catalog`} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card/70 backdrop-blur-md border-border/80 shadow-sm hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground">Maximum Product Stock Limits</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Category Upper Capacity
                  </Badge>
                </div>
                <ChartContainer config={maxConfig} className="h-[320px] w-full">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="maxSize" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-md border-border/80 shadow-sm hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-amber-500" />
                    <h4 className="text-sm font-bold text-foreground">Minimum Reorder Safety Thresholds</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Lower Safety Buffer
                  </Badge>
                </div>
                <ChartContainer config={minConfig} className="h-[320px] w-full">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="minSize" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
  description,
  accentColor = "text-primary bg-primary/10 border-primary/20",
}: {
  to: string;
  icon: typeof Package;
  label: string;
  description: string;
  accentColor?: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-200 hover:-translate-y-0.5 min-h-[110px]"
    >
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-lg border transition-colors ${accentColor}`}>
          <Icon className="size-5" />
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
      <div className="flex flex-col gap-0.5 mt-3">
        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </Link>
  );
}
