"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { createStock, updateStock, deleteStock } from "@/lib/stock-actions";

interface StockData {
  id: string;
  name: string;
  commodityType: string;
  quantity: number;
  unit: string;
  avgCostPerKg: number;
  location: string | null;
}

interface Props {
  editStock?: StockData;
}

export function StockForm({ editStock }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!editStock;

  const [formData, setFormData] = useState({
    name: editStock?.name || "",
    commodityType: editStock?.commodityType || "TURMERIC_RAW",
    quantity: editStock?.quantity?.toString() || "0",
    unit: editStock?.unit || "KG",
    avgCostPerKg: editStock?.avgCostPerKg?.toString() || "0",
    location: editStock?.location || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (isEditMode && editStock) {
          await updateStock({
            id: editStock.id,
            name: formData.name,
            commodityType: formData.commodityType,
            unit: formData.unit,
            location: formData.location || undefined,
          });
        } else {
          await createStock({
            name: formData.name,
            commodityType: formData.commodityType,
            quantity: parseFloat(formData.quantity) || 0,
            unit: formData.unit,
            avgCostPerKg: parseFloat(formData.avgCostPerKg) || 0,
            location: formData.location || undefined,
          });
        }
        router.push("/stock");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save stock");
      }
    });
  };

  const handleDelete = async () => {
    if (!editStock) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this stock item? This action cannot be undone."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteStock(editStock.id);
      router.push("/stock");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stock");
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Stock Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Turmeric Finger Grade A"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commodityType">Commodity Type *</Label>
            <Select
              id="commodityType"
              value={formData.commodityType}
              onChange={(e) =>
                setFormData((p) => ({ ...p, commodityType: e.target.value }))
              }
              required
            >
              <option value="TURMERIC_RAW">Turmeric (Raw)</option>
              <option value="TURMERIC_POWDER">Turmeric (Powder)</option>
              <option value="MAIZE">Maize</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          {!isEditMode && (
            <>
              <div className="space-y-2">
                <Label htmlFor="quantity">Opening Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, quantity: e.target.value }))
                  }
                  min="0"
                  step="0.001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avgCostPerKg">Average Cost per KG (₹)</Label>
                <Input
                  id="avgCostPerKg"
                  type="number"
                  placeholder="0"
                  value={formData.avgCostPerKg}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, avgCostPerKg: e.target.value }))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Select
              id="unit"
              value={formData.unit}
              onChange={(e) =>
                setFormData((p) => ({ ...p, unit: e.target.value }))
              }
            >
              <option value="KG">KG (Kilograms)</option>
              <option value="QUINTAL">Quintal</option>
              <option value="TON">Ton</option>
              <option value="BAGS">Bags</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Godown 1, Processing Unit"
              value={formData.location}
              onChange={(e) =>
                setFormData((p) => ({ ...p, location: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/stock" className="flex-1">
              <Button variant="outline" className="w-full" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="warning"
              className="flex-1"
              disabled={isPending || isDeleting || !formData.name}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Saving..."}
                </>
              ) : isEditMode ? (
                "Update Stock"
              ) : (
                "Add Stock"
              )}
            </Button>
          </div>

          {isEditMode && (
            <div className="pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
                disabled={isPending || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Stock
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
