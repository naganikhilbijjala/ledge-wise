import { Suspense } from "react";
import { QuickEntryForm } from "@/components/quick-entry-form";
import {
  getAccountsForSelect,
  getPartiesForSelect,
  getCategoriesForSelect,
} from "@/lib/transaction-actions";
import { AppLayout } from "@/components/app-layout";

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

async function QuickEntryContent() {
  const [accounts, parties, categories] = await Promise.all([
    getAccountsForSelect(),
    getPartiesForSelect(),
    getCategoriesForSelect(),
  ]);

  return (
    <QuickEntryForm
      accounts={accounts}
      parties={parties}
      categories={categories}
    />
  );
}

export default function QuickEntryPage() {
  return (
    <AppLayout>
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quick Entry</h1>
          <p className="text-gray-500 text-sm">Log a transaction in seconds</p>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <QuickEntryContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}
