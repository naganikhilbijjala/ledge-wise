import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StockForm } from "@/components/stock-form";
import { getStockById } from "@/lib/stock-actions";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}

async function EditStockContent({ id }: { id: string }) {
  const stock = await getStockById(id);

  if (!stock) {
    notFound();
  }

  return <StockForm editStock={stock} />;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStockPage({ params }: PageProps) {
  const { id } = await params;

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
            <h1 className="text-2xl font-bold text-gray-900">Edit Stock</h1>
            <p className="text-gray-500 text-sm">Update stock details</p>
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <EditStockContent id={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
