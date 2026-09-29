import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/inventory/data-table";
import { ProductsPageHeader } from "@/components/products/page-header";
import { RatingStars } from "@/components/products/rating-stars";
import { useProducts } from "@/context/products/ProductsContext";
import type { Product } from "@/types/apps/product";
import { Search } from "lucide-react";

export default function ProductsSearch() {
  const { searchProducts } = useProducts();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = useMemo(() => (submitted ? searchProducts(submitted) : []), [submitted, searchProducts]);

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      { accessorKey: "id", header: "ID", cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
      { accessorKey: "category", header: "Category", cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge> },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "rating", header: "Rating", cell: ({ row }) => <RatingStars value={row.original.rating} /> },
      { accessorKey: "quality", header: "Quality" },
      { accessorKey: "maxSize", header: "Max Size" },
      { accessorKey: "minSize", header: "Min Size" },
      { accessorKey: "user", header: "User" },
      { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span> },
      { accessorKey: "phone", header: "Phone", cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone}</span> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <ProductsPageHeader title="Search Product" subtitle="Look up a product by ID, name, category, or the user who added it." />

      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(query);
            }}
            className="flex gap-3"
          >
            <Input
              placeholder="Search by ID, name, category, or user…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-full"
            />
            <Button type="submit">
              <Search className="h-4 w-4" /> Search Product
            </Button>
          </form>
        </CardContent>
      </Card>

      {submitted && (
        <Card>
          <CardContent className="pt-6">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No products match &ldquo;{submitted}&rdquo;.
              </p>
            ) : (
              <DataTable columns={columns} data={results} maxHeight="480px" />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
