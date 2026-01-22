import { Suspense } from "react";
import Link from "next/link";
import { StockMovementForm } from "@/components/stock-movement-form";
import { getStocksForSelect } from "@/lib/stock-actions";
import { getPartiesForSelect } from "@/lib/transaction-actions";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}

async function StockMovementContent() {
  const [stocks, parties] = await Promise.all([
    getStocksForSelect(),
    getPartiesForSelect(),
  ]);

  if (stocks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No stock items found. Add a stock item first.</p>
        <Link href="/stock/new">
          <Button variant="warning">Add Stock Item</Button>
        </Link>
      </div>
    );
  }

  return <StockMovementForm stocks={stocks} parties={parties} />;
}

export default function AddStockMovementPage() {
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
            <h1 className="text-2xl font-bold text-gray-900">Add Stock Movement</h1>
            <p className="text-gray-500 text-sm">
              Record a purchase, sale, or adjustment
            </p>
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <StockMovementContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}
