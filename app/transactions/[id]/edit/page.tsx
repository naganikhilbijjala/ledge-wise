import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { QuickEntryForm } from "@/components/quick-entry-form";
import {
  getAccountsForSelect,
  getPartiesForSelect,
  getCategoriesForSelect,
  getTransactionById,
} from "@/lib/transaction-actions";
import { getStocksForSelect } from "@/lib/stock-actions";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function EditTransactionContent({ id }: { id: string }) {
  const [accounts, parties, categories, stocks, transaction] = await Promise.all([
    getAccountsForSelect(),
    getPartiesForSelect(),
    getCategoriesForSelect(),
    getStocksForSelect(),
    getTransactionById(id),
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <QuickEntryForm
      accounts={accounts}
      parties={parties}
      categories={categories}
      stocks={stocks}
      editTransaction={transaction}
    />
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTransactionPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppLayout>
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href="/transactions">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Transaction</h1>
          <p className="text-gray-500 text-sm">Update transaction details</p>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <EditTransactionContent id={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
