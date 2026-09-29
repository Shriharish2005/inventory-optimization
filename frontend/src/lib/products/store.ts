import type { Product, ProductInput } from "@/types/apps/product";

const STORAGE_KEY = "product-catalog:products";

// Starting catalogue so the module isn't empty on first load. Anything
// added or removed after this persists to localStorage in the browser.
export const SEED_PRODUCTS: Product[] = [
  {
    id: "PD7654",
    category: "Electronics",
    name: "Smartphone",
    rating: 4,
    quality: 4,
    maxSize: 300,
    minSize: 250,
    user: "Alicia",
    email: "alicia@gmail.com",
    phone: "9876543210",
    createdAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "PD2345",
    category: "Home Decor",
    name: "Throw Pillow",
    rating: 3,
    quality: 3,
    maxSize: 200,
    minSize: 180,
    user: "Michael",
    email: "michael@example.com",
    phone: "5551234567",
    createdAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "PD8765",
    category: "Beauty",
    name: "Lipstick",
    rating: 4,
    quality: 5,
    maxSize: 100,
    minSize: 90,
    user: "Sophia",
    email: "sophia@yahoo.com",
    phone: "9998765432",
    createdAt: "2026-01-06T00:00:00.000Z",
  },
  {
    id: "PD5678",
    category: "Sports",
    name: "Running Shoes",
    rating: 5,
    quality: 5,
    maxSize: 150,
    minSize: 130,
    user: "Daniel",
    email: "daniel@gmail.com",
    phone: "3339876543",
    createdAt: "2026-01-07T00:00:00.000Z",
  },
];

export function loadProducts(): Product[] {
  if (typeof window === "undefined") return SEED_PRODUCTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PRODUCTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_PRODUCTS;
  } catch {
    return SEED_PRODUCTS;
  }
}

export function saveProducts(products: Product[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // Storage full or unavailable (private browsing) -- fail silently,
    // the in-memory state still works for the rest of the session.
  }
}

export function generateProductId(existing: Product[]): string {
  const existingIds = new Set(existing.map((p) => p.id));
  let id: string;
  do {
    id = `PD${Math.floor(1000 + Math.random() * 9000)}`;
  } while (existingIds.has(id));
  return id;
}

export function buildProduct(input: ProductInput, existing: Product[]): Product {
  return { ...input, id: generateProductId(existing), createdAt: new Date().toISOString() };
}
