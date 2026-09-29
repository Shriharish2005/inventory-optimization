import { useState, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertAction } from "@/components/ui/alert";
import { ProductsPageHeader } from "@/components/products/page-header";
import { useProducts } from "@/context/products/ProductsContext";
import { CheckCircle2, Trash2, X, XCircle } from "lucide-react";

export default function ProductsRemove() {
  const { removeProduct, getProduct } = useProducts();
  const [id, setId] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) return;

    const existing = getProduct(trimmed);
    const removed = removeProduct(trimmed);
    if (removed) {
      setMessage({ kind: "success", text: `Product deleted successfully! ${existing ? `(${existing.name})` : ""}` });
      setId("");
    } else {
      setMessage({ kind: "error", text: `No product found with ID "${trimmed}".` });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProductsPageHeader title="Remove Product" subtitle="Delete a product from the catalogue by its ID." />

      <Card className="max-w-3xl">
        <CardContent className="pt-6 flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="Enter product ID, e.g. PD5678"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                if (message) setMessage(null);
              }}
              className="rounded-full font-mono"
            />
            <Button type="submit" variant="destructive">
              <Trash2 className="h-4 w-4" /> Delete Product
            </Button>
          </form>

          {message && (
            <Alert
              className={
                message.kind === "success"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }
            >
              {message.kind === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>{message.text}</AlertTitle>
              <AlertAction>
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className="opacity-70 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </AlertAction>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
