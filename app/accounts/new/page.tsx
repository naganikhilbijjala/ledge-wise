"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createAccount } from "@/lib/account-actions";

export default function NewAccountPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    type: "CASH",
    description: "",
    currentBalance: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        await createAccount({
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          currentBalance: formData.currentBalance
            ? parseFloat(formData.currentBalance)
            : 0,
        });
        router.push("/accounts");
      } catch (error) {
        console.error("Failed to create account:", error);
      }
    });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/accounts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Account</h1>
          <p className="text-gray-500 text-sm">
            Add a cash box, bank account, or loan
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  setFormData((p) => ({ ...p, type: e.target.value }))
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
                disabled={isPending || !formData.name}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Account"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
