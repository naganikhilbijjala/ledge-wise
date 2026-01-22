import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { getAccountById } from "@/lib/account-actions";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}

async function EditAccountContent({ id }: { id: string }) {
  const account = await getAccountById(id);

  if (!account) {
    notFound();
  }

  return <AccountForm editAccount={account} />;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/accounts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Account</h1>
            <p className="text-gray-500 text-sm">Update account details</p>
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <EditAccountContent id={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
