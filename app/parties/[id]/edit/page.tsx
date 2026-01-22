import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PartyForm } from "@/components/party-form";
import { getPartyById } from "@/lib/party-actions";
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

async function EditPartyContent({ id }: { id: string }) {
  const party = await getPartyById(id);

  if (!party) {
    notFound();
  }

  return <PartyForm editParty={party} />;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPartyPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/parties/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Party</h1>
            <p className="text-gray-500 text-sm">Update party details</p>
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <EditPartyContent id={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
