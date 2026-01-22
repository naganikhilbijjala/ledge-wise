import Link from "next/link";
import { StockForm } from "@/components/stock-form";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewStockPage() {
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/stock">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Stock</h1>
            <p className="text-gray-500 text-sm">
              Add a new commodity to track
            </p>
          </div>
        </div>

        <StockForm />
      </div>
    </AppLayout>
  );
}
