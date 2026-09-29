import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/inventory/data-table";
import { ProductsPageHeader } from "@/components/products/page-header";
import { RatingStars } from "@/components/products/rating-stars";
import { useProducts } from "@/context/products/ProductsContext";
import type { Product } from "@/types/apps/product";
import { Plus } from "lucide-react";

export default function ProductsList() {
  const { products } = useProducts();

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      { accessorKey: "id", header: "ID", cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
      },
      { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => <RatingStars value={row.original.rating} />,
      },
      { accessorKey: "quality", header: "Quality", cell: ({ row }) => row.original.quality },
      { accessorKey: "maxSize", header: "Max Size", cell: ({ row }) => row.original.maxSize },
      { accessorKey: "minSize", header: "Min Size", cell: ({ row }) => row.original.minSize },
      { accessorKey: "user", header: "User" },
      { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span> },
      { accessorKey: "phone", header: "Phone", cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone}</span> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <ProductsPageHeader title="Products" subtitle="Every product currently in the catalogue." />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products.length} product{products.length === 1 ? "" : "s"} on file
        </p>
        <Link to="/apps/products/add" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No products yet — add your first one.
            </p>
          ) : (
            <DataTable columns={columns} data={products} maxHeight="560px" defaultSort={[{ id: "id", desc: false }]} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
