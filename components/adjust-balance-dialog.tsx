"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustAccountBalance } from "@/lib/account-actions";
import { adjustStockQuantity } from "@/lib/stock-actions";
import { adjustPartyBalance } from "@/lib/party-actions";
import { formatINR, getAmountColor } from "@/lib/utils";
import { Scale, X, Loader2, Check } from "lucide-react";

interface AdjustBalanceDialogProps {
  type: "account" | "stock" | "party";
  id: string;
  name: string;
  currentValue: number;
  unit?: string; // For stocks: "QUINTAL" or "KG"
  onClose: () => void;
}

export function AdjustBalanceDialog({
  type,
  id,
  name,
  currentValue,
  unit = "KG",
  onClose,
}: AdjustBalanceDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStock = type === "stock";
  const isParty = type === "party";
  const isQuintal = unit === "QUINTAL";
  const displayUnit = isQuintal ? "Quintals" : "KG";

  // For stocks, convert KG to display unit
  const displayValue = isStock && isQuintal ? currentValue / 100 : currentValue;

  const [newValue, setNewValue] = useState(displayValue.toString());
  const [reason, setReason] = useState("");

  const difference = parseFloat(newValue || "0") - displayValue;
  const hasDifference = difference !== 0 && !isNaN(difference);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue)) {
      setError("Please enter a valid number");
      return;
    }

    startTransition(async () => {
      try {
        if (isStock) {
          await adjustStockQuantity({
            stockId: id,
            newQuantity: parsedValue,
            reason: reason || undefined,
          });
        } else if (isParty) {
          await adjustPartyBalance({
            partyId: id,
            newBalance: parsedValue,
            reason: reason || undefined,
          });
        } else {
          await adjustAccountBalance({
            accountId: id,
            newBalance: parsedValue,
            reason: reason || undefined,
          });
        }
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to adjust");
      }
    });
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-800">
              {isStock ? "Stock" : isParty ? "Party Balance" : "Balance"} Adjusted!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Scale className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Adjust {isStock ? "Stock Quantity" : isParty ? "Party Balance" : "Balance"}
              </h2>
              <p className="text-sm text-gray-500">{name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Value */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              Current {isStock ? "Quantity" : isParty ? "Outstanding" : "Balance"}
            </p>
            {isParty ? (
              <div>
                <p className={`text-xl font-bold ${getAmountColor(displayValue)}`}>
                  {formatINR(Math.abs(displayValue))}
                </p>
                <p className="text-sm text-gray-500">
                  {displayValue >= 0 ? "They owe you" : "You owe them"}
                </p>
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-900">
                {isStock
                  ? `${displayValue.toFixed(2)} ${displayUnit}`
                  : formatINR(displayValue)}
              </p>
            )}
          </div>

          {/* Party Balance Direction Helper */}
          {isParty && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-medium">How to set the balance:</p>
              <ul className="mt-1 space-y-1 text-blue-700">
                <li>• Positive value = They owe you</li>
                <li>• Negative value = You owe them</li>
                <li>• Zero = No outstanding balance</li>
              </ul>
            </div>
          )}

          {/* New Value Input */}
          <div className="space-y-2">
            <Label htmlFor="newValue">
              New {isStock ? `Quantity (${displayUnit})` : isParty ? "Balance (₹)" : "Balance (₹)"}
            </Label>
            <Input
              id="newValue"
              type="number"
              step="0.01"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
            {isParty && (
              <p className="text-xs text-gray-500">
                Enter positive if they owe you, negative if you owe them
              </p>
            )}
          </div>

          {/* Difference Preview */}
          {hasDifference && (
            <div
              className={`p-3 rounded-lg ${
                difference > 0
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p className="text-sm text-gray-600">Adjustment</p>
              <p
                className={`text-lg font-bold ${
                  difference > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {difference > 0 ? "+" : ""}
                {isStock
                  ? `${difference.toFixed(2)} ${displayUnit}`
                  : formatINR(difference)}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Physical count correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="warning"
              className="flex-1"
              disabled={isPending || !hasDifference}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adjusting...
                </>
              ) : (
                "Adjust"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
