"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AppLayout } from "@/components/app-layout";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createParty } from "@/lib/party-actions";

export default function NewPartyPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    type: "CUSTOMER",
    phone: "",
    address: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        await createParty(formData);
        router.push("/parties");
      } catch (error) {
        console.error("Failed to create party:", error);
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/parties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Party</h1>
            <p className="text-gray-500 text-sm">
              Add a customer, vendor, or lender
            </p>
          </div>
        </div>

        <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, type: e.target.value }))
                }
                required
              >
                <option value="CUSTOMER">Customer (Seller) - Farmers who sell to you</option>
                <option value="VENDOR">Vendor (Buyer) - Companies who buy from you</option>
                <option value="LENDER">Lender - People you borrow from</option>
                <option value="BORROWER">Borrower - People who borrow from you</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210"
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
              <textarea
                id="notes"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                placeholder="Any additional notes..."
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
                disabled={isPending || !formData.name}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Party"
                )}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
