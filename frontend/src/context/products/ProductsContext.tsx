import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product, ProductInput } from "@/types/apps/product";
import { buildProduct, loadProducts, saveProducts } from "@/lib/products/store";

interface ProductsContextValue {
  products: Product[];
  addProduct: (input: ProductInput) => Product;
  removeProduct: (id: string) => boolean;
  getProduct: (id: string) => Product | undefined;
  searchProducts: (query: string) => Product[];
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => loadProducts());

  useEffect(() => {
    saveProducts(products);
  }, [products]);

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      addProduct: (input) => {
        const product = buildProduct(input, products);
        setProducts((prev) => [...prev, product]);
        return product;
      },
      removeProduct: (id) => {
        const normalized = id.trim().toUpperCase();
        const exists = products.some((p) => p.id.toUpperCase() === normalized);
        if (exists) setProducts((prev) => prev.filter((p) => p.id.toUpperCase() !== normalized));
        return exists;
      },
      getProduct: (id) => products.find((p) => p.id.toUpperCase() === id.trim().toUpperCase()),
      searchProducts: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return products.filter(
          (p) =>
            p.id.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.user.toLowerCase().includes(q),
        );
      },
    }),
    [products],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within a ProductsProvider");
  return ctx;
}
