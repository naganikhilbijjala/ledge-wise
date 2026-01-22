import Link from "next/link";
import { PartyForm } from "@/components/party-form";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewPartyPage() {
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

        <PartyForm />
      </div>
    </AppLayout>
  );
}
