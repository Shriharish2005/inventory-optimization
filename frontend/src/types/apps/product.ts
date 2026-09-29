export interface Product {
  id: string;
  category: string;
  name: string;
  rating: number; // 1-5
  quality: number; // 1-5
  maxSize: number;
  minSize: number;
  user: string;
  email: string;
  phone: string;
  createdAt: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt">;

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Home Decor",
  "Beauty",
  "Sports",
  "Fashion",
  "Groceries",
  "Stationery",
  "Furniture",
  "Toys",
  "Automotive",
] as const;
