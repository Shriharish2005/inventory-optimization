import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductsPageHeader } from "@/components/products/page-header";
import { useProducts } from "@/context/products/ProductsContext";
import { PRODUCT_CATEGORIES } from "@/types/apps/product";
import {
  Package,
  Plus,
  Star,
  Award,
  Layers,
  User,
  Mail,
  Phone,
  Tag,
  ShieldAlert,
  Wand2,
  X,
  CheckCircle2,
} from "lucide-react";

const RATING_OPTIONS = [1, 2, 3, 4, 5];

const QUALITY_LABELS: Record<number, string> = {
  1: "1 - Top Tier / Premium",
  2: "2 - Superior Quality",
  3: "3 - Standard Grade",
  4: "4 - Basic Grade",
  5: "5 - Economy Grade",
};

const SAMPLE_PRODUCTS = [
  {
    category: "Office Chairs",
    name: "Ergonomic Pro Executive Chair",
    rating: "5",
    quality: "1",
    maxSize: "150",
    minSize: "25",
    user: "Alex Rivera",
    email: "alex.rivera@logistics.co",
    phone: "+1 (555) 234-5678",
  },
  {
    category: "Bookcases",
    name: "Oak Wood 5-Tier Bookshelf",
    rating: "4",
    quality: "2",
    maxSize: "80",
    minSize: "15",
    user: "Samantha Chen",
    email: "schen@inventory.org",
    phone: "+1 (555) 876-5432",
  },
  {
    category: "Storage Units",
    name: "Heavy-Duty Modular Steel Rack",
    rating: "5",
    quality: "1",
    maxSize: "300",
    minSize: "40",
    user: "Marcus Vance",
    email: "m.vance@supplynet.io",
    phone: "+1 (555) 345-6789",
  },
];

const EMPTY_FORM = {
  category: "",
  name: "",
  rating: "",
  quality: "",
  maxSize: "",
  minSize: "",
  user: "",
  email: "",
  phone: "",
};

