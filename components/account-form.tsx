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
import { createAccount, updateAccount, deleteAccount } from "@/lib/account-actions";
import type { AccountType } from "@/lib/types";

interface AccountData {
  id: string;
  name: string;
  type: AccountType;
  description: string | null;
  currentBalance: number;
}

interface Props {
  editAccount?: AccountData;
}

export function AccountForm({ editAccount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!editAccount;

  const [formData, setFormData] = useState({
    name: editAccount?.name || "",
    type: (editAccount?.type || "CASH") as AccountType,
    description: editAccount?.description || "",
    currentBalance: editAccount?.currentBalance?.toString() || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (isEditMode && editAccount) {
          await updateAccount({
            id: editAccount.id,
            name: formData.name,
            type: formData.type,
            description: formData.description || undefined,
          });
        } else {
          await createAccount({
            name: formData.name,
            type: formData.type,
            description: formData.description || undefined,
            currentBalance: formData.currentBalance
              ? parseFloat(formData.currentBalance)
              : 0,
          });
        }
        router.push("/accounts");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save account");
      }
    });
  };

  const handleDelete = async () => {
    if (!editAccount) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this account? This action cannot be undone."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteAccount(editAccount.id);
      router.push("/accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
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
            <Label htmlFor="name">Account Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Cash, HDFC Bank, Personal Loan"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Account Type *</Label>
            <Select
              id="type"
              value={formData.type}
              onChange={(e) =>
                setFormData((p) => ({ ...p, type: e.target.value as AccountType }))
              }
              required
            >
              <option value="CASH">Cash - Physical cash in hand</option>
              <option value="BANK">Bank - Bank account balance</option>
              <option value="LOAN_GIVEN">
                Loan Given - Money lent to others
              </option>
              <option value="LOAN_TAKEN">
                Loan Taken - Money borrowed from others
              </option>
            </Select>
          </div>

          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="balance">Opening Balance (₹)</Label>
              <Input
                id="balance"
                type="number"
                placeholder="0"
                value={formData.currentBalance}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, currentBalance: e.target.value }))
                }
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500">
                Enter the current balance in this account
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/accounts" className="flex-1">
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
                "Update Account"
              ) : (
                "Add Account"
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
                    Delete Account
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
