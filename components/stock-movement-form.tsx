"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createStockMovement } from "@/lib/stock-movement-actions";
import { cn } from "@/lib/utils";

interface Stock {
  id: string;
  name: string;
}

interface Party {
  id: string;
  name: string;
  type: string;
}

interface Props {
  stocks: Stock[];
  parties: Party[];
}

export function StockMovementForm({ stocks, parties }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    stockId: stocks[0]?.id || "",
    type: "PURCHASE",
    adjustmentDirection: "ADD" as "ADD" | "REMOVE", // For adjustment type
    quantity: "",
    pricePerKg: "",
    partyId: "",
    description: "",
    vehicleNumber: "",
    bagsCount: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Price is optional for adjustments
    const priceRequired = formData.type !== "ADJUSTMENT";
    if (!formData.stockId || !formData.quantity || (priceRequired && !formData.pricePerKg)) {
      setError("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      try {
        // For adjustment, handle direction (negative quantity for removal)
        let quantity = parseFloat(formData.quantity);
        if (formData.type === "ADJUSTMENT" && formData.adjustmentDirection === "REMOVE") {
          quantity = -quantity;
        }

        await createStockMovement({
          stockId: formData.stockId,
          type: formData.type,
          quantity,
          pricePerKg: parseFloat(formData.pricePerKg) || 0,
          partyId: formData.partyId || undefined,
          description: formData.description || undefined,
          vehicleNumber: formData.vehicleNumber || undefined,
          bagsCount: formData.bagsCount ? parseInt(formData.bagsCount) : undefined,
        });
        router.push("/stock");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save movement");
      }
    });
  };

  const totalAmount =
    formData.quantity && formData.pricePerKg
      ? parseFloat(formData.quantity) * parseFloat(formData.pricePerKg)
      : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Movement Type Toggle */}
          <div className="space-y-2">
            <Label>Movement Type *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "PURCHASE" }))}
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.type === "PURCHASE"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Purchase (In)
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "SALE" }))}
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.type === "SALE"
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Sale (Out)
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "PROCESSING" }))}
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.type === "PROCESSING"
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Processing
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "ADJUSTMENT" }))}
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.type === "ADJUSTMENT"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Adjustment
              </button>
            </div>
            {/* Help text for movement type */}
            <p className="text-xs text-gray-500">
              {formData.type === "PURCHASE" && "Stock coming in from supplier/farmer"}
              {formData.type === "SALE" && "Stock going out to customer"}
              {formData.type === "PROCESSING" && "Stock used for processing (e.g., raw to powder)"}
              {formData.type === "ADJUSTMENT" && "Correct inventory for physical count, damage, or errors"}
            </p>
          </div>

          {/* Adjustment Direction - only show for ADJUSTMENT type */}
          {formData.type === "ADJUSTMENT" && (
            <div className="space-y-2">
              <Label>Adjustment Direction *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, adjustmentDirection: "ADD" }))}
                  className={cn(
                    "py-2 rounded-lg text-sm font-medium transition-colors",
                    formData.adjustmentDirection === "ADD"
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, adjustmentDirection: "REMOVE" }))}
                  className={cn(
                    "py-2 rounded-lg text-sm font-medium transition-colors",
                    formData.adjustmentDirection === "REMOVE"
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  - Remove Stock
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {formData.adjustmentDirection === "ADD"
                  ? "Found extra stock during physical count"
                  : "Stock lost due to damage, theft, or count correction"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stock">Stock Item *</Label>
            <Select
              id="stock"
              value={formData.stockId}
              onChange={(e) =>
                setFormData((p) => ({ ...p, stockId: e.target.value }))
              }
              required
            >
              <option value="">Select stock</option>
              {stocks.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (KG) *</Label>
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
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerKg">
                Price per KG (₹) {formData.type !== "ADJUSTMENT" ? "*" : "(Optional)"}
              </Label>
              <Input
                id="pricePerKg"
                type="number"
                placeholder="0"
                value={formData.pricePerKg}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, pricePerKg: e.target.value }))
                }
                min="0"
                step="0.01"
                required={formData.type !== "ADJUSTMENT"}
              />
            </div>
          </div>

          {totalAmount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                Total Amount: <span className="font-bold">₹{totalAmount.toLocaleString("en-IN")}</span>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="party">Party (Optional)</Label>
            <Select
              id="party"
              value={formData.partyId}
              onChange={(e) =>
                setFormData((p) => ({ ...p, partyId: e.target.value }))
              }
            >
              <option value="">No party</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name} ({party.type})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bagsCount">Bags Count</Label>
              <Input
                id="bagsCount"
                type="number"
                placeholder="0"
                value={formData.bagsCount}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, bagsCount: e.target.value }))
                }
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                placeholder="e.g., AP 12 AB 1234"
                value={formData.vehicleNumber}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, vehicleNumber: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Any additional notes"
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
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
              disabled={isPending || !formData.stockId || !formData.quantity || (formData.type !== "ADJUSTMENT" && !formData.pricePerKg)}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Movement"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
