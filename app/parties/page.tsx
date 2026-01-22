import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app-layout";
import { formatINR, toNumber, getAmountColor } from "@/lib/utils";
import { Users, Plus, ArrowRight } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

async function PartiesContent() {
  const userId = await requireAuth();

  const parties = await prisma.party.findMany({
    where: { userId, isActive: true, isDeleted: false },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  const partyTypeColors: Record<string, string> = {
    CUSTOMER: "bg-blue-100 text-blue-800",
    VENDOR: "bg-purple-100 text-purple-800",
    LENDER: "bg-amber-100 text-amber-800",
    BORROWER: "bg-green-100 text-green-800",
  };

  const partyTypeLabels: Record<string, string> = {
    CUSTOMER: "Seller",
    VENDOR: "Buyer",
    LENDER: "Lender",
    BORROWER: "Borrower",
  };

  // Group parties by type
  const customers = parties.filter((p) => p.type === "CUSTOMER");
  const vendors = parties.filter((p) => p.type === "VENDOR");
  const lenders = parties.filter((p) => p.type === "LENDER");
  const borrowers = parties.filter((p) => p.type === "BORROWER");

  const renderPartyList = (
    partyList: typeof parties,
    title: string,
    subtitle: string
  ) => {
    if (partyList.length === 0) return null;

    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="space-y-2">
          {partyList.map((party) => {
            const due = toNumber(party.totalDue);
            return (
              <Link key={party.id} href={`/parties/${party.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-gray-600">
                            {party.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {party.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={partyTypeColors[party.type]}
                              variant="secondary"
                            >
                              {partyTypeLabels[party.type]}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {party._count.transactions} transactions
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            {due >= 0 ? "They Owe" : "We Owe"}
                          </p>
                          <p
                            className={`font-semibold ${getAmountColor(due)}`}
                          >
                            {formatINR(Math.abs(due))}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderPartyList(
        customers,
        "Customers (Sellers)",
        "Farmers who sell turmeric/maize to you"
      )}
      {renderPartyList(
        vendors,
        "Vendors (Buyers)",
        "Companies like Priya who buy from you"
      )}
      {renderPartyList(lenders, "Lenders", "People you borrowed money from")}
      {renderPartyList(borrowers, "Borrowers", "People who borrowed from you")}

      {parties.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              No parties added yet. Add customers and vendors to start tracking.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PartiesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parties</h1>
            <p className="text-gray-500 text-sm">
              Manage customers, vendors, and track Udhaar
            </p>
          </div>
          <Link href="/parties/new">
            <Button variant="warning">
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
          </Link>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <PartiesContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}