export default function ProductsAdd() {
  const { addProduct } = useProducts();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string | null) =>
    setForm((f) => ({ ...f, [key]: value ?? "" }));

  const handleFillSample = () => {
    const randomSample = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
    setForm(randomSample);
    setError(null);
    toast.info("Sample product data auto-filled!", {
      description: "Review parameters and click Add Product to submit.",
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.category || !form.name.trim() || !form.rating || !form.quality) {
      setError("Product Category, Product Name, Product Rating, and Product Quality are required fields.");
      return;
    }
    const maxSize = Number(form.maxSize);
    const minSize = Number(form.minSize);
    if (!form.maxSize || !form.minSize || Number.isNaN(maxSize) || Number.isNaN(minSize)) {
      setError("Maximum and Minimum product quantities must be valid numbers.");
      return;
    }
    if (minSize > maxSize) {
      setError("Minimum products threshold cannot exceed maximum products capacity.");
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Please provide a valid user email address.");
      return;
    }

    const product = addProduct({
      category: form.category,
      name: form.name.trim(),
      rating: Number(form.rating),
      quality: Number(form.quality),
      maxSize,
      minSize,
      user: form.user.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });

    toast.success(`Product added successfully! (ID: ${product.id})`, {
      description: `${product.name} added to ${product.category}.`,
    });
    setForm(EMPTY_FORM);
    navigate("/apps/products/list");
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-10">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <ProductsPageHeader
          title="Add New Product"
          subtitle="Create a new product entry in the catalogue with capacity & manager details."
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleFillSample}
          className="h-10 px-4 font-semibold text-xs gap-2 border-primary/30 text-primary hover:bg-primary/10 self-start md:self-auto rounded-xl shadow-sm transition-all"
        >
          <Wand2 className="size-4 text-primary" /> Auto-Fill Sample Data
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Main Product Details Card */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/80 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                  <Package className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold tracking-tight">Catalogue Entry Specifications</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define product metadata, inventory limits, and contact information.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-full border">
                <CheckCircle2 className="size-3.5 text-emerald-500" /> Live Validation Active
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            {/* 3-Column Grid Matching Screenshot Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Row 1, Col 1: Product Category */}
              <Field label="Product Category" icon={Tag} required hint="Select item classification">
                <Select value={form.category} onValueChange={set("category")}>
                  <SelectTrigger className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 hover:border-primary/40 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] rounded-xl shadow-lg">
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-sm font-medium py-2.5">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Row 1, Col 2: Product Name */}
              <Field label="Product Name" icon={Package} required hint="Enter full descriptive item title">
                <Input
                  placeholder="name of the product"
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* Row 1, Col 3: Product Rating */}
              <Field label="Product Rating" icon={Star} required hint="Select score from 1 to 5">
                <Select value={form.rating} onValueChange={set("rating")}>
                  <SelectTrigger className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 hover:border-primary/40 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="1 - 5" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg">
                    {RATING_OPTIONS.map((r) => (
                      <SelectItem key={r} value={String(r)} className="text-sm font-medium py-2.5">
                        <span className="text-amber-500 font-bold mr-2">{"★".repeat(r)}</span> ({r} / 5 Rating)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Row 2, Col 1: Product Quality */}
              <Field label="Product Quality" icon={Award} required hint="Quality tier rating">
                <Select value={form.quality} onValueChange={set("quality")}>
                  <SelectTrigger className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 hover:border-primary/40 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="1 - 5" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg">
                    {RATING_OPTIONS.map((r) => (
                      <SelectItem key={r} value={String(r)} className="text-sm font-medium py-2.5">
                        {QUALITY_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Row 2, Col 2: Maximum Products */}
              <Field label="Maximum Products" icon={Layers} required hint="Maximum warehouse capacity limit">
                <Input
                  type="number"
                  min={1}
                  placeholder="maximum number of products"
                  value={form.maxSize}
                  onChange={(e) => set("maxSize")(e.target.value)}
                  className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* Row 2, Col 3: Minimum Products */}
              <Field label="Minimum Products" icon={Layers} required hint="Safety reorder threshold level">
                <Input
                  type="number"
                  min={1}
                  placeholder="minimum number of products"
                  value={form.minSize}
                  onChange={(e) => set("minSize")(e.target.value)}
                  className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* Row 3, Col 1: Product Added By */}
              <Field label="Product Added By" icon={User} hint="Manager or creator full name">
                <Input
                  placeholder="user name"
                  value={form.user}
                  onChange={(e) => set("user")(e.target.value)}
                  className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* Row 3, Col 2: User Email Address */}
              <Field label="User Email Address" icon={Mail} hint="Official work contact email">
                <Input
                  type="email"
                  placeholder="user email address"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                  className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* Row 3, Col 3: Phone Number */}
              <Field label="Phone Number" icon={Phone} hint="Manager phone number">
                <Input
                  placeholder="phone number"
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  className="h-12 text-sm font-medium bg-background/80 border-border/80 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Validation Error Alert */}
        {error && (
          <div className="flex items-center justify-between gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs md:text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="size-5 shrink-0 text-destructive" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="p-1 hover:bg-destructive/20 rounded-lg transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-muted-foreground font-medium">
            * Fields marked with red asterisk are required for catalogue indexing.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/apps/products/list")}
              className="h-12 px-6 font-semibold text-sm rounded-xl border-border hover:bg-accent transition-all w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-12 px-8 font-bold text-sm md:text-base gap-2 shadow-xl bg-foreground text-background hover:bg-foreground/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] w-full sm:w-auto"
            >
              <Plus className="size-5" /> Add Product
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  required,
  hint,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground flex items-center gap-2 tracking-wide">
          {Icon && <Icon className="size-4 text-primary" />}
          <span>{label}</span>
          {required && <span className="text-destructive font-bold text-sm">*</span>}
        </Label>
        {hint && <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

