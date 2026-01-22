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
import { createParty, updateParty, deleteParty } from "@/lib/party-actions";
import type { PartyType } from "@/lib/types";

interface PartyData {
  id: string;
  name: string;
  type: PartyType;
  phone: string | null;
  address: string | null;
  notes: string | null;
  totalDue: number;
}

interface Props {
  editParty?: PartyData;
}

export function PartyForm({ editParty }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!editParty;

  const [formData, setFormData] = useState({
    name: editParty?.name || "",
    type: editParty?.type || "CUSTOMER",
    phone: editParty?.phone || "",
    address: editParty?.address || "",
    notes: editParty?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (isEditMode && editParty) {
          await updateParty({
            id: editParty.id,
            name: formData.name,
            type: formData.type,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            notes: formData.notes || undefined,
          });
        } else {
          await createParty({
            name: formData.name,
            type: formData.type,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            notes: formData.notes || undefined,
          });
        }
        router.push("/parties");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save party");
      }
    });
  };

  const handleDelete = async () => {
    if (!editParty) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this party? This action cannot be undone."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteParty(editParty.id);
      router.push("/parties");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete party");
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
            <Label htmlFor="name">Party Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Ramesh Kumar, Priya Foods"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Party Type *</Label>
            <Select
              id="type"
              value={formData.type}
              onChange={(e) =>
                setFormData((p) => ({ ...p, type: e.target.value }))
              }
              required
            >
              <option value="CUSTOMER">Customer (Seller) - Sells goods to you</option>
              <option value="VENDOR">Vendor (Buyer) - Buys goods from you</option>
              <option value="LENDER">Lender - You borrowed money from them</option>
              <option value="BORROWER">Borrower - They borrowed money from you</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g., 9876543210"
              value={formData.phone}
              onChange={(e) =>
                setFormData((p) => ({ ...p, phone: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Village, District"
              value={formData.address}
              onChange={(e) =>
                setFormData((p) => ({ ...p, address: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Any additional notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/parties" className="flex-1">
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
                "Update Party"
              ) : (
                "Add Party"
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
                    Delete Party
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
