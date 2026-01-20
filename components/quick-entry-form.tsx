"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createTransaction } from "@/lib/transaction-actions";
import { ArrowDownLeft, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Party {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  accounts: Account[];
  parties: Party[];
  categories: Category[];
}

export function QuickEntryForm({ accounts, parties, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    accountId: accounts[0]?.id || "",
    amount: "",
    type: "OUT" as "IN" | "OUT",
    partyId: "",
    description: "",
    category: "",
    ledgerType: "PARALLEL" as "OFFICIAL" | "PARALLEL",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountId || !formData.amount) {
      return;
    }

    startTransition(async () => {
      try {
        await createTransaction({
          accountId: formData.accountId,
          amount: parseFloat(formData.amount),
          type: formData.type,
          partyId: formData.partyId || undefined,
          description: formData.description || undefined,
          category: formData.category || undefined,
          ledgerType: formData.ledgerType,
        });

        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setFormData((prev) => ({
            ...prev,
            amount: "",
            description: "",
          }));
        }, 1500);
      } catch (error) {
        console.error("Failed to create transaction:", error);
      }
    });
  };

  if (success) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-800">
            Transaction Saved!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: "IN" }))}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                formData.type === "IN"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ArrowDownLeft size={20} />
              Money In
            </button>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: "OUT" }))}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                formData.type === "OUT"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ArrowUpRight size={20} />
              Money Out
            </button>
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account">Account *</Label>
            <Select
              id="account"
              value={formData.accountId}
              onChange={(e) =>
                setFormData((p) => ({ ...p, accountId: e.target.value }))
              }
              required
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData((p) => ({ ...p, amount: e.target.value }))
              }
              className="text-2xl font-bold h-14"
              min="0"
              step="0.01"
              required
              autoFocus
            />
          </div>

          {/* Party Selection */}
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

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Select
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData((p) => ({ ...p, category: e.target.value }))
              }
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Add a note..."
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          {/* Ledger Type Toggle */}
          <div className="space-y-2">
            <Label>Ledger Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({ ...p, ledgerType: "PARALLEL" }))
                }
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.ledgerType === "PARALLEL"
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Parallel (Private)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({ ...p, ledgerType: "OFFICIAL" }))
                }
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.ledgerType === "OFFICIAL"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Official (Tally)
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            variant={formData.type === "IN" ? "success" : "destructive"}
            disabled={isPending || !formData.accountId || !formData.amount}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save {formData.type === "IN" ? "Income" : "Expense"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
